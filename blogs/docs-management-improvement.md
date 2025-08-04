---
title: "Solving Documentation Sync Issues with Git Hooks"
date: 2025-08-04
author: myokoym
tags: [documentation, git-hooks, automation, development-workflow]
category: development
description: "How we solved the recurring problem of outdated documentation using git hooks and automation scripts"
---

# Solving Documentation Sync Issues with Git Hooks

[English](docs-management-improvement.md) | [日本語](docs-management-improvement.ja.md)

## TL;DR

We implemented git hooks and automated checks to prevent documentation from going out of sync with code changes, solving a recurring problem where `docs/commands.md` was consistently forgotten during updates.

## Introduction

In the cc-tools-manager project, we maintain documentation in multiple places:
- `README.md` - Quick start and overview
- `docs/commands.md` - Comprehensive command reference

The problem: When updating commands, we frequently forgot to update `docs/commands.md`, leaving users with outdated information. This happened repeatedly despite best intentions.

## The Problem

### Symptoms
- Command behaviors changed but documentation remained outdated
- Users confused by discrepancies between actual behavior and documentation
- Multiple instances of forgetting to update docs despite reminders

### Root Cause
- Manual process dependent on human memory
- No automated checks or enforcement
- Documentation updates seen as "secondary" task after code changes

## Solution Implementation

### 1. Git Pre-commit Hook

We created a git hook that automatically checks if command files have been modified and prompts for documentation updates:

```bash
#!/bin/bash
# .git/hooks/pre-commit

if git diff --cached --name-only | grep -q "src/commands/"; then
  echo "⚠️  警告: コマンドファイルが変更されています！"
  echo ""
  echo "以下を確認してください："
  echo "  □ docs/commands.md を更新しましたか？"
  echo "  □ コマンド比較テーブルも更新しましたか？"
  
  if git diff --cached --name-only | grep -q "docs/commands.md"; then
    echo "✅ docs/commands.md も変更されています。"
  else
    echo "❌ docs/commands.md が変更されていません！"
  fi
  
  echo ""
  echo "続行しますか？ [y/N]"
  read -r response < /dev/tty
  if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "❌ コミットを中止しました。"
    exit 1
  fi
fi
```

### 2. Documentation Check Script

Created `scripts/check-docs.sh` to verify documentation synchronization:

```bash
#!/bin/bash
# Check if all commands have documentation
# Check if README and docs/commands.md are in sync
# Show recent updates to both code and docs
```

This script can be run anytime to verify documentation status.

### 3. Clear Separation of Concerns

We clarified the roles:
- **README.md**: Quick examples and project overview
- **docs/commands.md**: Complete command reference (single source of truth)

## Results

1. **Physical enforcement**: Git hook prevents commits without acknowledgment
2. **Easy verification**: Run `./scripts/check-docs.sh` anytime
3. **Clear accountability**: No more "I forgot" - the system reminds you

## Key Learnings

1. **Don't rely on human memory** - Use automation
2. **Make the right thing the easy thing** - Git hooks make it harder to forget
3. **Single source of truth** - Having documentation in one authoritative place reduces maintenance burden

## Conclusion

By implementing technical controls rather than relying on process or memory, we've solved a persistent documentation problem. The git hook serves as a safety net, ensuring documentation stays in sync with code changes.

## Implementation Details

The complete implementation includes:
- Git pre-commit hook in `.git/hooks/pre-commit`
- Documentation check script in `scripts/check-docs.sh`
- Updated `docs/commands.md` with latest command behaviors

These changes ensure that documentation will never lag behind code changes again.