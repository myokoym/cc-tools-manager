# Claude Code Package Manager (ccpm) Commands Reference

[English](commands.md) | [日本語](commands.ja.md)

## Command Details

### register

Register a new GitHub repository containing Claude tools.

#### Usage

```bash
# Standard registration
ccpm register https://github.com/owner/repo

# With type specification
ccpm register https://github.com/owner/repo --type <type>
```

#### Auto-detection

The command automatically detects the following directory structures:
- `.claude/agents/`, `.claude/commands/`, `.claude/hooks/`
- `agents/`, `commands/`, `hooks/`

When these structures are detected, files are deployed to the appropriate locations in `~/.claude/`.

#### Type Specification

Use `--type` only when:
- Your repository doesn't follow the standard directory structure
- You want ALL files in the repository to be treated as a specific type
- Example: A repository with custom scripts that should all be deployed as commands

Valid types: `agents`, `commands`, `hooks`

#### Options
- `-t, --type <type>`: Specify repository type (agents, commands, hooks)
- `-d, --data-dir <dir>`: Custom data directory path

#### Examples

```bash
# Register a standard repository
ccpm register https://github.com/anthropics/claude-tools

# Register a non-standard repository as commands
ccpm register https://github.com/user/my-scripts --type commands
```

### update

Update repositories with enhanced deployment tracking and automatic deployment options.

#### Usage
```bash
# Update all repositories
ccpm update

# Update by repository name
ccpm update owner/repo

# Update by index number (from list command)
ccpm update 1

# Update by repository ID
ccpm update abc123def

# Update and automatically deploy files (skips deployment prompt)
ccpm update --install

# Update with force deployment
ccpm update --force
```

