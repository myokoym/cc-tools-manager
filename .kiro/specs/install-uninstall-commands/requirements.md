# Requirements Document

## Introduction

The Claude Code Package Manager currently uses a `remove` command that handles both repository unregistration and file deletion. To provide clearer separation of concerns and more intuitive command pairs, this feature introduces a restructured command system:

**Current structure:**
- `register` - Register a repository
- `remove` - Unregister repository AND remove files (with options to keep)
- `update` - Pull changes and optionally deploy

**New structure:**
- `register`/`unregister` - Manage repository registrations
- `install`/`uninstall` - Manage file deployments
- `update` - Pull changes and optionally deploy (unchanged)

This separation provides clearer semantics: registration manages what repositories are tracked, while installation manages what files are deployed.

## Requirements

### Requirement 1: Install Command (deploy registered repositories)

**User Story:** As a developer, I want to run `ccpm install` to deploy files from all registered repositories, so that I can set up my Claude environment with the tools I've registered.

#### Acceptance Criteria

1. WHEN the user runs `ccpm install` without arguments THEN the system SHALL deploy files from all registered repositories to ~/.claude.

2. WHEN the user runs `ccpm install <repository-name>` THEN the system SHALL deploy files only from the specified repository.

3. IF a repository is not cloned locally THEN the system SHALL clone it first before deploying files.

4. IF the install command encounters an error during deployment THEN the system SHALL continue with other repositories and display a summary of failures at the end.

5. WHEN the user runs `ccpm install --force` THEN the system SHALL overwrite existing files without prompting.

6. WHEN the install command completes successfully THEN the system SHALL display deployment statistics (e.g., "deployed 15 files from 3 repositories").

7. IF the user runs `ccpm install` AND all files are already deployed THEN the system SHALL display "all files are up to date".

8. WHILE the install command is running THE SYSTEM SHALL show progress for each repository being processed.

### Requirement 2: Uninstall Command (remove deployed files)

**User Story:** As a developer, I want to use `ccpm uninstall` to remove deployed files while keeping the repository registration, so that I can clean up my environment without losing my repository configuration.

#### Acceptance Criteria

1. WHEN the user runs `ccpm uninstall <repository-name>` THEN the system SHALL remove only the deployed files while keeping the repository registration.

2. WHEN the user runs `ccpm uninstall` without arguments THEN the system SHALL remove all deployed files from all repositories.

3. IF a deployed file has been modified locally THEN the system SHALL skip removal and warn the user (preserving user modifications).

4. WHEN the user runs `ccpm uninstall <repository-name> --force` THEN the system SHALL remove all files including modified ones.

5. WHEN the uninstall command completes THEN the system SHALL display "removed X files from Y repositories".

6. IF the specified repository is not found THEN the system SHALL display "Error: Repository not found" error message.

7. WHEN the user runs `ccpm uninstall --dry-run` THEN the system SHALL show what would be removed without actually removing files.

8. AFTER uninstall completes THE SYSTEM SHALL update state.json to reflect the removed deployments.

### Requirement 3: Unregister Command (remove repository registration)

**User Story:** As a developer, I want to use `ccpm unregister` to completely remove a repository including its registration and deployed files, so that I can fully clean up repositories I no longer need.

#### Acceptance Criteria

1. WHEN the user runs `ccpm unregister <repository-name>` THEN the system SHALL remove the repository registration AND all deployed files.

2. WHEN the user runs `ccpm unregister <repository-name> --keep-files` THEN the system SHALL remove only the registration while preserving deployed files.

3. WHEN the user runs `ccpm unregister` without arguments THEN the system SHALL display an error message requesting a repository name.

4. IF the repository has deployed files THEN the system SHALL show a warning and require confirmation unless --force is used.

5. WHEN the unregister command completes THEN the system SHALL display a summary of what was removed.

6. IF the specified repository is not found THEN the system SHALL display "Error: Repository not registered" error message.

