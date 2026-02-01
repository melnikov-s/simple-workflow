#!/usr/bin/env npx tsx

/**
 * Automated Plan Executor using OpenCode SDK + Effect.ts
 *
 * Runs a worker/review loop on a plan file using OpenCode.
 * - Worker agent implements TODOs one at a time
 * - Reviewer agent reviews each completed TODO
 * - Uses session resumption within a TODO for fix/re-review cycles
 */

import { createOpencode, type Session } from "@opencode-ai/sdk";
import { Effect, Console, Option, Data, Match, pipe } from "effect";
import * as fs from "node:fs";
import * as path from "node:path";

// ============================================================================
// Error Types
// ============================================================================

class PlanNotFoundError extends Data.TaggedError("PlanNotFoundError")<{
  readonly path: string;
}> {}

class PromptNotFoundError extends Data.TaggedError("PromptNotFoundError")<{
  readonly path: string;
}> {}

class OpenCodeError extends Data.TaggedError("OpenCodeError")<{
  readonly message: string;
}> {}

// ============================================================================
// Domain Types
// ============================================================================

interface Config {
  readonly workerModel: string;
  readonly reviewerModel: string;
  readonly maxIterationsPerTodo: number;
  readonly planPath: string;
}

interface TodoItem {
  readonly text: string;
  readonly done: boolean;
  readonly blocked: boolean;
  readonly hasReviewFeedback: boolean;
}

interface PlanState {
  readonly todos: readonly TodoItem[];
  readonly allDone: boolean;
  readonly hasBlocked: boolean;
  readonly nextTodoIndex: Option.Option<number>;
}

type TodoResult = "approved" | "blocked" | "max_iterations";

type OpenCodeInstance = Awaited<ReturnType<typeof createOpencode>>;

// ============================================================================
// Prompt Paths
// ============================================================================

const PROMPTS = {
  worker: "./commands/worker.md",
  resume: "./commands/resume.md",
  review: "./commands/review.md",
  resumeReview: "./commands/resume-review.md",
} as const;

// ============================================================================
// Pure Functions
// ============================================================================

const parseArgs = (args: readonly string[]): Config => {
  let workerModel = "anthropic/claude-sonnet-4-20250514";
  let reviewerModel = "anthropic/claude-sonnet-4-20250514";
  let maxIterationsPerTodo = 5;
  let planPath = args[0] ?? "";

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--worker-model" && args[i + 1]) {
      workerModel = args[++i];
    } else if (args[i] === "--reviewer-model" && args[i + 1]) {
      reviewerModel = args[++i];
    } else if (args[i] === "--max-iterations-per-todo" && args[i + 1]) {
      maxIterationsPerTodo = parseInt(args[++i], 10);
    }
  }

  // Resolve plan path
  if (!planPath.includes("/") && !planPath.endsWith(".md")) {
    planPath = `.plans/${planPath}.md`;
  }
  planPath = path.resolve(planPath);

  return { workerModel, reviewerModel, maxIterationsPerTodo, planPath };
};

const parsePlanContent = (content: string): PlanState => {
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
      } else if (
        currentTodo !== null &&
        line.includes("review: status=request_changes")
      ) {
        currentTodo = {
          text: currentTodo.text,
          done: currentTodo.done,
          blocked: currentTodo.blocked,
          hasReviewFeedback: true,
        };
      }
    }
  }

  if (currentTodo) todos.push(currentTodo);

  const allDone = todos.length > 0 && todos.every((t) => t.done);
  const hasBlocked = todos.some((t) => t.blocked);

  let nextTodoIndex: Option.Option<number> = Option.none();
  for (let i = 0; i < todos.length; i++) {
    if (!todos[i].done && !todos[i].blocked) {
      nextTodoIndex = Option.some(i);
      break;
    }
  }

  return { todos, allDone, hasBlocked, nextTodoIndex };
};

// ============================================================================
// Effectful Operations
// ============================================================================

const readFile = (filePath: string) =>
  Effect.try({
    try: () => fs.readFileSync(filePath, "utf-8"),
    catch: () => new PlanNotFoundError({ path: filePath }),
  });

const loadPrompt = (promptPath: string, planPath: string) =>
  pipe(
    Effect.try({
      try: () => fs.readFileSync(path.resolve(promptPath), "utf-8"),
      catch: () => new PromptNotFoundError({ path: promptPath }),
    }),
    Effect.map((template) => template.replace("$ARGUMENTS", planPath))
  );

const parsePlan = (planPath: string) =>
  pipe(
    readFile(planPath),
    Effect.map(parsePlanContent),
    Effect.mapError(() => new PlanNotFoundError({ path: planPath }))
  );

const logHeader = (char: string, message: string) =>
  Console.log(`\n${char.repeat(60)}\n${message}\n${char.repeat(60)}`);

