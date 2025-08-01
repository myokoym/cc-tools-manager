# Implementing Text Content Management in CCPM

## Introduction

Claude Code Package Manager (CCPM) is a tool for managing Claude Code tools (commands, agents, hooks) from GitHub repositories. However, users found it cumbersome to create a GitHub repository for simple, single-file commands.

This led to implementing a feature to directly manage single text files without requiring a repository.

## First Approach: Overly Complex Design

Initially, I followed the Kiro specification-driven development process and created a detailed design:

```
- TextContentManager (registration/import)
- TextContentEditor (edit/delete)  
- TextContentDeployer (deployment)
- StorageService (data persistence with conf package)
- Many other classes...
```

The design looked impressive, but before implementation, I received crucial user feedback:

> "This looks very complex. Won't it bloat the build or affect other features? The main focus is still register url."

This single comment made me pause and reconsider.

## Paradigm Shift: Leveraging Existing Systems

I decided to take a completely different approach:

**What if we treat text content as "special repositories"?**

### Implementation Strategy

1. Register text content as virtual repositories with `text://` protocol
2. Use the existing registry system as-is
3. Add no new dependencies

### Actual Code Changes

#### 1. Extending URL Validation

```typescript
// RegistryService.ts
validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Special handling for text:// protocol
    if (urlObj.protocol === 'text:') {
      return /^text:\/\/[\w.-]+$/.test(url);
    }
    
    // Existing GitHub URL validation...
```

#### 2. Creating Dummy Git Repositories

After trying various special handling approaches, I arrived at a simple solution:

```typescript
// GitManager.ts - in clone method
if (repo.url.startsWith('text://')) {
  await fs.mkdir(repoPath, { recursive: true });
  
  // Initialize as dummy Git repository
  const gitForInit = simpleGit(repoPath);
  await gitForInit.init();
  
  // Create placeholder file and commit
  const placeholderPath = path.join(repoPath, '.text-content');
  await fs.writeFile(placeholderPath, `This is a text content repository: ${repo.name}`);
  
  await gitForInit.add('.text-content');
  await gitForInit.commit('Initial commit for text content');
  
  return;
}
```

This allowed all existing Git operations to work normally.

#### 3. Text Content Deployment

```typescript
// DeploymentService.ts
private async deployTextContent(repo: Repository, options?: { interactive?: boolean }): Promise<DeploymentResult> {
  // Simply read text content file and copy to ~/.claude/[type]/
  const contentFile = path.join(textContentDir, `${repo.name}.md`);
  const targetPath = path.join(CLAUDE_DIR, repo.type || 'commands', `${repo.name}.md`);
  
  await copyFile(contentFile, targetPath);
  // ...
}
```

## Usage

The final usage is very simple:

```bash
# 1. Register text content
$ ccpm register text
? Enter the name for this text content (.md will be added): my-awesome-command
? Select the content type: commands
📝 Opening editor...
✅ Registration Complete

# 2. Edit when needed
$ ccpm edit my-awesome-command

# 3. Deploy
$ ccpm update my-awesome-command

# 4. List (shown together with repositories)
$ ccpm list

# 5. Remove
$ ccpm remove my-awesome-command
```

## Lessons Learned

### 1. Simplicity is Justice

The initial design attempted to create a completely independent subsystem. However, the same goal was achieved by slightly extending the existing system.

### 2. Importance of User Feedback

The comment "too complex" became the turning point to better design. Getting feedback before implementation was fortunate.

### 3. Leveraging Constraints

By leveraging the existing constraint of a "repository management system," we could provide a unified interface.

## Conclusion

Through this implementation, I learned that "new feature = writing lots of new code" isn't always correct. By cleverly reusing existing code, we can create more maintainable and consistent systems.

The final implementation has these characteristics:

- **Added code**: ~400 lines
- **New dependencies**: 0
- **Impact on existing features**: Minimal
- **User experience**: Unified with existing commands

Sometimes it's important to pause and ask, "Isn't there a simpler way?"

## Related Links

- [Claude Code Package Manager (GitHub)](https://github.com/myokoym/claude-code-package-manager)
- [Implementation PR/Commit History] (Replace with actual links)