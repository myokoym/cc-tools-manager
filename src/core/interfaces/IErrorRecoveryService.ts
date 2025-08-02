import { InstallationError, StateCorruptionError } from '../../utils/errors';

/**
 * Error recovery strategies enum
 */
export enum RecoveryStrategy {
  RETRY = 'retry',
  SKIP = 'skip',
  ROLLBACK = 'rollback',
  MANUAL_INTERVENTION = 'manual_intervention',
  RECREATE_STATE = 'recreate_state',
  RESTORE_BACKUP = 'restore_backup',
  FAIL_FAST = 'fail_fast',
}

/**
 * Recovery result interface
 */
export interface RecoveryResult {
  success: boolean;
  strategy?: RecoveryStrategy;
  message?: string;
  retryCount?: number;
  backupUsed?: string;
  data?: any;
}

/**
 * Recovery options interface
 */
export interface RecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  skipOnFailure?: boolean;
  createBackup?: boolean;
  userConfirmation?: boolean;
}

/**
 * Error recovery service interface
 */
export interface IErrorRecoveryService {
  /**
   * Handle installation errors with appropriate recovery strategies
   */
  handleInstallError(
    error: InstallationError,
    options?: RecoveryOptions
  ): Promise<RecoveryResult>;

  /**
   * Handle state corruption errors with state reconstruction
   */
  handleStateError(
    error: StateCorruptionError,
    options?: RecoveryOptions
  ): Promise<RecoveryResult>;

  /**
   * Get recommended recovery strategy for error code
   */
  getRecoveryStrategy(errorCode: string): RecoveryStrategy;

  /**
   * Check if error is recoverable
   */
  isRecoverable(error: InstallationError | StateCorruptionError): boolean;

  /**
   * Create user-friendly error message
   */
  formatUserMessage(error: InstallationError | StateCorruptionError): string;

  /**
   * Log error with context information
   */
  logError(
    error: InstallationError | StateCorruptionError,
    context?: Record<string, any>
  ): void;
}