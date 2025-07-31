# Smart File Filtering for Type-based Deployments in ccpm

## The Challenge

When implementing the type-based deployment feature for ccpm (Claude Code Package Manager), we encountered an interesting challenge: how to intelligently filter files when deploying repositories that don't follow the standard `.claude/` directory structure.

Consider a repository structure like this:
```
my-agents-repo/
├── .gitignore
├── README.md
├── LICENSE
├── package.json
├── marketing.md
├── engineering/
│   └── backend.md
└── design/
    ├── ui-patterns.md
    └── components.md
```

When users register this with `ccpm register https://github.com/user/my-agents-repo --type agents`, we want to deploy only the relevant agent files to `~/.claude/agents/`, not the configuration files.

## The Solution

We implemented a smart filtering system in the `getTypeBasedPatterns` method that:

### 1. Ignores Dot Files
```javascript
ignore: [
  '.*',           // Files starting with dot
  '**/.*',        // Dot files in subdirectories
  '**/.*/.**',    // Files in dot directories
]
```

This filters out:
- `.gitignore`
- `.env`
- `.github/workflows/`
- Any other configuration files

### 2. Skips Uppercase Files
```javascript
if (!isDirectory && basename[0] === basename[0].toUpperCase()) {
  logger.debug(`Skipping uppercase file: ${file}`);
  continue;
}
```

This intelligently filters out:
- `README.md`
- `LICENSE`
- `CONTRIBUTING.md`
- Other documentation files that typically start with uppercase

### 3. Only Deploys Relevant Content
```javascript
if (isDirectory || file.endsWith('.md')) {
  // Include this file/directory
}
```

Only directories and `.md` files are deployed, ensuring that:
- Agent/command/hook definitions are included
- Directory structures are preserved
- Non-relevant files are excluded

## Implementation Details

The complete implementation in `DeploymentService.ts`:

```typescript
private async getTypeBasedPatterns(repoPath: string, type: string): Promise<PatternMatch[]> {
  const matches: PatternMatch[] = [];
  
  try {
    const files = await glob('**/*', {
      cwd: repoPath,
      nodir: false,
      ignore: [
        '**/node_modules/**', 
        '**/.git/**', 
        '**/dist/**', 
        '**/build/**',
        '.*',
        '**/.*',
        '**/.*/.**',
      ]
    });
    
    for (const file of files) {
      const basename = path.basename(file);
      const isDirectory = (await fs.stat(path.join(repoPath, file))).isDirectory();
      
      if (isDirectory || file.endsWith('.md')) {
        if (!isDirectory && basename[0] === basename[0].toUpperCase()) {
          logger.debug(`Skipping uppercase file: ${file}`);
          continue;
        }
        
        matches.push({
          file,
          pattern: '**/*',
          targetType: type as 'commands' | 'agents' | 'hooks'
        });
      }
    }
  } catch (error) {
    logger.warn(`Type-based pattern matching failed: ${error}`);
  }
  
  return matches;
}
```

## Benefits

This approach provides several benefits:

1. **Zero Configuration**: Users don't need to add `.ccpmignore` files
2. **Intelligent Defaults**: Common patterns are handled automatically
3. **Clean Deployments**: Only relevant files end up in `~/.claude/`
4. **Preserves Structure**: Directory hierarchies are maintained

## Edge Cases Handled

### Directory vs File Detection
We use `fs.stat()` to properly detect directories, avoiding issues with special files:

```typescript
const stats = await fs.stat(sourcePath);
if (stats.isDirectory()) {
  // Handle directory recursively
} else if (stats.isFile()) {
  // Handle regular file
}
// Special files (sockets, symlinks) are implicitly skipped
```

### Input Validation
We added validation to catch common typos:

```typescript
if (options.type === 'agent') {
  console.log(chalk.yellow(`Did you mean 'agents'?`));
}
```

## Future Improvements

1. **Custom Ignore Patterns**: Allow users to specify additional patterns
2. **File Type Extensions**: Support more than just `.md` files
3. **Allowlist Mode**: Option to specify exactly which files to include

## Conclusion

By implementing smart file filtering, we've made type-based deployments more intuitive and error-resistant. Users can now deploy repositories without worrying about configuration files polluting their Claude Code environment.

This feature is available in ccpm v0.2.0 and later. Try it out:

```bash
ccpm register https://github.com/your/agents-repo --type agents
```

Happy deploying! 🚀