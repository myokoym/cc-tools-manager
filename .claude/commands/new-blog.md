---
shortname: new-blog
---

# Create New Blog Article

Create a new blog article in the `blogs/` directory with proper formatting and metadata.

## Usage

```
/new-blog filename "English Title" "Japanese Title"
```

- `filename`: The filename for the blog post (without .md extension)
- `English Title`: The title in English (required)
- `Japanese Title`: The title in Japanese (required)

## Implementation

```bash
#!/bin/bash

# Get the filename and titles from arguments
FILENAME="$1"
TITLE_EN="$2"
TITLE_JA="$3"

# Check if filename is provided
if [ -z "$FILENAME" ]; then
    echo "Error: Please provide a filename"
    echo "Usage: /new-blog filename 'English Title' 'Japanese Title'"
    exit 1
fi

# Check if both titles are provided
if [ -z "$TITLE_EN" ] || [ -z "$TITLE_JA" ]; then
    echo "Error: Please provide both English and Japanese titles"
    echo "Usage: /new-blog filename 'English Title' 'Japanese Title'"
    exit 1
fi

# Ensure the filename doesn't have .md extension (we'll add it)
FILENAME="${FILENAME%.md}"
FILENAME="${FILENAME%.ja}"

# Convert filename to a URL-friendly format
FILENAME=$(echo "$FILENAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g')

# Create the blogs directory if it doesn't exist
mkdir -p blogs

# Generate the current date
DATE=$(date +%Y-%m-%d)
DATETIME=$(date +"%Y-%m-%d %H:%M:%S")

# Output paths
OUTPUT_PATH_EN="blogs/${FILENAME}.md"
OUTPUT_PATH_JA="blogs/${FILENAME}.ja.md"

# Check if files already exist
if [ -f "$OUTPUT_PATH_EN" ] || [ -f "$OUTPUT_PATH_JA" ]; then
    echo "Error: Files already exist"
    [ -f "$OUTPUT_PATH_EN" ] && echo "  - $OUTPUT_PATH_EN"
    [ -f "$OUTPUT_PATH_JA" ] && echo "  - $OUTPUT_PATH_JA"
    exit 1
fi

# Create English blog post
cat << EOF > "$OUTPUT_PATH_EN"
---
title: "$TITLE_EN"
date: $DATE
author: $(git config user.name 2>/dev/null || echo "your-username")
tags: [tag1, tag2, tag3]
category: choose-one
description: "Brief description of your blog post (optional)"
---

# $TITLE_EN

## TL;DR

A brief summary of the main points for readers in a hurry.

## Introduction

Set the context and explain what problem you're addressing or what topic you're covering.

## Main Content

### Section 1

Your content here...

\`\`\`bash
# Example code block
command example
\`\`\`

### Section 2

More content...

\`\`\`typescript
// Example code
const example = "code";
\`\`\`

## Results/Findings

Describe what you discovered or achieved.

## Conclusion

Summarize the key takeaways and next steps.

## References

- [Reference 1](https://example.com)
- [Reference 2](https://example.com)
EOF

# Create Japanese blog post
cat << EOF > "$OUTPUT_PATH_JA"
---
title: "$TITLE_JA"
date: $DATE
author: $(git config user.name 2>/dev/null || echo "your-username")
tags: [tag1, tag2, tag3]
category: choose-one
lang: ja
description: "ブログ記事の簡潔な説明（オプション）"
---

# $TITLE_JA

## TL;DR

忙しい読者のための要点のまとめ。

## はじめに

コンテキストを設定し、取り組んでいる問題や扱うトピックを説明します。

## 本文

### セクション1

ここに内容を記述...

\`\`\`bash
# コードブロックの例
command example
\`\`\`

### セクション2

さらに内容を記述...

\`\`\`typescript
// コード例
const example = "code";
\`\`\`

## 結果/発見

発見したことや達成したことを説明します。

## まとめ

主要なポイントと次のステップをまとめます。

## 参考資料

- [参考資料1](https://example.com)
- [参考資料2](https://example.com)
EOF

echo "Blog posts created:"
echo "  - English: $OUTPUT_PATH_EN"
echo "  - Japanese: $OUTPUT_PATH_JA"
echo ""
echo "Next steps:"
echo "1. Edit both blog posts to add your content"
echo "2. Update the metadata (tags, category, description)"
echo "3. Keep both versions synchronized"
echo "4. Add language switcher links at the top of each file:"
echo "   [English]($FILENAME.md) | [日本語]($FILENAME.ja.md)"
```

## Example Usage

### Basic usage
```
/new-blog my-first-post "My First Post" "初めての投稿"
```
Creates:
- `blogs/my-first-post.md` (English)
- `blogs/my-first-post.ja.md` (Japanese)

### Complex title example
```
/new-blog react-hooks "Understanding React Hooks: A Complete Guide" "React Hooksを理解する：完全ガイド"
```
Creates both English and Japanese versions with proper titles

### Feature implementation blog
```
/new-blog text-content-implementation "Text Content Feature Implementation" "テキストコンテンツ機能の実装"
```
Creates bilingual blog posts for documenting features

## Features

- Creates both English and Japanese versions
- Automatically creates the `blogs/` directory if it doesn't exist
- Generates proper YAML frontmatter with all required fields
- Uses templates matching existing blog structure
- Adds current date and author from git config
- Sanitizes filenames to be URL-friendly
- Prevents overwriting existing files
- Includes language switcher reminder
- Sets proper language tags (lang: ja for Japanese)