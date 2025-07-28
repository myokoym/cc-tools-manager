# CC Tools Manager - Technology Stack

## Architecture

CC Tools Manager follows a simple command-line tool architecture designed for extensibility and ease of use.

### High-Level Design
```
┌─────────────────────┐     ┌────────────────────┐
│   Command Layer     │────▶│  Repository List   │
│  (CLI Interface)    │     │  (repo-list.md)    │
└─────────────────────┘     └────────────────────┘
           │                           │
           ▼                           ▼
┌─────────────────────┐     ┌────────────────────┐
│  Git Operations     │────▶│  GitHub Repos      │
│  (clone/pull)       │     │  (Remote Sources)  │
└─────────────────────┘     └────────────────────┘
           │
           ▼
┌─────────────────────┐     ┌────────────────────┐
│  File Deployment    │────▶│  Local .claude/    │
│  (copy/organize)    │     │  directories       │
└─────────────────────┘     └────────────────────┘
```

## Core Technologies

### Language & Runtime
- **Primary Language**: Bash/Shell scripting (initial implementation)
- **Future Consideration**: Python or Node.js for advanced features
- **Compatibility**: POSIX-compliant for cross-platform support

### Dependencies
- **Git**: For repository cloning and updates
- **Standard Unix Tools**: cp, mv, mkdir, find
- **Optional**: jq for JSON processing (future features)

## Development Environment

### Required Tools
- Git (2.x or higher)
- Bash (4.x or higher recommended)
- Standard Unix utilities

### Development Setup
```bash
# Clone the repository
git clone <repository-url>
cd cc-tools-manager

# Make scripts executable
chmod +x cc-tools-manager

# Add to PATH (optional)
export PATH="$PATH:$(pwd)"
```

## Common Commands

### Core Operations
```bash
# Register a new repository
./cc-tools-manager register <github-url>

# Update all registered repositories
./cc-tools-manager update

# Update specific repository
./cc-tools-manager update <repo-name>

# List registered repositories
./cc-tools-manager list

# Show status of all repositories
./cc-tools-manager status
```

### Management Commands
```bash
# Remove a repository
./cc-tools-manager remove <repo-name>

# Check for updates without applying
./cc-tools-manager check

# Clean orphaned files
./cc-tools-manager clean
```

## Environment Variables

### Configuration
- `CC_TOOLS_HOME`: Base directory for tool storage (default: `~/.cc-tools`)
- `CC_TOOLS_CLAUDE_DIR`: Target claude directory (default: `~/.claude`)
- `CC_TOOLS_LOG_LEVEL`: Logging verbosity (default: `INFO`)

### Runtime Options
- `CC_TOOLS_NO_COLOR`: Disable colored output
- `CC_TOOLS_DRY_RUN`: Preview changes without applying
- `CC_TOOLS_FORCE`: Force operations without confirmation

## Directory Structure

### Tool Storage
```
$CC_TOOLS_HOME/
├── repos/              # Cloned repositories
│   ├── commands/       # Command repositories
│   └── agents/         # Agent repositories
├── cache/              # Temporary files and metadata
└── logs/               # Operation logs
```

### Deployment Targets
```
$CC_TOOLS_CLAUDE_DIR/
├── commands/           # Deployed slash commands
├── agents/             # Deployed AI agents
└── config/             # Tool configurations
```

## Data Management

### Repository Registry
- **Format**: Markdown (repo-list.md)
- **Structure**: Categorized by tool type
- **Metadata**: URL, type, last update, status

### State Tracking
- **Location**: `$CC_TOOLS_HOME/cache/state.json`
- **Contents**: Repository states, versions, deployment status
- **Update Frequency**: After each operation

## Security Considerations

- **Git Authentication**: Use SSH keys or tokens for private repos
- **File Permissions**: Preserve original permissions during deployment
- **Validation**: Verify repository contents before deployment
- **Sandboxing**: Future: isolated execution for untrusted tools