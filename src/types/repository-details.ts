/**
 * Repository Details Feature Type Definitions
 * 
 * Defines types for the repository-details feature that provides comprehensive
 * information about repositories including deployment mappings, sync status,
 * and statistics.
 */

import type { Repository } from './repository';

/**
 * Main container for all repository details information
 * 
 * This interface aggregates all available information about a repository
 * including its basic data, deployment mappings, synchronization status,
 * and deployment statistics.
 */
export interface RepositoryDetails {
  /** The repository's basic information */
  repository: Repository;
  
  /** Array of deployment mappings showing source-to-target file relationships */
  deployments: DeploymentMapping[];
  
  /** Current synchronization and status information */
  status: RepositorySyncStatus;
  
  /** Deployment statistics and metrics */
  statistics: DeploymentStatistics;
}

/**
 * Represents a mapping between source files and their deployment targets
 * 
 * This interface shows the relationship between files in the repository
 * and where they are deployed in the local file system, including
 * metadata about the deployment status and file information.
 */
export interface DeploymentMapping {
  /** Path to the source file within the repository */
  sourcePath: string;
  
  /** Path to the target file in the local file system */
  targetPath: string;
  
  /** Current deployment status of the file */
  status: 'deployed' | 'pending' | 'error';
  
  /** Optional file size in bytes */
  fileSize?: number;
  
  /** Optional last modification timestamp */
  lastModified?: Date;
  
  /** Optional file hash for integrity verification (shown in verbose mode) */
  hash?: string;
}

/**
 * Repository synchronization and status information
 * 
 * Provides detailed information about the repository's current state
 * including synchronization status, conflicts, and errors.
 * 
 * Note: Named RepositorySyncStatus to avoid conflict with existing RepositoryStatus type
 */
export interface RepositorySyncStatus {
  /** Current synchronization status relative to remote */
  syncStatus: 'up-to-date' | 'behind' | 'ahead' | 'diverged';
  
  /** Timestamp of the last successful synchronization */
  lastSyncTime: Date;
  
  /** Whether there are any deployment conflicts */
  hasConflicts: boolean;
  
  /** Array of detected conflicts, if any */
  conflicts: Conflict[];
  
  /** Array of errors encountered during operations */
  errors: RepositoryError[];
}

/**
 * Represents a deployment conflict
 * 
 * Conflicts occur when deployment operations cannot proceed due to
 * file system conflicts or validation issues.
 */
export interface Conflict {
  /** Type of conflict detected */
  type: 'file_exists' | 'permission_denied' | 'invalid_target';
  
  /** Path where the conflict occurred */
  path: string;
  
  /** Human-readable description of the conflict */
  message: string;
  
  /** Optional suggested resolution */
  suggestion?: string;
}

/**
 * Represents an error that occurred during repository operations
 */
export interface RepositoryError {
  /** Error code for programmatic handling */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Timestamp when the error occurred */
  timestamp: Date;
  
  /** Optional additional context or details */
  details?: Record<string, unknown>;
}

/**
 * Deployment statistics and metrics
 * 
 * Provides quantitative information about the repository's
 * deployment status and file distribution.
 */
export interface DeploymentStatistics {
  /** Total number of deployable files in the repository */
  totalFiles: number;
  
  /** Number of files successfully deployed */
  deployedFiles: number;
  
  /** Number of files pending deployment */
  pendingFiles: number;
  
  /** Number of files with deployment errors */
  errorFiles: number;
  
  /** Total size of all files in bytes */
  totalSize: number;
}

/**
 * Options for the show command
 * 
 * Controls the behavior and output format of the repository details display.
 */
export interface ShowOptions {
  /** Show only file mappings, skip other information */
  filesOnly: boolean;
  
  /** Output format selection */
  format: 'text' | 'json';
  
  /** Enable verbose output with additional details */
  verbose: boolean;
  
  /** Disable colored output */
  noColor: boolean;
  
  /** Maximum number of files to display */
  maxFiles: number;
}

/**
 * Error codes specific to the show command
 */
export enum ShowCommandErrorCode {
  REPOSITORY_NOT_FOUND = 'REPO_NOT_FOUND',
  ACCESS_DENIED = 'ACCESS_DENIED',
  INVALID_OPTIONS = 'INVALID_OPTIONS',
  PERFORMANCE_TIMEOUT = 'PERF_TIMEOUT',
  FILE_SYSTEM_ERROR = 'FS_ERROR',
  GIT_OPERATION_FAILED = 'GIT_FAILED'
}

/**
 * Custom error class for show command operations
 * 
 * Provides structured error handling with specific error codes
 * and additional context for debugging and user feedback.
 */
export class ShowCommandError extends Error {
  constructor(
    message: string,
    public readonly code: ShowCommandErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ShowCommandError';
  }
}

/**
 * Source file metadata used during deployment mapping
 */
export interface SourceFile {
  /** Relative path within the repository */
  path: string;
  
  /** File size in bytes */
  size: number;
  
  /** Last modification timestamp */
  lastModified: Date;
  
  /** File content hash */
  hash: string;
  
  /** Detected file type (commands, agents, hooks) */
  type?: 'commands' | 'agents' | 'hooks';
}

/**
 * Grouped deployment mappings by directory or type
 */
export interface GroupedMappings {
  /** Grouping key (directory path or type name) */
  [key: string]: DeploymentMapping[];
}

/**
 * Performance metrics for monitoring and optimization
 */
export interface PerformanceMetrics {
  /** Time taken to scan repository files (ms) */
  scanTime: number;
  
  /** Time taken to resolve deployment mappings (ms) */
  mappingTime: number;
  
  /** Time taken to check repository status (ms) */
  statusTime: number;
  
  /** Total execution time (ms) */
  totalTime: number;
  
  /** Peak memory usage during operation (bytes) */
  peakMemory: number;
}

/**
 * Options for formatting output
 * 
 * Controls how repository details are presented to the user.
 */
export interface FormatOptions {
  /** Whether to use colored output */
  useColor: boolean;
  
  /** Maximum width for path truncation */
  maxPathLength: number;
  
  /** Whether to show performance metrics */
  showMetrics: boolean;
  
  /** Whether to group files by directory */
  groupByDirectory: boolean;
}