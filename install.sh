#!/usr/bin/env bash
set -o pipefail

# Install workflow commands to all supported AI coding agents
#
# Creates symlinks so edits to source files apply everywhere automatically.
#
# Supported agents:
#   - Claude Code:   ~/.claude/commands/
#   - Cursor:        ~/.cursor/commands/
#   - OpenCode:      ~/.config/opencode/workflows/
#   - Amp:           ~/.config/amp/commands/
#   - Factory Droid: ~/.factory/commands/

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/commands"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "Installing workflow commands (symlinks)..."
echo ""

installed_count=0
skipped_count=0

install_agent() {
    local name="$1"
    local check_dir="$2"
    local target_dir="$3"
    
    # Check if the agent's config directory exists
    if [[ ! -d "$check_dir" ]]; then
        echo -e "${YELLOW}⏭  $name: skipped ($check_dir not found)${NC}"
        ((skipped_count++))
        return
    fi
    
    # Create commands directory if it doesn't exist
    mkdir -p "$target_dir"
    
    # Symlink all .md files from source to target
    for cmd_file in "$SOURCE_DIR"/*.md; do
        if [[ -f "$cmd_file" ]]; then
            filename="$(basename "$cmd_file")"
            target_path="$target_dir/$filename"
            
            # Remove existing file/symlink if present
            rm -f "$target_path"
            
            # Create symlink
            ln -s "$cmd_file" "$target_path"
        fi
    done
    
    echo -e "${GREEN}✓  $name: linked to $target_dir${NC}"
    ((installed_count++))
}

install_agent "Claude Code"   "$HOME/.claude"              "$HOME/.claude/commands"
install_agent "Cursor"        "$HOME/.cursor"              "$HOME/.cursor/commands"
install_agent "OpenCode"      "$HOME/.config/opencode"     "$HOME/.config/opencode/commands"
install_agent "Amp"           "$HOME/.config/amp"          "$HOME/.config/amp/commands"
install_agent "AntiGravity"   "$HOME/.gemini/antigravity"  "$HOME/.gemini/antigravity/global_workflows"
install_agent "Factory Droid" "$HOME/.factory"             "$HOME/.factory/commands"

echo ""
echo "Done! Linked to $installed_count agent(s), skipped $skipped_count."
echo ""
echo "Edits to $SOURCE_DIR will automatically apply to all linked agents."
