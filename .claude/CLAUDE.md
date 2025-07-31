# Project-specific instructions for Claude Code

## Commit Message Format

This project uses bilingual commit messages with English as the primary language and Japanese translation on the third line:

```
<English commit message>

<Japanese translation>
```

### Examples:

```
Add user authentication feature

ユーザー認証機能を追加
```

```
Fix database connection timeout issue

データベース接続のタイムアウト問題を修正
```

```
Update README with internationalization

READMEを国際化対応に更新
```

### Guidelines:
- First line: Clear, concise English message (imperative mood)
- Second line: Empty line
- Third line: Japanese translation
- Keep both messages under 72 characters when possible
- Use conventional commit prefixes: feat:, fix:, docs:, style:, refactor:, test:, chore:

## Detailed Commit Messages

When more details are needed, follow this format:

```
<English summary>

<English detailed description>

<Japanese summary>

<Japanese detailed description>
```

### Example with details:

```
feat: Add multi-language support for documentation

This commit introduces internationalization support for all documentation files.
- Separated Japanese content into .ja.md files
- Translated all documentation to English as the primary language
- Added language switcher links to README files
- Updated package.json description to English

ドキュメントの多言語対応を追加

このコミットは全ドキュメントファイルの国際化対応を導入します。
- 日本語コンテンツを.ja.mdファイルに分離
- 全ドキュメントを英語（主要言語）に翻訳
- READMEファイルに言語切り替えリンクを追加
- package.jsonのdescriptionを英語に更新
```

## Documentation Update Rules

When updating any documentation in this repository:

### Language Requirements
1. **Primary language**: English
   - All main documentation files (*.md) must be in English
   - Use clear, concise technical English

2. **Japanese translations**: Maintained as separate files
   - Pattern: `filename.md` (English) → `filename.ja.md` (Japanese)
   - Always update both versions when making changes

### Update Process
1. **Edit English version first** (primary language)
2. **Update Japanese version** to match the changes
3. **Keep both versions synchronized**
   - Same structure and section headings
   - Same code examples and commands
   - Translated content with equivalent meaning

### Language Switcher
All documentation files should include language switcher links at the top:
```markdown
[English](filename.md) | [日本語](filename.ja.md)
```

### Special Files
- **README.md**: Main project documentation (English)
- **README.ja.md**: Japanese translation
- **.claude/CLAUDE.md**: This file (English only, as it's for Claude Code)
- **INTERNATIONALIZATION_NOTES.md**: Work log (English only)

## Blog Post Format

When creating blog posts in the `blogs/` directory:

### Required Front Matter
All blog posts must include YAML front matter:

```yaml
---
title: "Blog Post Title"
date: YYYY-MM-DD
author: username
tags: [tag1, tag2, tag3]
category: category-name
---
```

For Japanese posts, add `lang: ja`:
```yaml
---
title: "ブログ記事タイトル"
date: YYYY-MM-DD
author: username
tags: [tag1, tag2, tag3]
category: category-name
lang: ja
---
```

### File Naming
- English: `descriptive-slug.md`
- Japanese: `descriptive-slug.ja.md`

### Categories & Tags
See `blogs/README.md` for standard categories and common tags.

## Active Specifications

### text-content-management
- **Description**: テキストを登録できる仕組み - リポジトリになっていないコマンドなどを取り込む
- **Status**: Initialized
- **Next Step**: Run `/kiro:spec-requirements text-content-management`