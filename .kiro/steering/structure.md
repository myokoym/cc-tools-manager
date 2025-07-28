# CC Tools Manager - Project Structure

## Root Directory Organization

```
cc-tools-manager/
├── cc-tools-manager*         # Main executable script
├── repo-list.md             # Registry of managed repositories
├── lib/                     # Core functionality modules
├── scripts/                 # Helper scripts and utilities  
├── tests/                   # Test suite
├── docs/                    # Extended documentation
└── .kiro/                   # Kiro spec-driven development
    ├── steering/            # Project steering documents
    └── specs/              # Feature specifications
```

## Subdirectory Structures

### `lib/` - Core Modules
```
lib/
├── core/                    # Core functionality
│   ├── registry.sh         # Repository registry management
│   ├── git-ops.sh          # Git operations wrapper
│   └── deployment.sh       # File deployment logic
├── commands/               # Command implementations
│   ├── register.sh        # Register new repository
│   ├── update.sh          # Update repositories
│   ├── list.sh            # List repositories
│   └── status.sh          # Show repository status
└── utils/                  # Utility functions
    ├── logging.sh         # Logging functionality
    ├── colors.sh          # Terminal colors
    └── validation.sh      # Input validation
```

### `scripts/` - Utilities
```
scripts/
├── install.sh              # Installation script
├── uninstall.sh           # Cleanup script
├── migrate.sh             # Migration utilities
└── dev/                   # Development helpers
    ├── test-runner.sh     # Run test suite
    └── lint.sh            # Code quality checks
```

### `tests/` - Test Suite
```
tests/
├── unit/                   # Unit tests
│   ├── registry_test.sh
│   ├── git_ops_test.sh
│   └── deployment_test.sh
├── integration/            # Integration tests
│   ├── full_cycle_test.sh
│   └── multi_repo_test.sh
└── fixtures/              # Test data
    ├── sample-repos/
    └── mock-claude-dir/
```

## Code Organization Patterns

### Module Structure
Each module follows a consistent pattern:
```bash
#!/usr/bin/env bash
# Module: module_name
# Description: Brief description
# Dependencies: List of required modules

# Source dependencies
source "${LIB_DIR}/utils/logging.sh"

# Module constants
readonly MODULE_NAME_VERSION="1.0.0"

# Public functions
module_name_function() {
    # Implementation
}

# Private functions (prefixed with _)
_module_name_helper() {
    # Implementation
}
```

### Command Pattern
Commands follow a standardized interface:
```bash
# Command structure
cmd_name() {
    local args=("$@")
    
    # Validate arguments
    _validate_cmd_name_args "${args[@]}"
    
    # Execute command logic
    _execute_cmd_name "${args[@]}"
    
    # Return status
    return $?
}
```

## File Naming Conventions

### Scripts and Modules
- **Executable scripts**: `lowercase-with-hyphens`
- **Library modules**: `lowercase_with_underscores.sh`
- **Test files**: `*_test.sh`
- **Configuration**: `.toolrc` or `config.sh`

### Documentation
- **Markdown files**: `lowercase-with-hyphens.md`
- **Steering documents**: `descriptive-name.md` in `.kiro/steering/`
- **Specifications**: `feature-name/` directories in `.kiro/specs/`

### Generated Files
- **Logs**: `YYYY-MM-DD-operation.log`
- **State files**: `*.state.json`
- **Cache files**: `*.cache`

## Import Organization

### Source Order
1. Shell options and error handling
2. Constants and globals
3. External dependencies
4. Internal library modules
5. Function definitions
6. Main execution logic

### Example Import Structure
```bash
#!/usr/bin/env bash
set -euo pipefail

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LIB_DIR="${SCRIPT_DIR}/lib"

# External utilities
source "${LIB_DIR}/utils/logging.sh"
source "${LIB_DIR}/utils/colors.sh"

# Core modules
source "${LIB_DIR}/core/registry.sh"
source "${LIB_DIR}/core/git-ops.sh"

# Command modules
source "${LIB_DIR}/commands/update.sh"
```

## Key Architectural Principles

### 1. Modularity
- Each module has a single responsibility
- Clear interfaces between modules
- Minimal dependencies

### 2. Extensibility
- New commands can be added without modifying core
- Repository types are pluggable
- Deployment strategies are configurable

### 3. Safety First
- All operations are reversible
- Dry-run mode for preview
- Comprehensive validation before actions

### 4. User Experience
- Clear, colored output
- Progress indicators for long operations
- Helpful error messages with recovery suggestions

### 5. Maintainability
- Consistent coding style
- Comprehensive documentation
- Test coverage for critical paths

### 6. Configuration Over Code
- Repository list in simple markdown
- Environment variables for customization
- Minimal hardcoded values

## Future Structure Considerations

### Planned Additions
- `plugins/` - Extension system for custom handlers
- `templates/` - Repository type templates
- `.github/` - CI/CD workflows
- `examples/` - Usage examples and recipes

### Migration Path
As the tool evolves from shell to a higher-level language:
- Maintain backward compatibility
- Gradual module replacement
- Preserve existing file structures