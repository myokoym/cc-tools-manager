# CC Tools Manager

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
npx cc-tools-manager --help
```

### Current: Quick Install (Recommended)

Run the installation script:

```bash
curl -fsSL https://raw.githubusercontent.com/myokoym/cc-tools-manager/main/install.sh | bash
```

When installed via curl, cc-tools-manager will be cloned to:
- Default: `~/.cc-tools/src/cc-tools-manager`
- Custom: `$CC_TOOLS_HOME/src/cc-tools-manager` (if CC_TOOLS_HOME is set)

Or clone and run locally:

```bash
git clone https://github.com/myokoym/cc-tools-manager.git
cd cc-tools-manager
./install.sh
```

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/myokoym/cc-tools-manager.git
cd cc-tools-manager

# Install dependencies
npm install

# Build the project
npm run build

# Create global link
npm link
```

After installation, you can use the command globally:

```bash
cc-tools-manager --help
```

### Development Setup

For development with hot reload:

```bash
git clone https://github.com/myokoym/cc-tools-manager.git
cd cc-tools-manager
npm install
npm run dev
```

### Uninstallation

To uninstall cc-tools-manager:

```bash
# Remove global command
npm unlink -g cc-tools-manager

# The installation directory will be shown during install
# You can manually remove it if needed
```

Note: For safety reasons, the uninstall process does not automatically remove directories. Please verify the path before manual deletion.

## Usage

### Register Repository

Register a GitHub Claude Code tools repository:

```bash
cc-tools-manager register https://github.com/owner/repo

# With options
cc-tools-manager register https://github.com/owner/repo \
  --name "my-tools" \
  --tag "commands"
```

### Update Repository

Update registered repositories to the latest version:

```bash
# Update all repositories
cc-tools-manager update

# Update specific repository by name
cc-tools-manager update owner/repo

# Update specific repository by number (from list output)
cc-tools-manager update 2

# Specify concurrent processing (default: 3)
cc-tools-manager update --concurrent 5

# Skip deployment
cc-tools-manager update --skip-deploy
```

### List Repositories

Display registered repositories:

```bash
# Basic display
cc-tools-manager list

# Verbose display (with deployment file tree)
cc-tools-manager list --verbose
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

**Note**: You can use the numbers from the list output with other commands (update, remove, status).

📖 **See [Command Reference](docs/commands.md) for detailed information about the enhanced list command and other recent improvements.**

### Check Repository Status

Check detailed status of a specific repository:

```bash
# Specific repository
cc-tools-manager status owner/repo

# All repositories
cc-tools-manager status

# Output in JSON format
cc-tools-manager status --json
```

### Remove Repository

Remove a registered repository:

```bash
# Remove with confirmation
cc-tools-manager remove owner/repo

# Remove by number
cc-tools-manager remove 2

# Remove without confirmation
cc-tools-manager remove owner/repo --force
```

## Directory Structure

CC Tools Manager uses the following directory structure:

```
~/.cc-tools/
├── src/                # Source installations
│   └── cc-tools-manager/  # CC Tools Manager itself (when installed via curl)
├── repos/              # Cloned repositories
│   ├── owner-repo1/
│   └── owner-repo2/
├── cache/              # Cache and metadata
│   └── state.json      # Sync state
├── config/             # Configuration files
│   └── settings.json   # Custom settings
└── logs/               # Log files
    └── cc-tools.log

~/.claude/              # Deployment destination
├── commands/           # Slash commands
├── agents/             # AI agents
└── hooks/              # Hook configurations
```

## Deployment Patterns

Files in repositories are deployed according to the following patterns:

### 1. .claude Prefix Pattern
```
repository/.claude/commands/foo.md → ~/.claude/commands/foo.md
repository/.claude/agents/bar.md → ~/.claude/agents/bar.md
```

### 2. Direct Pattern (without .claude)
```
repository/commands/foo.md → ~/.claude/commands/foo.md
repository/agents/bar.md → ~/.claude/agents/bar.md
```

Directory structure is preserved:
```
repository/commands/utils/helper.md → ~/.claude/commands/utils/helper.md
```

## Environment Variables

Environment variables to customize behavior:

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `CC_TOOLS_HOME` | Base directory for tool storage | `~/.cc-tools` |
| `CC_TOOLS_CLAUDE_DIR` | Claude directory for deployment | `~/.claude` |
| `CC_TOOLS_LOG_LEVEL` | Log level (DEBUG, INFO, WARN, ERROR) | `INFO` |
| `CC_TOOLS_NO_COLOR` | Disable color output | - |
| `CC_TOOLS_DRY_RUN` | Preview changes without applying | - |
| `CC_TOOLS_FORCE` | Skip confirmation prompts | - |

Usage examples:
```bash
# Use custom directory
CC_TOOLS_HOME=/custom/path cc-tools-manager update

# Enable debug logging
CC_TOOLS_LOG_LEVEL=DEBUG cc-tools-manager update

# Dry run
CC_TOOLS_DRY_RUN=1 cc-tools-manager update
```

## Conflict Resolution

Configure how to handle file conflicts:

```bash
# Default: prompt for confirmation
cc-tools-manager update

# Skip existing files
cc-tools-manager update --conflict-resolution skip

# Overwrite existing files
cc-tools-manager update --conflict-resolution overwrite
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
chmod -R u+w ~/.cc-tools
```

### Check Logs

View detailed logs:

```bash
# Display log file
tail -f ~/.cc-tools/logs/cc-tools.log

# Run in debug mode
CC_TOOLS_LOG_LEVEL=DEBUG cc-tools-manager update
```

## Development

### Requirements

- Node.js 18 or higher
- Git 2.x or higher
- TypeScript 5.x

### Setup

```bash
# Clone repository
git clone https://github.com/myokoym/cc-tools-manager.git
cd cc-tools-manager

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
cc-tools-manager/
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