7. WHEN the user runs `ccpm unregister --dry-run <repository-name>` THEN the system SHALL show what would be removed without actually removing anything.

8. AFTER unregister completes THE SYSTEM SHALL remove the repository from repositories.json and clean up state.json.

### Requirement 4: State Management and Tracking

**User Story:** As a system administrator, I want the tool to maintain accurate records of installations and uninstallations, so that I can track what is deployed and troubleshoot issues.

#### Acceptance Criteria

1. WHEN files are deployed via install command THEN the system SHALL record deployment details in state.json including source, target, hash, and timestamp.

2. WHEN files are removed via uninstall command THEN the system SHALL update state.json to remove deployment records.

3. IF state.json is corrupted or missing THEN the system SHALL attempt to reconstruct it by scanning the file system and matching against registered repositories.

4. WHEN the user runs `ccpm status` after install or uninstall THEN the system SHALL accurately reflect the current deployment state.

5. WHERE deployment tracking is concerned THE SYSTEM SHALL maintain separate installation status for each repository.

6. WHEN a repository is uninstalled THEN the system SHALL preserve the repository's metadata but clear its deployment information.

### Requirement 5: Error Handling and Recovery

**User Story:** As a user, I want the system to handle errors gracefully during installation and uninstallation, so that partial failures don't leave my environment in an inconsistent state.

#### Acceptance Criteria

1. IF the install command fails partway through THEN the system SHALL maintain a record of successfully deployed files for potential rollback.

2. WHEN the install command encounters a file conflict THEN the system SHALL follow the configured conflict resolution strategy (skip/overwrite/prompt).

3. IF the uninstall command cannot remove a file due to permissions THEN the system SHALL log the error and continue with other files.

4. WHEN either command encounters a critical error THEN the system SHALL provide clear error messages with suggested remediation steps.

5. IF the system detects inconsistencies between state.json and actual deployed files THEN the system SHALL offer to reconcile the differences.

6. WHEN the user runs `ccpm install --force` THEN the system SHALL reinstall all packages, overwriting any local changes.

### Requirement 6: User Experience and Clear Output

**User Story:** As a developer, I want ccpm to provide clear output patterns and command behaviors, so that I can easily understand what is happening and integrate with scripts.

#### Acceptance Criteria

1. WHILE install operations are in progress THE SYSTEM SHALL display clear progress indicators (e.g., "Installing repositories... [2/5]").

2. WHEN operations complete THE SYSTEM SHALL display concise summaries (e.g., "added 3 packages, removed 2 packages in 1.337s").

3. WHEN the user runs `ccpm install --silent` THEN the system SHALL suppress all non-error output.

4. IF the user runs `ccpm install --verbose` THEN the system SHALL display detailed logs with clear prefixes.

5. WHERE errors occur THE SYSTEM SHALL display clear error messages (e.g., "Error: File not found (ENOENT)").

6. WHEN the user runs `ccpm install --json` THEN the system SHALL output installation results in JSON format for scripting.

### Requirement 7: Command Migration

**User Story:** As an existing user, I want clear guidance when transitioning from the old `remove` command to the new `unregister` command, so that I can adapt to the new command structure smoothly.

#### Acceptance Criteria

1. WHEN the user runs `ccpm remove` THEN the system SHALL display a deprecation notice suggesting `ccpm unregister` instead.

2. IF the user runs `ccpm remove --keep-files` THEN the system SHALL suggest using `ccpm uninstall` for removing only deployed files.

3. WHEN displaying the deprecation notice THE SYSTEM SHALL still execute the remove command for backward compatibility.

4. WHEN the user runs `ccpm help` THEN the system SHALL show both old and new commands with clear indicators.

5. WHERE documentation is updated THE SYSTEM SHALL include a migration guide explaining the command changes.

6. AFTER a grace period THE SYSTEM SHALL remove the deprecated `remove` command in a future major version.