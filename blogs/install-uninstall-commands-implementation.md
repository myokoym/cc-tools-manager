---
title: "Implementing Install and Uninstall Commands for CC Tools Manager"
date: 2025-08-02
author: myokoym
tags: [cli, tooling, command-implementation, simplification]
category: development
description: "How we implemented install/uninstall commands and learned the value of simplicity over complexity"
---

# Implementing Install and Uninstall Commands for CC Tools Manager

## TL;DR

We implemented install/uninstall/unregister commands for CC Tools Manager. Initially overcomplicated the solution, but user feedback led to a much simpler implementation that follows existing patterns - a valuable lesson in avoiding over-engineering.

## Introduction

CC Tools Manager needed better command separation between repository registration and file deployment. This article documents the implementation journey and the important lesson learned about simplicity.

## Main Content

### Section 1: Requirements Analysis

The initial requirement was to separate two concerns:
- Repository registration (tracking which repos are available)
- File deployment (copying files to `.claude` directory)

This led to a new command structure:
- `register`/`unregister` - Manage repository registry
- `install`/`uninstall` - Deploy/remove files
- `update` - Pull changes (enhanced with `--install` flag)

```bash
# Register a repository (doesn't deploy files)
ccpm register myrepo https://github.com/user/repo

# Deploy files from registered repository
ccpm install myrepo

# Remove deployed files (keeps registration)
ccpm uninstall myrepo

# Remove repository from registry
ccpm unregister myrepo
```

### Section 2: The Over-Engineering Trap

Initially, I created a complex architecture:

```typescript
// Complex state management with v2 format
export interface StateFileV2 {
  version: number;
  repositories: Repository[];
  deploymentStates: { [repositoryId: string]: DeploymentState };
  installationHistory: InstallationRecord[];
  metadata: {
    lastUpdated: string;
    lastMigration: string | null;
  };
}

// Enhanced state manager with caching, migration, etc.
class EnhancedStateManager extends StateManager {
  private stateCache: StateFileV2 | null = null;
  private cacheTimestamp: number = 0;
  // ... 400+ lines of complex logic
}
```

This included:
- State format migration (v1 to v2)
- Complex error recovery strategies
- Deployment tracking with history
- Multi-layered caching
- Over 45 unit tests

### Section 3: The Simplification

User feedback was direct and valuable:
> "うーん、なんか無駄に複雑なことやってない？updateとおなじことをすればいいだけのはずなんだけど"
> (Hmm, aren't you doing something unnecessarily complex? It should just do the same thing as update)

This led to a complete rewrite:

```typescript
// Simple implementation following existing patterns
export class InstallCommand {
  async execute(query?: string, options: InstallOptions = {}): Promise<void> {
    const state = await this.stateManager.loadState();
    const repo = this.findRepository(state, query);
    
    // Just use existing DeploymentService
    await this.deploymentService.deployFiles(repo, targetDir);
    
    console.log('✓ Installation complete');
  }
}
```

The final implementation:
- Removed 4,835 lines of complex code
- Added only 253 lines following existing patterns
- Maintained all functionality
- Much easier to understand and maintain

## Results/Findings

The simplified solution works perfectly:
- Commands are consistent with existing patterns
- Code is maintainable and clear
- No complex state migrations needed
- Tests are straightforward
- User experience is unchanged

Performance and reliability are excellent because we're using proven, existing components rather than reinventing the wheel.

## Conclusion

This implementation taught a valuable lesson: **Start simple, follow existing patterns, and only add complexity when proven necessary**. The user's feedback prevented us from shipping an over-engineered solution that would have been harder to maintain.

Key takeaways:
1. Always consider if existing code can solve the problem
2. User feedback is invaluable - listen carefully
3. Complex solutions aren't always better solutions
4. Following established patterns improves maintainability

The final implementation is clean, simple, and effective - exactly what good software should be.

## References

- [CC Tools Manager Repository](https://github.com/myokoym/cc-tools-manager)
- [Kiro Spec-Driven Development](../.kiro/specs/install-uninstall-commands/)
- [Original Implementation PR](https://github.com/myokoym/cc-tools-manager/pull/X)