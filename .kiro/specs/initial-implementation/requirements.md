# Requirements Document

## Introduction

CC Tools Manager is a CLI tool that centrally manages Claude Code-related tools (commands, agents, and other extensions). By automatically syncing tools from GitHub repositories and properly placing them in local `.claude/` directories, it enables developers and teams to efficiently manage and share Claude Code tools.

This tool provides unified management of various tools from multiple repositories, offering features necessary for tool management such as automated updates, conflict resolution, and directory structure preservation.

## Requirements

### Requirement 1: Repository Registration Management
**User Story:** As a developer, I want to register and manage GitHub claude-code tool repositories so that I can easily track and update my favorite tools.

#### Acceptance Criteria

1. WHEN a user executes the register command with a valid GitHub URL THEN the system saves the repository information to repositories.json
2. WHEN a user specifies an invalid URL THEN the system displays an error message and rejects the registration
3. WHEN specifying an already registered repository URL THEN the system displays a duplicate error
4. WHEN a repository is successfully registered THEN the system displays a success message with the registered repository name
5. IF the repositories.json file does not exist THEN the system creates a new one and saves the repository information
6. WHEN a user executes the list command THEN the system displays all registered repositories
7. WHEN a user executes the remove command with a repository name THEN the system removes the repository from registration

### Requirement 2: Git Operations and Repository Synchronization
**User Story:** As a developer, I want to fetch the latest tools from registered repositories so that I can always use the latest versions of tools.

#### Acceptance Criteria

1. WHEN a user executes the update command THEN the system updates all registered repositories with git pull
2. WHEN executing the update command with a specific repository name THEN the system updates only the specified repository
3. IF a repository does not exist locally THEN the system executes git clone to fetch the repository
4. WHILE updating repositories THE SYSTEM SHALL display a progress indicator
5. WHEN a Git operation fails THEN the system presents an error message and recovery methods
6. IF there is no network connection THEN the system displays an appropriate error message and explains offline limitations
7. WHEN the update is complete THEN the system displays a summary of the number of updated files and changes

### Requirement 3: File Deployment
**User Story:** As a developer, I want to automatically deploy tool files from repositories to the appropriate `.claude/` directories so that I don't need to manually copy files.

#### Acceptance Criteria

1. WHEN a repository has a `.claude/commands/` directory THEN the system copies its contents to `~/.claude/commands/`
2. WHEN a repository has a `commands/` directory (without .claude prefix) THEN the system copies its contents to `~/.claude/commands/`
3. WHILE deploying files THE SYSTEM SHALL preserve directory structure (e.g., `commands/kiro/spec-init.md` → `~/.claude/commands/kiro/spec-init.md`)
4. WHEN a file with the same name already exists AND conflictResolution is set to 'prompt' THEN the system asks the user for overwrite confirmation
5. IF conflictResolution is set to 'skip' THEN the system skips existing files
6. IF conflictResolution is set to 'overwrite' THEN the system overwrites existing files
7. WHEN finding files that match deployment patterns (such as `**/*.md`) THEN the system deploys all matching files
8. WHERE file permissions are set THE SYSTEM SHALL preserve original permissions when copying

### Requirement 4: CLI Interface
**User Story:** As a developer, I want to manage tools with intuitive CLI commands so that I can efficiently execute tool management tasks.

#### Acceptance Criteria

1. WHEN a user specifies the help option (--help) THEN the system displays available commands and options
2. WHEN an invalid command is entered THEN the system displays an error message and correct usage
3. WHERE the terminal supports color output THE SYSTEM SHALL display success in green, errors in red, and warnings in yellow
4. IF the CC_TOOLS_NO_COLOR environment variable is set THEN the system disables color output
5. WHEN the --dry-run option is specified THEN the system previews execution content without making actual changes
6. WHEN the interactive command is executed THEN the system guides the user in interactive mode
7. WHILE executing long-running operations THE SYSTEM SHALL display a progress indicator (ora)

### Requirement 5: Configuration Management
**User Story:** As an administrator, I want to customize tool behavior with environment variables and configuration files so that I can adjust operations to meet team needs.

#### Acceptance Criteria

1. WHEN the CC_TOOLS_HOME environment variable is set THEN the system uses that value as the base directory for tool storage
2. IF the CC_TOOLS_HOME environment variable is not set THEN the system uses `~/.cc-tools` as the default
3. WHEN the CC_TOOLS_CLAUDE_DIR environment variable is set THEN the system uses that value as the deployment destination
4. IF the CC_TOOLS_CLAUDE_DIR environment variable is not set THEN the system uses `~/.claude` as the default
5. WHEN the CC_TOOLS_LOG_LEVEL environment variable is set THEN the system outputs logs at the specified level (DEBUG, INFO, WARN, ERROR)
6. WHERE a configuration file (~/.cc-tools/config/settings.json) exists THE SYSTEM SHALL load and apply its settings
7. WHEN the CC_TOOLS_FORCE environment variable is set THEN the system skips confirmation prompts and executes operations

### Requirement 6: Error Handling and Logging
**User Story:** As a developer, I want to see clear error messages and logs when problems occur so that I can quickly resolve issues.

#### Acceptance Criteria

1. WHEN an error occurs THEN the system displays a human-readable clear error message
2. WHEN an error occurs THEN the system suggests possible recovery methods or next steps
3. WHERE a log file (~/.cc-tools/logs/cc-tools.log) is configured THE SYSTEM SHALL record all operations with timestamps
4. IF Git authentication fails THEN the system guides SSH key or token configuration
5. WHEN a file system permission error occurs THEN the system explains required permissions and correction methods
6. WHILE executing operations if an error occurs THE SYSTEM SHALL rollback partial changes to maintain consistency
7. WHEN debug mode is enabled THEN the system displays detailed stack traces

### Requirement 7: State Management and Cache
**User Story:** As a developer, I want to check tool state and update history so that I can understand which tools were updated when.

#### Acceptance Criteria

1. WHEN the status command is executed THEN the system displays the current state of all repositories
2. WHERE a state.json file exists THE SYSTEM SHALL maintain last update timestamps and version information for each repository
3. WHEN the check command is executed THEN the system checks and displays updatable repositories (without performing actual updates)
4. IF cached metadata is corrupted THEN the system automatically regenerates it
5. WHEN the clean command is executed THEN the system removes orphaned files and unnecessary cache
6. WHILE updating repository information THE SYSTEM SHALL atomically update state.json to maintain consistency
7. WHEN incremental updates are enabled THEN the system compares file hashes and updates only changed files