# Requirements Document

## Introduction

The Claude Code Package Manager currently manages repositories through registration, update, and removal operations. However, it lacks dedicated commands for initial installation setup and selective uninstallation of deployed files. This feature introduces two new commands that adopt familiar command patterns:

1. **install** - Installs all dependencies listed in repositories.json
2. **uninstall** - Removes deployed files with options to preserve configuration

These commands will enhance the tool's usability by providing familiar command patterns that developers already understand, while maintaining ccpm's unique flexibility to keep repository configurations intact for future reinstallation.

## Requirements

### Requirement 1: Install Command (dependency installation)

**User Story:** As a developer, I want to run `ccpm install` to install all dependencies from repositories.json, so that I can set up my environment using familiar patterns.

#### Acceptance Criteria

1. WHEN the user runs `ccpm install` without arguments THEN the system SHALL read repositories.json and install all listed repositories.

2. WHEN the user runs `ccpm install <repository-url>` THEN the system SHALL register the repository AND immediately install it.

3. WHEN the user runs `ccpm install` AND repositories.json exists THEN the system SHALL clone missing repositories and deploy their files to ~/.claude.

4. IF the install command encounters an error during repository installation THEN the system SHALL continue with other repositories and display a summary of failures at the end.

5. WHEN the user runs `ccpm install --save <repository-url>` THEN the system SHALL install the repository AND add it to repositories.json.

6. WHEN the install command completes successfully THEN the system SHALL display installation statistics (e.g., "added 3 packages in 1.337s").

7. IF the user runs `ccpm install` AND all repositories are already up to date THEN the system SHALL display "up to date in Xs".

8. WHILE the install command is running THE SYSTEM SHALL show a progress bar or spinner for each repository being processed.

### Requirement 2: Uninstall Command (selective package removal)

**User Story:** As a developer, I want to use `ccpm uninstall` to remove packages while optionally preserving configuration, so that I can manage my environment using familiar patterns.

#### Acceptance Criteria

1. WHEN the user runs `ccpm uninstall <repository-name>` THEN the system SHALL remove the deployed files AND the repository registration.

2. WHEN the user runs `ccpm uninstall <repository-name> --no-save` THEN the system SHALL remove only deployed files while keeping the repository in repositories.json.

3. WHEN the user runs `ccpm uninstall` without arguments THEN the system SHALL display an error message requesting a repository name.

4. IF a deployed file has been modified locally THEN the system SHALL skip removal and warn the user (preserving user modifications).

5. WHEN the user runs `ccpm uninstall <repository-name> --force` THEN the system SHALL remove all files including modified ones.

6. WHEN the uninstall command completes THEN the system SHALL display "removed X packages in Ys".

7. IF the specified repository is not found THEN the system SHALL display "Error: No such repository" error message.

8. WHEN the user runs `ccpm uninstall --save <repository-name>` THEN the system SHALL remove files AND update repositories.json (explicit save behavior).

### Requirement 3: State Management and Tracking

**User Story:** As a system administrator, I want the tool to maintain accurate records of installations and uninstallations, so that I can track what is deployed and troubleshoot issues.

#### Acceptance Criteria

1. WHEN files are deployed via install command THEN the system SHALL record deployment details in state.json including source, target, hash, and timestamp.

2. WHEN files are removed via uninstall command THEN the system SHALL update state.json to remove deployment records.

3. IF state.json is corrupted or missing THEN the system SHALL attempt to reconstruct it by scanning the file system and matching against registered repositories.

4. WHEN the user runs `ccpm status` after install or uninstall THEN the system SHALL accurately reflect the current deployment state.

5. WHERE deployment tracking is concerned THE SYSTEM SHALL maintain separate installation status for each repository.

6. WHEN a repository is uninstalled THEN the system SHALL preserve the repository's metadata but clear its deployment information.

### Requirement 4: Error Handling and Recovery

**User Story:** As a user, I want the system to handle errors gracefully during installation and uninstallation, so that partial failures don't leave my environment in an inconsistent state.

#### Acceptance Criteria

1. IF the install command fails partway through THEN the system SHALL maintain a record of successfully deployed files for potential rollback.

2. WHEN the install command encounters a file conflict THEN the system SHALL follow the configured conflict resolution strategy (skip/overwrite/prompt).

3. IF the uninstall command cannot remove a file due to permissions THEN the system SHALL log the error and continue with other files.

4. WHEN either command encounters a critical error THEN the system SHALL provide clear error messages with suggested remediation steps.

5. IF the system detects inconsistencies between state.json and actual deployed files THEN the system SHALL offer to reconcile the differences.

6. WHEN the user runs `ccpm install --force` THEN the system SHALL reinstall all packages, overwriting any local changes.

### Requirement 5: User Experience and Clear Output

**User Story:** As a developer, I want ccpm to provide clear output patterns and command behaviors, so that I can easily understand what is happening and integrate with scripts.

#### Acceptance Criteria

1. WHILE install operations are in progress THE SYSTEM SHALL display clear progress indicators (e.g., "Installing repositories... [2/5]").

2. WHEN operations complete THE SYSTEM SHALL display concise summaries (e.g., "added 3 packages, removed 2 packages in 1.337s").

3. WHEN the user runs `ccpm install --silent` THEN the system SHALL suppress all non-error output.

4. IF the user runs `ccpm install --verbose` THEN the system SHALL display detailed logs with clear prefixes.

5. WHERE errors occur THE SYSTEM SHALL display clear error messages (e.g., "Error: File not found (ENOENT)").

6. WHEN the user runs `ccpm install --json` THEN the system SHALL output installation results in JSON format for scripting.