const logStatus = (state: PlanState) =>
  Effect.all([
    Console.log(`📝 Found ${state.todos.length} TODOs`),
    Console.log(`   ✓ Done: ${state.todos.filter((t) => t.done).length}`),
    Console.log(
      `   ○ Pending: ${state.todos.filter((t) => !t.done && !t.blocked).length}`
    ),
    Console.log(
      `   ⊘ Blocked: ${state.todos.filter((t) => t.blocked).length}`
    ),
  ]);

// ============================================================================
// OpenCode Session Management
// ============================================================================

const createSession = (
  instance: OpenCodeInstance
): Effect.Effect<Session, OpenCodeError> =>
  Effect.tryPromise({
    try: async () => {
      const result = await instance.client.session.create();
      if (result.error) {
        throw new Error(`Session create failed: ${JSON.stringify(result.error)}`);
      }
      return result.data!;
    },
    catch: (e) =>
      new OpenCodeError({ message: `Failed to create session: ${e}` }),
  });

const sendPrompt = (
  instance: OpenCodeInstance,
  sessionId: string,
  prompt: string,
  role: string
): Effect.Effect<void, OpenCodeError> =>
  Effect.gen(function* () {
    yield* Console.log(`\n${"─".repeat(60)}`);
    yield* Console.log(`🤖 ${role}`);
    yield* Console.log(`${"─".repeat(60)}\n`);

    const result = yield* Effect.tryPromise({
      try: async () => {
        const response = await instance.client.session.prompt({
          path: { id: sessionId },
          body: {
            parts: [{ type: "text", text: prompt }],
          },
        });
        return response;
      },
      catch: (e) =>
        new OpenCodeError({ message: `Failed to send prompt: ${e}` }),
    });

    // Extract and display text content from response parts
    if (result.data && "parts" in result.data && Array.isArray(result.data.parts)) {
      for (const part of result.data.parts) {
        if (part.type === "text" && "text" in part) {
          process.stdout.write(String(part.text));
        }
      }
    }

    yield* Console.log("\n");
  });

// ============================================================================
// Todo Processor
// ============================================================================

const processTodo = (
  instance: OpenCodeInstance,
  config: Config,
  todoIndex: number,
  todoText: string,
  hasExistingFeedback: boolean
): Effect.Effect<
  TodoResult,
  PlanNotFoundError | PromptNotFoundError | OpenCodeError
> =>
  Effect.gen(function* () {
    yield* logHeader("═", `📌 TODO #${todoIndex + 1}: ${todoText}`);

    // Create fresh sessions for this TODO
    const workerSession = yield* createSession(instance);
    const reviewerSession = yield* createSession(instance);

    const workerSessionId = workerSession.id;
    const reviewerSessionId = reviewerSession.id;

    let isFirstWorkerRun = true;
    let isFirstReviewRun = true;

    for (
      let iteration = 1;
      iteration <= config.maxIterationsPerTodo;
      iteration++
    ) {
      yield* Console.log(
        `\n>>> Iteration ${iteration}/${config.maxIterationsPerTodo}`
      );

      const stateBefore = yield* parsePlan(config.planPath);

      // Check if blocked
      if (stateBefore.hasBlocked) {
        return "blocked" as TodoResult;
      }

      const currentTodo = stateBefore.todos[todoIndex];
      const needsResume =
        !isFirstWorkerRun || (hasExistingFeedback && isFirstWorkerRun);

      // Run worker if TODO not done
      if (!currentTodo?.done) {
        const workerPromptPath = needsResume ? PROMPTS.resume : PROMPTS.worker;
        const workerPrompt = yield* loadPrompt(
          workerPromptPath,
          config.planPath
        );

        const workerRole = needsResume
          ? `Worker: Resume Session (fixing review feedback)`
          : `Worker: New Session (implementing TODO)`;

        yield* sendPrompt(instance, workerSessionId, workerPrompt, workerRole);
        isFirstWorkerRun = false;

        // Check worker result
        const afterWorker = yield* parsePlan(config.planPath);

        if (afterWorker.hasBlocked) {
          yield* Console.log("\n⚠️  Worker blocked. Stopping.");
          return "blocked" as TodoResult;
        }

        if (!afterWorker.todos[todoIndex]?.done) {
          yield* Console.log("\n⚠️  Worker did not complete TODO. Stopping.");
          return "blocked" as TodoResult;
        }
      }

      // Run reviewer
      const reviewPromptPath = isFirstReviewRun
        ? PROMPTS.review
        : PROMPTS.resumeReview;
      const reviewPrompt = yield* loadPrompt(reviewPromptPath, config.planPath);

      const reviewRole = isFirstReviewRun
        ? `Reviewer: New Session (initial review)`
        : `Reviewer: Resume Session (re-reviewing after fixes)`;

      yield* sendPrompt(
        instance,
        reviewerSessionId,
        reviewPrompt,
        reviewRole
      );
      isFirstReviewRun = false;

      // Check review result
      const afterReview = yield* parsePlan(config.planPath);

      if (afterReview.todos[todoIndex]?.done) {
        yield* Console.log("\n✅ TODO approved by reviewer!");
        return "approved" as TodoResult;
      }

      yield* Console.log("\n🔄 Reviewer requested changes. Continuing...");
    }

    yield* Console.log(
      `\n⚠️  Max iterations (${config.maxIterationsPerTodo}) reached for this TODO.`
    );
    return "max_iterations" as TodoResult;
  });

