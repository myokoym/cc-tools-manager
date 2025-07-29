# CC Tools Manager - Technology Stack

## Architecture

CC Tools Manager is designed as a Node.js-based CLI tool that can be easily installed and executed via NPX.

### High-Level Design
```
┌─────────────────────┐     ┌────────────────────┐
│   CLI Interface     │────▶│ Repository Registry│
│   (Commander.js)    │     │ (repositories.json)│
└─────────────────────┘     └────────────────────┘
           │                           │
           ▼                           ▼
┌─────────────────────┐     ┌────────────────────┐
│    Git Operations   │────▶│  GitHub Repository │
│  (simple-git)       │     │  (Remote Source)   │
└─────────────────────┘     └────────────────────┘
           │
           ▼
┌─────────────────────┐     ┌────────────────────┐
│  File System Layer  │────▶│  Local .claude/    │
│  (fs-extra)         │     │  Directory         │
└─────────────────────┘     └────────────────────┘
```

## Core Technologies

### Language and Runtime
- **Primary Language**: TypeScript/JavaScript
- **Runtime**: Node.js (16.x or higher)
- **Package Manager**: npm/yarn
- **Distribution Method**: Supports execution via NPX

### Key Dependencies
```json
{
  "dependencies": {
    "commander": "^11.0.0",      // CLI framework
    "simple-git": "^3.19.0",     // Git operations
    "fs-extra": "^11.1.0",       // File system operations
    "chalk": "^5.3.0",           // Terminal colors
    "ora": "^7.0.0",            // Progress indicators
    "inquirer": "^9.2.0",        // Interactive prompts
    "winston": "^3.10.0"         // Logging
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "jest": "^29.0.0"
  }
}
```

## Development Environment

### Required Tools
- Node.js (16.x or higher)
- Git (2.x or higher)
- npm or yarn

### Development Setup
```bash
# Clone repository
git clone <repository-url>
cd cc-tools-manager

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Global installation (optional)
npm link
```

### Execution via NPX
```bash
# Run directly without installation
npx cc-tools-manager update

# Run specific version
npx cc-tools-manager@latest register <github-url>
```

## Common Commands

### Core Operations
```bash
# Register a new repository
npx cc-tools-manager register <github-url>

# Update all registered repositories
npx cc-tools-manager update

# Update specific repository
npx cc-tools-manager update <repo-name>

# List registered repositories
npx cc-tools-manager list

# Show status of all repositories
npx cc-tools-manager status
```

### Management Commands
```bash
# Remove repository
npx cc-tools-manager remove <repo-name>

# Check for updates (without applying)
npx cc-tools-manager check

# Clean up orphaned files
npx cc-tools-manager clean

# Interactive mode
npx cc-tools-manager interactive
```

## Environment Variables

### Configuration
- `CC_TOOLS_HOME`: Base directory for tool storage (default: `~/.cc-tools`)
- `CC_TOOLS_CLAUDE_DIR`: Target claude directory (default: `~/.claude`)
- `CC_TOOLS_LOG_LEVEL`: Log verbosity (default: `INFO`)
- `CC_TOOLS_CONFIG`: Path to custom configuration file

### Runtime Options
- `CC_TOOLS_NO_COLOR`: Disable color output
- `CC_TOOLS_DRY_RUN`: Preview changes without applying
- `CC_TOOLS_FORCE`: Force operations without confirmation
- `CC_TOOLS_PARALLEL`: Enable parallel processing

## Runtime Directory Structure

### Tool Storage (in user home)
Directories used at runtime, separate from the project source code.

```
$CC_TOOLS_HOME/
├── repos/              # Cloned repositories (stored flat)
│   ├── repo-name-1/
│   ├── repo-name-2/
│   └── repo-name-3/
├── cache/              # Temporary files and metadata
├── config/             # Configuration files
└── logs/               # Operation logs
```

### Deployment Target
```
$CC_TOOLS_CLAUDE_DIR/
├── commands/           # Deployed slash commands
├── agents/             # Deployed AI agents
├── hooks/              # Hook configurations
└── config/             # Tool configurations
```

## Data Management

### Repository Registry
- **Format**: JSON (repositories.json)
- **Structure**: List of dynamically registered repositories
- **Metadata**: URL, name, last update, deployment information

### State Tracking
- **Location**: `$CC_TOOLS_HOME/cache/state.json`
- **Content**: Repository states, versions, deployment status
- **Update Frequency**: After each operation

### Configuration File
```typescript
interface Config {
  version: string;
  repositories: Repository[];
  settings: {
    autoUpdate: boolean;
    parallelOperations: boolean;
    conflictResolution: 'skip' | 'overwrite' | 'prompt';
  };
  mappings: {
    [repoName: string]: {
      source: string;
      target: string;
    }[];
  };
}
```

## Security Considerations

- **Git Authentication**: Use SSH keys or tokens for private repositories
- **File Permissions**: Preserve original permissions during deployment
- **Validation**: Validate repository content before deployment
- **Sandboxing**: Isolated execution for untrusted tools (future feature)
- **Dependency Audit**: Regular security checks via npm audit

## Deployment Patterns

### Supported Directory Structures
1. **.claude Prefix Pattern**
   - `.claude/commands/*` → `~/.claude/commands/`
   - `.claude/agents/*` → `~/.claude/agents/`
   - `.claude/hooks/*` → `~/.claude/hooks/`
   - `.claude/config/*` → `~/.claude/config/`
   
2. **Direct Pattern** (without .claude)
   - `commands/*` → `~/.claude/commands/`
   - `agents/*` → `~/.claude/agents/`
   - `hooks/*` → `~/.claude/hooks/`
   
3. **Filename-based Pattern** (future)
   - `*.command.md` → `~/.claude/commands/`
   - `*.agent.md` → `~/.claude/agents/`

### Deployment Processing
- Pattern matching files within repositories
- **Deploy with preserved directory structure**
  - Example: `.claude/commands/kiro/spec-init.md` → `~/.claude/commands/kiro/spec-init.md`
  - Example: `commands/utils/helper.md` → `~/.claude/commands/utils/helper.md`
- Deploy to both locations if matching multiple patterns
- Conflict handling options (skip/overwrite/prompt)

## Performance Optimization

- **Parallel Processing**: Process multiple repositories simultaneously
- **Incremental Updates**: Update only changed files
- **Caching**: Cache repository metadata and file hashes
- **Lazy Loading**: Dynamically load only required modules