# Claude Code Package Manager (ccpm)

[English](README.md) | [日本語](README.ja.md)

A CLI tool for centralized management of Claude Code related tools (commands, agents, and other extensions). It automatically syncs tools from GitHub repositories and properly deploys them to your local `.claude/` directory.

## Features

- 🚀 Easy execution via NPX
- 📦 Automatic tool synchronization from GitHub repositories
- 🔄 Fast updates with parallel processing
- 🎨 Clear colored output and progress display
- 📂 Deployment with preserved directory structure
- ⚙️ Flexible configuration via environment variables

## Installation

> **Note**: This package is not yet published to npm. NPX commands shown in examples will be available after npm publication. For now, please use one of the local installation methods below.

### Future: Run via NPX (After npm publication)

Once published to npm, you'll be able to run directly without installation:

```bash
npx ccpm --help
```

### Current: Quick Install (Recommended)

Run the installation script:

```bash
curl -fsSL https://raw.githubusercontent.com/myokoym/claude-code-package-manager/main/install.sh | bash
```

When installed via curl, ccpm will be cloned to:
- Default: `~/.ccpm/src/claude-code-package-manager`
- Custom: `$CCPM_HOME/src/claude-code-package-manager` (if CCPM_HOME is set)

Or clone and run locally:

```bash
git clone https://github.com/myokoym/claude-code-package-manager.git
cd claude-code-package-manager
./install.sh  # or: bash install.sh
```

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/myokoym/claude-code-package-manager.git
cd claude-code-package-manager

# Install dependencies
npm install

# Build the project
npm run build

# Create global link
npm link
```

After installation, you can use the command globally:

```bash
ccpm --help
```

### Development Setup

For development with hot reload:

```bash
git clone https://github.com/myokoym/claude-code-package-manager.git
cd claude-code-package-manager
npm install
npm run dev
```

### Uninstallation

To uninstall ccpm:

```bash
# Remove global command
npm unlink -g claude-code-package-manager

# The installation directory will be shown during install
# You can manually remove it if needed
```

Note: For safety reasons, the uninstall process does not automatically remove directories. Please verify the path before manual deletion.

## Usage

### Register Repository

Register a GitHub Claude Code tools repository:

```bash
# Standard registration (auto-detects structure)
ccpm register https://github.com/owner/repo

# Auto-detected directory structures:
# - .claude/agents/, .claude/commands/, .claude/hooks/
# - agents/, commands/, hooks/

# Type specification (only for non-standard repositories)
# Use --type when ALL files in the repository should be treated as a specific type
ccpm register https://github.com/owner/my-scripts --type commands
ccpm register https://github.com/owner/ai-helpers --type agents
```

### Update Repository

Update registered repositories to the latest version:

```bash
# Update all repositories
ccpm update

# Update specific repository by name
ccpm update owner/repo

# Update specific repository by number (from list output)
ccpm update 2

# Automatically deploy files after update (skips deployment prompt)
ccpm update --install

# Force deployment without prompting
ccpm update --force

# Skip deployment entirely
ccpm update --skip-deploy
```

### Install Command

Deploy files from registered repositories without updating the git repository:

```bash
# Install specific repository
ccpm install owner/repo

# Install by number (from list output)
ccpm install 1

# Install all registered repositories
ccpm install --all

# Force install without confirmation prompts
ccpm install --force

# Interactive mode (prompt before overwriting each file)
ccpm install --interactive
```

The `install` command deploys files to `.claude/` directory without performing a git pull. This is useful when you want to deploy files from an already-updated repository or restore previously deployed files.

### Uninstall Command

Remove deployed files from `.claude` directory:

```bash
# Uninstall specific repository files
ccpm uninstall owner/repo

# Uninstall by number
ccpm uninstall 1

# Uninstall all repositories
ccpm uninstall --all

# Force uninstall without confirmation
ccpm uninstall --force

# Dry run (show what would be removed)
ccpm uninstall --dry-run
```

The `uninstall` command removes all deployed files from the `.claude/` directory but keeps the repository registered and the local git repository intact.

### Unregister Command

Remove repository from registry (keeps deployed files):

```bash
# Unregister specific repository
ccpm unregister owner/repo

