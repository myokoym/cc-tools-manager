---
shortname: save-session
---

# Save Current Session History

Save the current working session history to `.claude/session-history/`.

## Usage

```
/save-session feature-name [--ja]
```

- `feature-name`: Required. The name of the feature or work being documented
- `--ja` or `-j`: Optional. Create Japanese version

## Implementation

```bash
#!/bin/bash

# Get the feature name from arguments
FEATURE="$1"

# Check if feature name is provided
if [ -z "$FEATURE" ]; then
    echo "Error: Please provide a feature name"
    echo "Usage: /save-session feature-name"
    exit 1
fi

# Create filename with date prefix
DATE_PREFIX=$(date +%Y-%m-%d)
FILENAME="${DATE_PREFIX}-${FEATURE}"

# Handle language option
if [ "$2" = "--ja" ] || [ "$2" = "-j" ]; then
    FILENAME="${FILENAME}.ja.md"
else
    FILENAME="${FILENAME}.md"
fi

# Create the session-history directory if it doesn't exist
mkdir -p .claude/session-history

# Output path
OUTPUT_PATH=".claude/session-history/${FILENAME}"

# Create session history content
cat << EOF > "$OUTPUT_PATH"
# Session History: $(echo "$FEATURE" | tr '-' ' ' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')

Date: $(date +%Y-%m-%d)

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

## Overview
[Brief overview of what was accomplished in this session]

## Changes Made

### 1. [First Major Change]
[Description of the change]

### 2. [Second Major Change]
[Description of the change]

## Technical Details
[Any important technical decisions or implementation details]

## Next Steps
- [ ] [Task 1]
- [ ] [Task 2]
- [ ] [Task 3]

## References
- [Related documentation or issues]

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
# English version
/save-session project-rename
```
Creates `.claude/session-history/2025-08-02-project-rename.md`

```
# Japanese version
/save-session text-content-feature --ja
```
Creates `.claude/session-history/2025-08-02-text-content-feature.ja.md`