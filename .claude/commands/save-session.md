---
shortname: save-session
---

# Save Current Session History

Save the current working session history to `.claude/session-history/`.

## Usage

```
/save-session [filename]
```

If no filename is provided, it will use the current timestamp.

## Implementation

```bash
#!/bin/bash

# Get the filename from arguments or use timestamp
FILENAME="${1:-$(date +%Y%m%d_%H%M%S)}"

# Ensure the filename has .md extension
if [[ ! "$FILENAME" =~ \.md$ ]]; then
    FILENAME="${FILENAME}.md"
fi

# Create the session-history directory if it doesn't exist
mkdir -p .claude/session-history

# Output path
OUTPUT_PATH=".claude/session-history/${FILENAME}"

# Create session history content
cat << EOF > "$OUTPUT_PATH"
# Session History - $(date)

## Working Directory
$(pwd)

## Git Status
\`\`\`
$(git status --short 2>/dev/null || echo "Not a git repository")
\`\`\`

## Recent Git Commits
\`\`\`
$(git log --oneline -10 2>/dev/null || echo "No git history available")
\`\`\`

## Files Modified in This Session
\`\`\`
$(git diff --name-only 2>/dev/null || echo "No tracked changes")
\`\`\`

## Current Branch
\`\`\`
$(git branch --show-current 2>/dev/null || echo "Not in a git repository")
\`\`\`

## Session Summary
This session was saved on $(date).

### Key Activities
- Working directory: $(pwd)
- Branch: $(git branch --show-current 2>/dev/null || echo "N/A")
- Modified files: $(git diff --name-only 2>/dev/null | wc -l | tr -d ' ') files

### Next Steps
[To be filled by user]

EOF

echo "Session history saved to: $OUTPUT_PATH"
```

## Example Output

The command will create a markdown file with:
- Current date and time
- Working directory
- Git status
- Recent commits
- Files modified in the session
- Current branch
- Session summary

Example usage:
```
/save-session project-rename-session
```

This will create `.claude/session-history/project-rename-session.md`