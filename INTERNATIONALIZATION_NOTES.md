# Internationalization Work Log

## Overview
Converting repository documentation from Japanese-only to English-primary with Japanese translations.

## File Naming Convention
- Primary files: English (e.g., `README.md`)
- Japanese translations: Add `.ja.md` suffix (e.g., `README.ja.md`)

## Commit Message Format
```
<English commit message>

<Japanese translation>
```

Example:
```
Add user authentication feature

ユーザー認証機能を追加
```

## Work Steps

### 1. Save Current Japanese Files
```bash
# Save root README
cp README.md README.ja.md

# Save steering files
cd .kiro/steering
for f in *.md; do cp "$f" "${f%.md}.ja.md"; done
cd ../..

# Save spec files
cd .kiro/specs/initial-implementation
for f in *.md; do cp "$f" "${f%.md}.ja.md"; done
cd ../../..
```

### 2. Translation Process
- Translate each `.md` file to English
- Keep technical terms and command examples unchanged
- Maintain markdown formatting and structure
- Add language switcher links in README

### 3. Package.json Update
- Change `description` field from Japanese to English

### 4. Language Switcher Format
Add to top of each README:
```markdown
[English](README.md) | [日本語](README.ja.md)
```

## Translation Guidelines
- Use clear, concise English
- Preserve all code blocks and commands exactly
- Maintain consistent terminology throughout
- Keep section structure identical between language versions

## Files to Translate
1. `/README.md`
2. `/.kiro/steering/product.md`
3. `/.kiro/steering/structure.md`
4. `/.kiro/steering/tech.md`
5. `/.kiro/specs/initial-implementation/requirements.md`
6. `/.kiro/specs/initial-implementation/design.md`
7. `/.kiro/specs/initial-implementation/tasks.md`
8. `package.json` (description field only)