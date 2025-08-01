# Claude Code Package Manager (ccpm) Commands Reference

[English](commands.md) | [日本語](commands.ja.md)

## Command Details

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

### update

Update repositories with enhanced deployment tracking. Can target specific repositories using various identifiers.

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
```

#### Features
- Repository selection by name, index (#), or ID
- Parallel processing for faster updates
- Detailed deployment tracking with file-level granularity
- Automatic cleanup of orphaned files
- Progress indication for each operation

#### Options
- `--concurrent <number>`: Set number of parallel operations (default: 3)
- `--skip-deploy`: Update repository without deploying files
- `--conflict-resolution <strategy>`: Handle conflicts (skip/overwrite/prompt)

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

Display detailed information about a specific repository, including deployment mappings and file status.

#### Usage
```bash
# Show by repository name
ccpm show owner/repo

# Show by index number (from list command)
ccpm show 1

# Show by repository ID (partial match supported)
ccpm show abc123def
```

#### Features
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

### status

Check repository status with deployment details. Can query specific repositories or show all.

#### Usage
```bash
# Show status of all repositories
ccpm status

# Show status by repository name
ccpm status owner/repo

# Show status by index number
ccpm status 1

# Show status by repository ID
ccpm status abc123def
```

#### Options
- `--json`: Output in JSON format for programmatic use

The status command shows:
- Repository ID and name
- Last update timestamp
- Current sync status
- Number of deployed files
- Any errors or warnings

## Command Overview

### Available Commands

- `register <url>` - Register a new GitHub repository containing Claude tools
- `update [repository]` - Clone/update repositories and deploy tools to ~/.claude/
- `list` - List all registered repositories with their status
- `show <repository>` - Show detailed repository information with deployment mappings
- `status [repository]` - Show repository sync status and health
- `remove <repository>` - Remove a repository and all its deployed files

### Command Flow

1. **Register**: Add a repository URL to track
2. **Update**: Clone the repository and deploy tools
3. **List/Status**: Monitor your repositories
4. **Remove**: Clean up when no longer needed

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

## Environment Variables

See the main [README](../README.md#environment-variables) for available environment variables that affect command behavior, including:
- `CCPM_HOME` - Base directory for tool storage
- `CCPM_CLAUDE_DIR` - Claude directory for deployment
- `CCPM_LOG_LEVEL` - Logging verbosity