# Unregister by number
ccpm unregister 1

# Unregister all repositories
ccpm unregister --all

# Force unregister without confirmation
ccpm unregister --force
```

The `unregister` command removes the repository from the registry but leaves deployed files in `.claude/` directory intact. This is useful when you want to stop tracking a repository but keep using its deployed tools.

### List Repositories

Display registered repositories:

```bash
# Basic display
ccpm list

# Verbose display (with deployment file tree)
ccpm list --verbose
```

Example output:
```
Registered Repositories:

#   Name                Status              Deployments    Registered          
────────────────────────────────────────────────────────────────────────────
1   owner/repo1         ● Active                      5    2025/1/15           
2   owner/repo2         ✗ Error                       0    2025/1/10           
3   owner/repo3         ○ Not Initialized             0    2025/1/20           

Total: 3 repositories
```

**Note**: You can use the numbers from the list output with other commands (update, install, uninstall, unregister, show).

### Show Repository Details

Display detailed information about a specific repository:

```bash
# Show by repository name
ccpm show owner/repo

# Show by number (from list output)
ccpm show 1

# Show deployment mappings
ccpm show owner/repo --verbose
```

The show command displays:
- Repository information (URL, status, type)
- Deployment mappings (source → target paths)
- File deployment status
- Summary statistics

📖 **See [Command Reference](docs/commands.md) for detailed information about the enhanced list command and other recent improvements.**

### Show Repository Information

Display repository information and status:

```bash
# Show all repositories summary
ccpm show

# Show specific repository details
ccpm show owner/repo

# Output in different formats
ccpm show --format json
ccpm show owner/repo --format yaml
```

### Remove Repository

To remove a repository, you have two options:

**Uninstall** - Remove deployed files but keep the repository registered:
```bash
ccpm uninstall owner/repo
```

**Unregister** - Remove from registry but keep deployed files:
```bash
ccpm unregister owner/repo
```

## Command Comparison

Understanding the differences between similar commands:

| Command | Repository Registry | Git Repository | Deployed Files |
|---------|-------------------|----------------|----------------|
| `update` | Keeps | Updates (git pull) | Redeploys (with prompt) |
| `update --install` | Keeps | Updates (git pull) | Deploys automatically |
| `install` | Keeps | No change | Deploys (with prompt) |
| `uninstall` | Keeps | No change | Removes |
| `unregister` | Removes | No change | Keeps (or removes with prompt) |

### When to use each command:

- **`update`**: Get latest changes from repository and optionally deploy
- **`update --install`**: Get latest changes and automatically deploy files
- **`install`**: Deploy files from current repository state without updating
- **`uninstall`**: Remove deployed files but keep repository registered
- **`unregister`**: Stop tracking repository (with option to remove deployed files)

## Directory Structure

CC Tools Manager uses the following directory structure:

```
~/.ccpm/
├── src/                # Source installations
│   └── claude-code-package-manager/  # CC Tools Manager itself (when installed via curl)
├── repos/              # Cloned repositories
│   ├── owner-repo1/
│   └── owner-repo2/
├── cache/              # Cache and metadata
│   └── state.json      # Sync state
├── config/             # Configuration files
│   └── settings.json   # Custom settings
└── logs/               # Log files
    └── ccpm.log

~/.claude/              # Deployment destination
├── commands/           # Slash commands
├── agents/             # AI agents
└── hooks/              # Hook configurations
```

## Deployment Patterns

Files in repositories are deployed according to the following patterns:

### 1. Standard Pattern (.claude structure)
```
repository/.claude/commands/foo.md → ~/.claude/commands/foo.md
repository/.claude/agents/bar.md → ~/.claude/agents/bar.md
```

### 2. Direct Pattern (without .claude)
```
repository/commands/foo.md → ~/.claude/commands/foo.md
repository/agents/bar.md → ~/.claude/agents/bar.md
```

### 3. Type-based Pattern (--type option)
When registering with `--type`, the repository root is mapped directly:
```bash
# Registration
ccpm register https://github.com/owner/agents-repo --type agents