// ============================================================================
// Main Program
// ============================================================================

const program: Effect.Effect<
  void,
  PlanNotFoundError | PromptNotFoundError | OpenCodeError
> = Effect.gen(function* () {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    yield* Console.log("Usage: npx tsx run-plan.ts <plan-path> [options]");
    yield* Console.log("");
    yield* Console.log("Options:");
    yield* Console.log(
      "  --worker-model <model>         Model for worker (default: anthropic/claude-sonnet-4-20250514)"
    );
    yield* Console.log(
      "  --reviewer-model <model>       Model for reviewer (default: anthropic/claude-sonnet-4-20250514)"
    );
    yield* Console.log(
      "  --max-iterations-per-todo <n>  Max fix/review cycles (default: 5)"
    );
    return;
  }

  const config = parseArgs(args);

  yield* Console.log("📋 Plan Executor (OpenCode SDK)");
  yield* Console.log(`   Plan: ${config.planPath}`);
  yield* Console.log(`   Worker Model: ${config.workerModel}`);
  yield* Console.log(`   Reviewer Model: ${config.reviewerModel}`);
  yield* Console.log(
    `   Max Iterations Per TODO: ${config.maxIterationsPerTodo}`
  );
  yield* Console.log("");

  const initialState = yield* parsePlan(config.planPath);
  yield* logStatus(initialState);

  if (initialState.allDone) {
    yield* Console.log("\n✅ All TODOs are already complete!");
    return;
  }

  if (initialState.hasBlocked) {
    yield* Console.log("\n⚠️  Plan has blocked TODOs. Resolve them first.");
    return;
  }

  // Initialize OpenCode
  yield* Console.log("\n🚀 Starting OpenCode server...");
  const instance = yield* Effect.tryPromise({
    try: () => createOpencode(),
    catch: (e) =>
      new OpenCodeError({ message: `Failed to start OpenCode: ${e}` }),
  });

  yield* Console.log("✓ OpenCode ready\n");

  // Process TODOs
  let currentIndex = initialState.nextTodoIndex;

  while (Option.isSome(currentIndex)) {
    const todoIndex = currentIndex.value;
    const state = yield* parsePlan(config.planPath);
    const todo = state.todos[todoIndex];

    const result = yield* processTodo(
      instance,
      config,
      todoIndex,
      todo.text,
      todo.hasReviewFeedback
    );

    if (result === "blocked") {
      yield* Console.log("\n🛑 Execution stopped: TODO blocked.");
      break;
    }

    if (result === "max_iterations") {
      yield* Console.log("\n🛑 Execution stopped: Max iterations reached.");
      break;
    }

    const nextState = yield* parsePlan(config.planPath);

    if (nextState.allDone) {
      break;
    }

    currentIndex = nextState.nextTodoIndex;
  }

  // Final status
  const finalState = yield* parsePlan(config.planPath);
  yield* logHeader("═", "📊 Final Status");
  yield* Console.log(`   Total TODOs: ${finalState.todos.length}`);
  yield* Console.log(
    `   ✓ Completed: ${finalState.todos.filter((t) => t.done).length}`
  );
  yield* Console.log(
    `   ○ Pending: ${finalState.todos.filter((t) => !t.done && !t.blocked).length}`
  );
  yield* Console.log(
    `   ⊘ Blocked: ${finalState.todos.filter((t) => t.blocked).length}`
  );

  if (finalState.allDone) {
    yield* Console.log("\n🎉 All TODOs complete!");
  }
});

// ============================================================================
// Run
// ============================================================================

Effect.runPromise(
  pipe(
    program,
    Effect.catchAll((error) =>
      Match.value(error).pipe(
        Match.tag("PlanNotFoundError", (e) =>
          Console.error(`❌ Plan not found: ${e.path}`)
        ),
        Match.tag("PromptNotFoundError", (e) =>
          Console.error(`❌ Prompt not found: ${e.path}`)
        ),
        Match.tag("OpenCodeError", (e) =>
          Console.error(`❌ OpenCode error: ${e.message}`)
        ),
        Match.exhaustive
      )
    )
  )
).catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
