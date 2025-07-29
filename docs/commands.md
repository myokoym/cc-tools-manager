# CC Tools Manager Commands Reference

[English](commands.md) | [日本語](commands.ja.md)

## Command Details

### list

Display registered repositories with their status and deployment information.

#### Basic Usage

```bash
cc-tools-manager list
```

Shows a table with:
- Repository name
- Current status (Active, Error, Not Initialized)
- Number of deployments
- Registration date

#### Verbose Mode

```bash
cc-tools-manager list --verbose
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

Update repositories with enhanced deployment tracking.

#### Features
- Parallel processing for faster updates
- Detailed deployment tracking with file-level granularity
- Automatic cleanup of orphaned files
- Progress indication for each operation

#### Options
- `--concurrent <number>`: Set number of parallel operations (default: 3)
- `--skip-deploy`: Update repository without deploying files
- `--conflict-resolution <strategy>`: Handle conflicts (skip/overwrite/prompt)

### remove

Remove a repository and clean up all associated files.

#### Enhanced Features
- Tracks and removes all deployed files
- Cleans up empty directories
- Shows detailed removal progress
- Confirms successful cleanup

Example:
```bash
cc-tools-manager remove owner/repo

# Output:
Removing repository owner/repo...
✓ Removed deployed file: ~/.claude/commands/build.md
✓ Removed deployed file: ~/.claude/commands/test.md
✓ Cleaned up empty directory: ~/.claude/commands
✓ Repository removed successfully
```

### status

Check repository status with deployment details.

#### Options
- `--json`: Output in JSON format for programmatic use

The status command shows:
- Last update timestamp
- Current sync status
- Number of deployed files
- Any errors or warnings

## Recent Enhancements

### Version 1.0.0 Updates

1. **Tree View for Deployments**: The `list --verbose` command now displays deployed files in a tree structure, making it easy to visualize the file organization.

2. **Enhanced Deployment Tracking**: All commands now track deployments at the file level, providing better visibility and control.

3. **WSL Compatibility**: Fixed readline hanging issues in WSL environments for better cross-platform support.

4. **Improved Error Handling**: More detailed error messages and recovery suggestions.

## Environment Variables

See the main [README](../README.md#environment-variables) for available environment variables that affect command behavior.