# Deployment mapping
repository/marketing.md → ~/.claude/agents/marketing.md
repository/engineering/backend.md → ~/.claude/agents/engineering/backend.md
repository/design/ → ~/.claude/agents/design/
```

**Type-based deployment rules:**
- Only directories and `.md` files are deployed
- Files starting with `.` are ignored (e.g., `.gitignore`, `.env`)
- Files starting with uppercase letters are ignored (e.g., `README.md`, `LICENSE`)
- Common development files are automatically excluded:
  - `node_modules/`, `.git/`, `dist/`, `build/`
  - Configuration files (`.gitignore`, `.github/`, etc.)

Directory structure is preserved:
```
repository/commands/utils/helper.md → ~/.claude/commands/utils/helper.md
```

## Environment Variables

Environment variables to customize behavior:

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `CCPM_HOME` | Base directory for tool storage | `~/.ccpm` |
| `CCPM_CLAUDE_DIR` | Claude directory for deployment | `~/.claude` |
| `CCPM_LOG_LEVEL` | Log level (DEBUG, INFO, WARN, ERROR) | `ERROR` |
| `CCPM_LOG_CONSOLE` | Enable console logging (true/false) | `false` |
| `CCPM_LOG_FILE` | Enable file logging (true/false) | `true` |
| `CCPM_NO_COLOR` | Disable color output | - |
| `CCPM_DRY_RUN` | Preview changes without applying | - |
| `CCPM_FORCE` | Skip confirmation prompts | - |

Usage examples:
```bash
# Use custom directory
CCPM_HOME=/custom/path ccpm update

# Enable debug logging
CCPM_LOG_LEVEL=DEBUG ccpm update

# Dry run
CCPM_DRY_RUN=1 ccpm update
```

## Conflict Resolution

Configure how to handle file conflicts:

```bash
# Default: prompt for confirmation
ccpm update

# Skip existing files
ccpm update --conflict-resolution skip

# Overwrite existing files
ccpm update --conflict-resolution overwrite
```

## Performance Notes

If you experience slow startup times (>1 second), try:

1. **Use direct node execution**: `node /path/to/claude-code-package-manager/dist/index.js` instead of global command
2. **Use npx**: `npx ccpm` can be faster than globally installed version
3. **Check your environment**: Some environments (WSL, nvm) may add overhead to command startup

For best performance:
```bash
# Create an alias in your shell configuration
alias cctm='node /path/to/claude-code-package-manager/dist/index.js'
```

## Troubleshooting

### Git Authentication Errors

For private repositories, SSH key or access token configuration is required:

```bash
# Use SSH key
git config --global url."git@github.com:".insteadOf "https://github.com/"

# Use access token
git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
```

### Permission Errors

Check file write permissions:

```bash
# Fix permissions
chmod -R u+w ~/.claude
chmod -R u+w ~/.ccpm
```

### Check Logs

View detailed logs:

```bash
# Display log file
tail -f ~/.ccpm/logs/cc-tools.log

# Run in debug mode
CCPM_LOG_LEVEL=DEBUG ccpm update
```

## Development

### Requirements

- Node.js 18 or higher
- Git 2.x or higher
- TypeScript 5.x

### Setup

```bash
# Clone repository
git clone https://github.com/myokoym/claude-code-package-manager.git
cd claude-code-package-manager

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build
npm run build
```

### Project Structure

```
claude-code-package-manager/
├── src/
│   ├── commands/       # CLI commands
│   ├── core/           # Core services
│   ├── utils/          # Utilities
│   └── types/          # TypeScript type definitions
├── tests/              # Test suite
└── dist/               # Build artifacts
```

## License

MIT License

## Contributing

Pull requests are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting a PR.

**Note for contributors**: Documentation and code should be written in English only. Japanese translations are maintained separately by the project team.

## Credits

CC Tools Manager was created to simplify tool management for the Claude Code community.