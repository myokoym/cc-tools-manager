# Blog Writing Guidelines

[English](README.md) | [日本語](README.ja.md)

This directory contains blog posts related to the cc-tools-manager project.

## Blog Post Format

All blog posts must include YAML front matter at the beginning of the file with the following required fields:

```yaml
---
title: "Your Blog Post Title"
date: YYYY-MM-DD
author: username
tags: [tag1, tag2, tag3]
category: category-name
---
```

### Front Matter Fields

#### Required Fields
- **title**: The title of the blog post (string, use quotes if it contains special characters)
- **date**: Publication date in ISO format (YYYY-MM-DD)
- **author**: Author's username or name
- **tags**: Array of relevant tags (lowercase, hyphenated)
- **category**: Single category for the post

#### Optional Fields
- **lang**: Language code for non-English posts (e.g., `ja` for Japanese)
- **description**: Brief description of the post (for SEO/previews)
- **updated**: Last update date if different from publication date

## File Naming Convention

- English posts: `descriptive-slug.md`
- Japanese translations: `descriptive-slug.ja.md`
- Use lowercase letters, numbers, and hyphens only

## Categories

Standard categories for this project:
- `performance`: Performance optimization and benchmarks
- `feature`: New features and functionality
- `tutorial`: How-to guides and tutorials
- `development`: Development tips and workflows
- `announcement`: Project announcements and updates

## Tags

Common tags used in this project:
- `wsl2`: Windows Subsystem for Linux 2
- `nodejs`: Node.js related
- `typescript`: TypeScript specific
- `performance`: Performance improvements
- `cli`: Command-line interface
- `installation`: Setup and installation
- `configuration`: Configuration topics

## Language Support

- Primary language: English (`.md` files)
- Translations: Add language code before `.md` (e.g., `.ja.md` for Japanese)
- Both versions should have identical front matter (except `lang` field)

## Example Blog Post

```markdown
---
title: "Optimizing Node.js Performance in WSL2"
date: 2025-07-30
author: myokoym
tags: [wsl2, nodejs, performance, optimization]
category: performance
description: "How to improve Node.js performance in WSL2 environments"
---

# Optimizing Node.js Performance in WSL2

Your content here...
```

## Writing Tips

1. Include practical examples and code snippets
2. Add performance metrics and benchmarks where relevant
3. Use clear headings and subheadings
4. Include a TL;DR section for longer posts
5. Add references and links to related resources
6. Keep technical accuracy while maintaining readability