#### Enhanced Features
- Repository selection by name, index (#), or ID
- Parallel processing for faster updates
- Detailed deployment tracking with file-level granularity
- Automatic cleanup of orphaned files
- Progress indication for each operation
- **New**: `--install` flag for automatic deployment after update

#### Options
- `--install`: Automatically deploy files after update (same as answering "y" to deploy prompt)
- `--concurrent <number>`: Set number of parallel operations (default: 3)
- `--skip-deploy`: Update repository without deploying files
- `--conflict-resolution <strategy>`: Handle conflicts (skip/overwrite/prompt)
- `-f, --force`: Skip deployment confirmation prompt
- `-a, --all`: Update all repositories
- `-i, --interactive`: Prompt before overwriting each file

### install

Deploy files from registered repositories without updating the git repository. This command is useful when you want to deploy files from an already-updated repository or restore previously deployed files.

#### Usage
```bash
# Install specific repository
ccpm install owner/repo

# Install by index number (from list command)
ccpm install 1

# Install by repository ID
ccpm install abc123def

# Install all registered repositories
ccpm install --all
```

#### Features
- Repository selection by name, index (#), or ID
- Deploys files to `.claude/` directory without performing git pull
- Supports both pattern-based and type-based deployments
- Interactive confirmation prompts (can be skipped with --force)
- Progress indication and detailed feedback

#### Options
- `-f, --force`: Skip deployment confirmation prompt
- `-a, --all`: Install all repositories
- `-i, --interactive`: Prompt before overwriting each file

#### When to use install vs update

| Scenario | Command to use |
|----------|----------------|
| Get latest changes and deploy | `ccpm update` or `ccpm update --install` |
| Deploy files from current repository state | `ccpm install` |
| Restore previously deployed files | `ccpm install` |
| Deploy after manual git operations | `ccpm install` |

### uninstall

Remove deployed files from `.claude` directory while keeping the repository registered and the local git repository intact.

#### Usage
```bash
# Uninstall specific repository files
ccpm uninstall owner/repo

# Uninstall by index number
ccpm uninstall 1

# Uninstall by repository ID
ccpm uninstall abc123def

# Uninstall all repositories
ccpm uninstall --all
```

#### Features
- Repository selection by name, index (#), or ID
- Removes all deployed files tracked in state.json
- Shows detailed progress of file removal
- Dry run mode to preview changes
- Updates state tracking after removal

#### Options
- `-f, --force`: Skip removal confirmation prompt
- `-a, --all`: Uninstall all repositories
- `--dry-run`: Show what would be removed without making changes

#### Example Output
```bash
ccpm uninstall 1

# Output:
Uninstalling owner/repo...
✓ Found 3 deployed files
Remove 3 deployed files? (y/N): y
Removing files...
✓ Removed 3 files
✓ owner/repo uninstalled successfully
```

### unregister

Remove repository from registry while keeping deployed files intact. This is useful when you want to stop tracking a repository but continue using its deployed tools.

#### Usage
```bash
# Unregister specific repository
ccpm unregister owner/repo

# Unregister by index number
ccpm unregister 1

# Unregister by repository ID
ccpm unregister abc123def

# Unregister all repositories
ccpm unregister --all
```

#### Features
- Repository selection by name, index (#), or ID
- Removes repository from registry only
- Deployed files remain in `.claude/` directory
- Provides guidance on how to remove files if needed

#### Options
- `-f, --force`: Skip removal confirmation prompt
- `-a, --all`: Unregister all repositories

#### Example Output
```bash
ccpm unregister 1

# Output:
Unregistering owner/repo...
Remove "owner/repo" from registry? This will NOT remove deployed files. (y/N): y
Removing from registry...
✓ Removed from registry
✓ owner/repo unregistered successfully
  Note: Deployed files remain in .claude directory
  Run 'ccpm uninstall owner/repo' to remove deployed files
```

### list

Display registered repositories with their status and deployment information.

#### Basic Usage

```bash
ccpm list
```

Shows a table with:
- **Index number (#)** - Used for quick repository selection
- **Repository ID** - Unique identifier (shown in verbose mode)
- Repository name
- Current status (Active, Error, Not Initialized)
- Number of deployments
- Registration date

#### Verbose Mode

```bash
ccpm list --verbose
```

In verbose mode, the command additionally displays:
- Detailed repository information
- Deployment file tree showing all deployed files and their directory structure
- File count statistics

Example verbose output:
```
Registered Repositories:

Name                Status              Deployments    Registered          
────────────────────────────────────────────────────────────────────────
owner/repo1         ● Active                      5    2025/1/15           

  Deployed Files:
  └── commands/
      ├── utils/
      │   └── helper.md
      ├── build.md
      └── test.md
  
  Total: 3 files

owner/repo2         ✗ Error                       0    2025/1/10           
  Last error: Authentication failed

Total: 2 repositories
```

### remove

Remove a repository and clean up all associated files. Supports the same selection methods as other commands.

#### Usage
```bash
# Remove by repository name
ccpm remove owner/repo

# Remove by index number
ccpm remove 2

# Remove by repository ID
ccpm remove abc123def
```

#### Enhanced Features
- Repository selection by name, index (#), or ID
- Tracks and removes all deployed files
- Cleans up empty directories
- Shows detailed removal progress
- Confirms successful cleanup

Example:
```bash
ccpm remove 1

# Output:
Removing repository owner/repo...
✓ Removed deployed file: ~/.claude/commands/build.md
✓ Removed deployed file: ~/.claude/commands/test.md
✓ Cleaned up empty directory: ~/.claude/commands
✓ Repository removed successfully
```

### show

Display repository information. Without arguments, shows a summary of all repositories. With a repository argument, shows detailed information about that specific repository.

#### Usage
```bash
# Show summary of all repositories
ccpm show

# Show by repository name
ccpm show owner/repo

# Show by index number (from list command)
ccpm show 1

# Show by repository ID (partial match supported)
ccpm show abc123def
```

#### Features
- Without arguments: Shows status summary of all repositories
- With repository argument: Shows detailed deployment information
- Repository selection by name, index (#), or ID (minimum 4 characters for partial ID)
- Displays actual deployment paths from state.json
- Shows source → target mappings with full paths
- Groups files by directory for better organization
- Home directory automatically displayed as ~

#### Options
- `-v, --verbose`: Show additional details including internal IDs and repository status
- `--format <format>`: Output format (table, json, yaml, tree)
- `--files-only`: Show only deployed files list
- `--tree`: Display files in tree format (with --files-only)
- `--skip-deployments`: Skip deployment information section
- `--summary`: Force summary view even when showing specific repository

#### Example Output
```bash
ccpm show 1

# Output:
✓ Found repository: owner/agents-repo

Repository: owner/agents-repo

  URL: https://github.com/owner/agents-repo
  Status: active
  Registered: 2025/1/15 10:30:45
  Type: agents
  Deployment Mode: type-based

Deployments:

  Summary:
    Total Files: 3
    Deployed: 3
    Last Deployment: 2025/1/15 10:31:00

  agents/core:
    agents/core/code-archaeologist.md → ~/.claude/agents/core/code-archaeologist.md [deployed]
    agents/core/performance-optimizer.md → ~/.claude/agents/core/performance-optimizer.md [deployed]

  agents/frontend:
    agents/frontend/react-specialist.md → ~/.claude/agents/frontend/react-specialist.md [deployed]
```


## Command Overview

### Available Commands

- `register <url>` - Register a new GitHub repository containing Claude tools
- `update [repository]` - Clone/update repositories and deploy tools to ~/.claude/
- `install [repository]` - Deploy files from registered repositories without git pull
- `uninstall [repository]` - Remove deployed files from .claude directory
- `unregister [repository]` - Remove repository from registry (keeps deployed files)
- `list` - List all registered repositories with their status
- `show [repository]` - Show repository information and status

### Command Flow

1. **Register**: Add a repository URL to track
2. **Update**: Clone the repository and deploy tools
3. **Install**: Deploy tools without updating repository
4. **List/Status**: Monitor your repositories
5. **Uninstall**: Remove deployed files while keeping repository
6. **Unregister**: Remove repository tracking while keeping files
7. **Remove**: Clean up when no longer needed

### Command Comparison

Understanding the differences between commands:

| Command | Repository Registry | Git Repository | Deployed Files |
|---------|-------------------|----------------|----------------|
| `update` | Keeps | Updates (git pull) | Redeploys (with prompt) |
| `update --install` | Keeps | Updates (git pull) | Deploys automatically |
| `install` | Keeps | No change | Deploys (with prompt) |
| `uninstall` | Keeps | No change | Removes |
| `unregister` | Removes | No change | Keeps |
| `remove` | Removes | Removes | Removes |

### When to use each command:

- **`update`**: Get latest changes from repository and optionally deploy
- **`update --install`**: Get latest changes and automatically deploy files
- **`install`**: Deploy files from current repository state without updating
- **`uninstall`**: Remove deployed files but keep repository registered
- **`unregister`**: Stop tracking repository but keep deployed files
- **`remove`**: Completely remove repository and all associated files

## Key Features

### Repository Management
- Support for multiple repositories
- Automatic Git operations (clone/pull)
- Repository selection by name, ID, or index number

### Deployment Tracking
- File-level deployment tracking
- Automatic cleanup of orphaned files
- Tree view visualization of deployed files
- Empty directory cleanup

### Performance
- Parallel processing for faster updates
- Progress indicators for all operations
- Configurable concurrency levels

### Flexible Deployment Options
- **Install without update**: Deploy files from current repository state
- **Automatic deployment**: Use `--install` flag with update command
- **Selective removal**: Uninstall files while keeping repository tracked
- **Clean separation**: Unregister repositories while keeping deployed files

## Environment Variables

See the main [README](../README.md#environment-variables) for available environment variables that affect command behavior, including:
- `CCPM_HOME` - Base directory for tool storage
- `CCPM_CLAUDE_DIR` - Claude directory for deployment
- `CCPM_LOG_LEVEL` - Logging verbosity