#!/usr/bin/env npx tsx

/**
 * Automated Plan Executor
 *
 * Runs a worker/review loop on a plan file using the Codex SDK.
 * - Worker model implements TODOs one at a time
 * - Reviewer model reviews each completed TODO
 * - Uses session resumption within a TODO for fix/re-review cycles
 * - Loop continues until all TODOs are done or blocked
 */

import { Codex, Thread } from "@openai/codex-sdk";
import * as fs from "node:fs";
import * as path from "node:path";

// Configuration
interface Config {
  workerModel: string;
  reviewerModel: string;
  maxIterationsPerTodo: number;
  planPath: string;
}

const DEFAULT_CONFIG: Partial<Config> = {
  workerModel: "o3",
  reviewerModel: "o3",
  maxIterationsPerTodo: 5,
};

// Prompt paths
const PROMPTS = {
  worker: "./commands/worker.md",
  resume: "./commands/resume.md",
  review: "./commands/review.md",
  resumeReview: "./commands/resume-review.md",
};

function loadPrompt(promptPath: string, planPath: string): string {
  const fullPath = path.resolve(promptPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Prompt file not found: ${fullPath}`);
  }
  const template = fs.readFileSync(fullPath, "utf-8");
  return template.replace("$ARGUMENTS", planPath);
}

interface TodoItem {
  text: string;
  done: boolean;
  blocked: boolean;
  hasReviewFeedback: boolean;
}

interface PlanState {
  todos: TodoItem[];
  allDone: boolean;
  hasBlocked: boolean;
  nextTodoIndex: number;
}

function parsePlan(planPath: string): PlanState {
  if (!fs.existsSync(planPath)) {
    throw new Error(`Plan file not found: ${planPath}`);
  }

  const content = fs.readFileSync(planPath, "utf-8");
  const lines = content.split("\n");

  const todos: TodoItem[] = [];
  let inTodoSection = false;
  let currentTodo: TodoItem | null = null;

  for (const line of lines) {
    if (line.startsWith("## TODO")) {
      inTodoSection = true;
      continue;
    }
    if (inTodoSection && line.startsWith("## ")) {
      if (currentTodo) todos.push(currentTodo);
      break;
    }
    if (inTodoSection) {
      const doneMatch = line.match(/^- \[x\] (.+)/i);
      const todoMatch = line.match(/^- \[ \] (.+)/);
      const blockedMatch = line.match(/^- \[B\] (.+)/i);

      if (doneMatch || todoMatch || blockedMatch) {
        if (currentTodo) todos.push(currentTodo);

        if (doneMatch) {
          currentTodo = {
            text: doneMatch[1],
            done: true,
            blocked: false,
            hasReviewFeedback: false,
          };
        } else if (todoMatch) {
          currentTodo = {
            text: todoMatch[1],
            done: false,
            blocked: false,
            hasReviewFeedback: false,
          };
        } else if (blockedMatch) {
          currentTodo = {
            text: blockedMatch[1],
            done: false,
            blocked: true,
            hasReviewFeedback: false,
          };
        }
      } else if (currentTodo && line.includes("review: status=request_changes")) {
        currentTodo.hasReviewFeedback = true;
      }
    }
  }

  if (currentTodo) todos.push(currentTodo);

  const allDone = todos.length > 0 && todos.every((t) => t.done);
  const hasBlocked = todos.some((t) => t.blocked);

  // Find next unchecked, non-blocked TODO
  let nextTodoIndex = -1;
  for (let i = 0; i < todos.length; i++) {
    if (!todos[i].done && !todos[i].blocked) {
      nextTodoIndex = i;
      break;
    }
  }

  return { todos, allDone, hasBlocked, nextTodoIndex };
}

async function runThread(
  thread: Thread,
  prompt: string,
  role: string
): Promise<string> {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`🤖 ${role}`);
  console.log(`${"─".repeat(60)}\n`);

  let output = "";

  for await (const event of thread.runStreamed(prompt)) {
    if (event.type === "message") {
      const content = event.message?.content;
      if (typeof content === "string") {
        process.stdout.write(content);
        output += content;
      } else if (Array.isArray(content)) {
        for (const part of content) {
          if (part.type === "text") {
            process.stdout.write(part.text);
            output += part.text;
          }
        }
      }
    }
  }

  console.log("\n");
  return output;
}

async function processTodo(
  workerCodex: Codex,
  reviewerCodex: Codex,
  config: Config,
  todoIndex: number,
  todoText: string,
  hasExistingFeedback: boolean
): Promise<"approved" | "blocked" | "max_iterations"> {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`📌 TODO #${todoIndex + 1}: ${todoText}`);
  console.log(`${"═".repeat(60)}`);

  // Start fresh sessions for this TODO
  let workerThread = workerCodex.startThread({ model: config.workerModel });
  let reviewerThread = reviewerCodex.startThread({ model: config.reviewerModel });

  let iteration = 0;
  let isFirstWorkerRun = true;
  let isFirstReviewRun = true;

  while (iteration < config.maxIterationsPerTodo) {
    iteration++;
    console.log(`\n>>> Iteration ${iteration}/${config.maxIterationsPerTodo}`);

    // Get current state
    const stateBefore = parsePlan(config.planPath);

    // Check if blocked
    if (stateBefore.hasBlocked) {
      return "blocked";
    }

    // Determine which worker prompt to use
    const currentTodo = stateBefore.todos[todoIndex];
    const needsResume = !isFirstWorkerRun || (hasExistingFeedback && isFirstWorkerRun);

    if (!currentTodo.done) {
      // Run worker
      const workerPrompt = needsResume
        ? loadPrompt(PROMPTS.resume, config.planPath)
        : loadPrompt(PROMPTS.worker, config.planPath);

      const workerRole = needsResume
        ? `Worker: Resume Session (fixing review feedback)`
        : `Worker: New Session (implementing TODO)`;

      await runThread(workerThread, workerPrompt, workerRole);
      isFirstWorkerRun = false;

      // Check result
      const afterWorker = parsePlan(config.planPath);

      if (afterWorker.hasBlocked) {
        console.log("\n⚠️  Worker blocked. Stopping.");
        return "blocked";
      }

      if (!afterWorker.todos[todoIndex]?.done) {
        console.log("\n⚠️  Worker did not complete TODO. Stopping.");
        return "blocked";
      }
    }

    // Run reviewer
    const reviewPrompt = isFirstReviewRun
      ? loadPrompt(PROMPTS.review, config.planPath)
      : loadPrompt(PROMPTS.resumeReview, config.planPath);

    const reviewRole = isFirstReviewRun
      ? `Reviewer: New Session (initial review)`
      : `Reviewer: Resume Session (re-reviewing after fixes)`;

    await runThread(reviewerThread, reviewPrompt, reviewRole);
    isFirstReviewRun = false;

    // Check review result
    const afterReview = parsePlan(config.planPath);

    if (afterReview.todos[todoIndex]?.done) {
      console.log("\n✅ TODO approved by reviewer!");
      return "approved";
    }

    // Reviewer requested changes - loop continues
    console.log("\n🔄 Reviewer requested changes. Continuing...");
  }

  console.log(`\n⚠️  Max iterations (${config.maxIterationsPerTodo}) reached for this TODO.`);
  return "max_iterations";
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: npx tsx run-plan.ts <plan-path> [options]");
    console.error("");
    console.error("Options:");
    console.error("  --worker-model <model>         Model for worker (default: o3)");
    console.error("  --reviewer-model <model>       Model for reviewer (default: o3)");
    console.error("  --max-iterations-per-todo <n>  Max fix/review cycles per TODO (default: 5)");
    process.exit(1);
  }

  // Parse arguments
  const config: Config = {
    ...DEFAULT_CONFIG,
    planPath: args[0],
  } as Config;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--worker-model" && args[i + 1]) {
      config.workerModel = args[++i];
    } else if (args[i] === "--reviewer-model" && args[i + 1]) {
      config.reviewerModel = args[++i];
    } else if (args[i] === "--max-iterations-per-todo" && args[i + 1]) {
      config.maxIterationsPerTodo = parseInt(args[++i], 10);
    }
  }

  // Resolve plan path
  if (!config.planPath.includes("/") && !config.planPath.endsWith(".md")) {
    config.planPath = `.plans/${config.planPath}.md`;
  }
  config.planPath = path.resolve(config.planPath);

  console.log("📋 Plan Executor");
  console.log(`   Plan: ${config.planPath}`);
  console.log(`   Worker Model: ${config.workerModel}`);
  console.log(`   Reviewer Model: ${config.reviewerModel}`);
  console.log(`   Max Iterations Per TODO: ${config.maxIterationsPerTodo}`);
  console.log("");

  // Validate plan exists
  const initialState = parsePlan(config.planPath);
  console.log(`📝 Found ${initialState.todos.length} TODOs`);
  console.log(
    `   ✓ Done: ${initialState.todos.filter((t) => t.done).length}`
  );
  console.log(
    `   ○ Pending: ${initialState.todos.filter((t) => !t.done && !t.blocked).length}`
  );
  console.log(
    `   ⊘ Blocked: ${initialState.todos.filter((t) => t.blocked).length}`
  );

  if (initialState.allDone) {
    console.log("\n✅ All TODOs are already complete!");
    process.exit(0);
  }

  if (initialState.hasBlocked) {
    console.log("\n⚠️  Plan has blocked TODOs. Resolve them first.");
    process.exit(1);
  }

  // Initialize Codex clients
  const workerCodex = new Codex();
  const reviewerCodex = new Codex();

  // Process TODOs
  let todoIndex = initialState.nextTodoIndex;

  while (todoIndex !== -1) {
    const state = parsePlan(config.planPath);
    const todo = state.todos[todoIndex];

    const result = await processTodo(
      workerCodex,
      reviewerCodex,
      config,
      todoIndex,
      todo.text,
      todo.hasReviewFeedback
    );

    if (result === "blocked") {
      console.log("\n🛑 Execution stopped: TODO blocked.");
      break;
    }

    if (result === "max_iterations") {
      console.log("\n🛑 Execution stopped: Max iterations reached on a TODO.");
      break;
    }

    // Find next TODO
    const nextState = parsePlan(config.planPath);
    todoIndex = nextState.nextTodoIndex;

    if (nextState.allDone) {
      break;
    }
  }

  // Final status
  const finalState = parsePlan(config.planPath);
  console.log("\n" + "═".repeat(60));
  console.log("📊 Final Status");
  console.log("═".repeat(60));
  console.log(`   Total TODOs: ${finalState.todos.length}`);
  console.log(`   ✓ Completed: ${finalState.todos.filter((t) => t.done).length}`);
  console.log(`   ○ Pending: ${finalState.todos.filter((t) => !t.done && !t.blocked).length}`);
  console.log(`   ⊘ Blocked: ${finalState.todos.filter((t) => t.blocked).length}`);

  if (finalState.allDone) {
    console.log("\n🎉 All TODOs complete!");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
