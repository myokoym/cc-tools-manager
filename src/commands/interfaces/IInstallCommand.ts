/**
 * Install Command Interface
 * 
 * Defines the contract for the install command that deploys files
 * from registered repositories to the .claude directory.
 */

import { Repository, DeploymentResult } from '../../types';

/**
 * Options for the install command
 */
export interface InstallOptions {
  // Target a specific repository
  repository?: string;
  
  // Force installation even if already installed
  force?: boolean;
  
  // Skip confirmation prompts
  yes?: boolean;
  
  // Dry run mode - show what would be installed
  dryRun?: boolean;
  
  // Output mode
  silent?: boolean;
  verbose?: boolean;
  json?: boolean;
  
  // File pattern to install (e.g., "*.js", "commands/*")
  pattern?: string;
  
  // Skip conflict resolution (auto-skip conflicting files)
  skipConflicts?: boolean;
}

/**
 * Result of an installation operation
 */
export interface InstallResult {
  // Repository that was installed
  repository: Repository;
  
  // Deployment result
  deployment: DeploymentResult;
  
  // Installation status
  status: 'success' | 'partial' | 'failed' | 'skipped';
  
  // Error if installation failed
  error?: Error;
  
  // Warning messages
  warnings?: string[];
  
  // Time taken for installation
  duration?: number;
}

/**
 * Summary of bulk installation operation
 */
export interface InstallSummary {
  // Total repositories processed
  totalRepositories: number;
  
  // Successful installations
  successful: number;
  
  // Partial installations (some files failed)
  partial: number;
  
  // Failed installations
  failed: number;
  
  // Skipped (already installed)
  skipped: number;
  
  // Total files deployed
  totalFiles: number;
  
  // Individual results
  results: InstallResult[];
  
  // Total duration
  duration: number;
}

/**
 * Install command interface
 */
export interface IInstallCommand {
  /**
   * Execute the install command
   * @param options Installation options
   * @returns Installation summary
   */
  execute(options: InstallOptions): Promise<InstallSummary>;
  
  /**
   * Validate installation options
   * @param options Options to validate
   * @throws Error if options are invalid
   */
  validateOptions(options: InstallOptions): Promise<void>;
  
  /**
   * Install a single repository
   * @param repository Repository to install
   * @param options Installation options
   * @returns Installation result
   */
  installRepository(
    repository: Repository,
    options: InstallOptions
  ): Promise<InstallResult>;
  
  /**
   * Check if a repository is already installed
   * @param repositoryId Repository ID to check
   * @returns True if installed
   */
  isInstalled(repositoryId: string): Promise<boolean>;
  
  /**
   * Get installation candidates (repositories not yet installed)
   * @returns List of repositories that can be installed
   */
  getInstallationCandidates(): Promise<Repository[]>;
}