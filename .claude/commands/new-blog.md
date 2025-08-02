---
shortname: new-blog
---

# Create New Blog Article

Create a new blog article in the `blogs/` directory with proper formatting and metadata.

## Usage

```
/new-blog [filename] [title]
```

- `filename`: The filename for the blog post (without .md extension)
- `title`: The title of the blog post (optional, will be derived from filename if not provided)

## Implementation

```bash
#!/bin/bash

# Get the filename and title from arguments
FILENAME="$1"
TITLE="${2:-$1}"

# Check if filename is provided
if [ -z "$FILENAME" ]; then
    echo "Error: Please provide a filename"
    echo "Usage: /new-blog [filename] [title]"
    exit 1
fi

# Ensure the filename doesn't have .md extension (we'll add it)
FILENAME="${FILENAME%.md}"

# Convert filename to a URL-friendly format
FILENAME=$(echo "$FILENAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g')

# Create the blogs directory if it doesn't exist
mkdir -p blogs

# Generate the current date
DATE=$(date +%Y-%m-%d)
DATETIME=$(date +"%Y-%m-%d %H:%M:%S")

# Output path
OUTPUT_PATH="blogs/${FILENAME}.md"

# Check if file already exists
if [ -f "$OUTPUT_PATH" ]; then
    echo "Error: File already exists at $OUTPUT_PATH"
    exit 1
fi

# Create blog post content
cat << EOF > "$OUTPUT_PATH"
---
title: "$TITLE"
date: $DATE
author: $(git config user.name 2>/dev/null || echo "Author Name")
tags: []
draft: true
---

# $TITLE

## Introduction

[Write your introduction here]

## Main Content

[Write your main content here]

### Subsection 1

[Content for subsection 1]

### Subsection 2

[Content for subsection 2]

## Code Examples

\`\`\`javascript
// Example code block
function example() {
    console.log("Hello, World!");
}
\`\`\`

## Conclusion

[Write your conclusion here]

## References

- [Reference 1](https://example.com)
- [Reference 2](https://example.com)

---

*Created: $DATETIME*
EOF

echo "Blog post created at: $OUTPUT_PATH"
echo ""
echo "Next steps:"
echo "1. Edit the blog post at $OUTPUT_PATH"
echo "2. Update the metadata (tags, author, etc.)"
echo "3. Remove 'draft: true' when ready to publish"
echo "4. Add content to each section"
```

## Example Usage

### Basic usage
```
/new-blog my-first-post
```
Creates `blogs/my-first-post.md` with title "my-first-post"

### With custom title
```
/new-blog react-hooks "Understanding React Hooks: A Complete Guide"
```
Creates `blogs/react-hooks.md` with title "Understanding React Hooks: A Complete Guide"

### With spaces in filename
```
/new-blog "best practices" "JavaScript Best Practices in 2024"
```
Creates `blogs/best-practices.md` with the specified title

## Features

- Automatically creates the `blogs/` directory if it doesn't exist
- Generates proper frontmatter with metadata
- Includes a basic blog post structure
- Adds current date and author information
- Sanitizes filenames to be URL-friendly
- Prevents overwriting existing files
- Sets posts as draft by default