# CC Tools Manager - Project Structure

## Root Directory Structure

```
cc-tools-manager/
├── package.json             # Project definition and scripts
├── tsconfig.json           # TypeScript configuration
├── .eslintrc.js            # ESLint configuration
├── .prettierrc             # Prettier configuration
├── jest.config.js          # Jest configuration
├── README.md               # Project documentation
├── repositories.json       # Dynamically managed repository information (initially doesn't exist)
├── src/                    # Source code
├── dist/                   # Build artifacts
├── tests/                  # Test suites
├── docs/                   # Detailed documentation
└── .kiro/                  # Kiro spec-driven development
    ├── steering/           # Project steering documents
    └── specs/              # Feature specifications
```

## Subdirectory Structure

### `src/` - Source Code
```
src/
├── index.ts                # Entry point
├── cli.ts                  # CLI setup (Commander.js)
├── commands/               # Command implementations
│   ├── register.ts        # Repository registration
│   ├── update.ts          # Repository update
│   ├── list.ts            # Repository listing
│   ├── status.ts          # Status display
│   ├── remove.ts          # Repository removal
│   ├── clean.ts           # Cleanup
│   └── interactive.ts     # Interactive mode
├── core/                   # Core functionality
│   ├── registry.ts        # Repository registry management
│   ├── git-manager.ts     # Git operations manager
│   ├── deployment.ts      # File deployment (automatic routing via pattern matching)
│   └── config.ts          # Configuration management
├── utils/                  # Utilities
│   ├── logger.ts          # Logging (Winston)
│   ├── file-system.ts     # File system operations
│   ├── validators.ts      # Input validation
│   └── helpers.ts         # Helper functions
├── types/                  # TypeScript type definitions
│   ├── index.ts           # Common types
│   ├── repository.ts      # Repository-related types
│   └── config.ts          # Configuration-related types
└── constants/             # Constant definitions
    ├── paths.ts           # Path constants
    └── messages.ts        # Message constants
```

### `tests/` - Test Suites
```
tests/
├── unit/                   # Unit tests
│   ├── commands/          # Command tests
│   │   ├── register.test.ts
│   │   └── update.test.ts
│   ├── core/              # Core functionality tests
│   │   ├── registry.test.ts
│   │   └── git-manager.test.ts
│   └── utils/             # Utility tests
├── integration/           # Integration tests
│   ├── full-cycle.test.ts # Complete workflow tests
│   └── multi-repo.test.ts # Multiple repository tests
├── e2e/                   # End-to-end tests
│   └── cli.test.ts        # CLI comprehensive tests
└── fixtures/              # Test data
    ├── mock-repos/        # Mock repositories
    └── test-config/       # Test configurations
```

### `docs/` - Documentation
```
docs/
├── getting-started.md      # Quick start guide
├── commands.md            # Command reference
├── configuration.md       # Configuration guide
├── development.md         # Developer guide
└── api/                   # API documentation (TypeDoc)
```

## Code Organization Patterns

### Module Structure
Each module follows a consistent pattern:

```typescript
// src/core/registry.ts
import { Repository, RegistryConfig } from '../types';
import { Logger } from '../utils/logger';
import { REGISTRY_PATH } from '../constants/paths';

export class Registry {
  private logger: Logger;
  private config: RegistryConfig;
  
  constructor(config: RegistryConfig) {
    this.logger = new Logger('Registry');
    this.config = config;
  }
  
  // Public methods
  async register(url: string): Promise<Repository> {
    // Implementation
  }
  
  // Private methods
  private validateUrl(url: string): boolean {
    // Implementation
  }
}
```

### Command Pattern
Commands follow a standardized interface:

```typescript
// src/commands/register.ts
import { Command } from 'commander';
import { Registry } from '../core/registry';
import { Logger } from '../utils/logger';

export function registerCommand(program: Command): void {
  program
    .command('register <url>')
    .description('Register a new repository')
    .option('-t, --type <type>', 'Repository type', 'auto')
    .action(async (url: string, options) => {
      const logger = new Logger('register');
      
      try {
        const registry = new Registry();
        await registry.register(url);
        logger.success('Repository registered successfully');
      } catch (error) {
        logger.error('Registration failed', error);
        process.exit(1);
      }
    });
}
```

## File Naming Conventions

### Source Files
- **TypeScript files**: `kebab-case.ts`
- **Test files**: `*.test.ts` or `*.spec.ts`
- **Type definitions**: `types/*.ts`
- **Constants**: `UPPER_SNAKE_CASE` in `constants/*.ts`

### Configuration Files
- **Project configuration**: `*.config.js` or `.*rc`
- **Environment configuration**: `.env.*`
- **Git configuration**: `.gitignore`, `.gitattributes`

### Documentation
- **Markdown files**: `kebab-case.md`
- **Steering documents**: `.kiro/steering/feature-name.md`
- **Specifications**: `.kiro/specs/feature-name/`

## Import Organization

### Import Order
1. Node.js built-in modules
2. External packages
3. Internal modules (absolute paths)
4. Internal modules (relative paths)
5. Type definitions

### Import Examples
```typescript
// Node.js built-ins
import { promises as fs } from 'fs';
import path from 'path';

// External packages
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

// Internal modules (relative from src/)
import { Registry } from '../core/registry';
import { Logger } from '../utils/logger';
import { validateUrl } from '../utils/validators';

// Type definitions
import type { Repository, RegistryConfig } from '../types';
```

## Key Architecture Principles

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
- Clear, colorized output
- Progress indicators for long operations
- Helpful error messages with recovery suggestions

### 5. Maintainability
- Consistent coding style (ESLint + Prettier)
- Comprehensive documentation (JSDoc + TypeDoc)
- Test coverage for critical paths

### 6. Convention over Configuration
- Simple markdown for repository lists
- Environment variables for customization
- Minimal hardcoded values

## NPX Support Implementation

### package.json Configuration
```json
{
  "name": "cc-tools-manager",
  "version": "1.0.0",
  "bin": {
    "cc-tools-manager": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "prepublishOnly": "npm run build"
  }
}
```

### Entry Point
```typescript
#!/usr/bin/env node
// src/index.ts
import { cli } from './cli';

cli.parse(process.argv);
```

## Future Structure Considerations

### Planned Additions
- `plugins/` - Extension system for custom handlers
- `templates/` - Repository type templates
- `.github/` - CI/CD workflows
- `examples/` - Usage examples and recipes

### Migration Path
- Maintain backward compatibility
- Gradual module replacement
- Preserve existing file structures

## Related Information

- **Runtime Directory Structure**: For directories used at runtime (`~/.cc-tools/`, `~/.claude/`, etc.), see [tech.md](./tech.md#runtime-directory-structure).