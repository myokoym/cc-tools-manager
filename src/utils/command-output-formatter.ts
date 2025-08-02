/**
 * CommandOutputFormatter
 * 
 * Handles command output formatting with progress indicators, different output modes,
 * summary formatting, and error handling. Provides consistent formatting across
 * all CLI commands with support for silent, verbose, and JSON output modes.
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';

/**
 * Output options interface
 */
export interface OutputOptions {
  /** Suppress all output except errors */
  silent?: boolean;
  /** Show detailed debug information and logs */
  verbose?: boolean;
  /** Output in JSON format for scripting */
  json?: boolean;
}

/**
 * Progress state enumeration
 */
export enum ProgressState {
  NONE = 'none',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Command execution statistics
 */
export interface CommandStats {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

/**
 * Command execution summary
 */
export interface CommandSummary {
  command: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  stats: CommandStats;
  details?: {
    files?: string[];
    errors?: string[];
    warnings?: string[];
    [key: string]: any;
  };
}

/**
 * Command output formatter with progress indicators and multiple output modes
 */
export class CommandOutputFormatter {
  private options: OutputOptions;
  private spinner: Ora | null = null;
  private progressState: ProgressState = ProgressState.NONE;

  constructor(options: OutputOptions = {}) {
    this.options = {
      silent: false,
      verbose: false,
      json: false,
      ...options
    };
  }

  /**
   * Start a progress indicator
   */
  startProgress(message: string): void {
    if (this.options.silent || this.options.json) {
      return;
    }

    this.spinner = ora({
      text: message,
      color: 'cyan'
    }).start();
    
    this.progressState = ProgressState.ACTIVE;
  }

  /**
   * Update progress indicator text
   */
  updateProgress(message: string): void {
    if (this.spinner && this.progressState === ProgressState.ACTIVE) {
      this.spinner.text = message;
    }
  }

  /**
   * Complete progress indicator with success
   */
  completeProgress(message: string): void {
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = null;
      this.progressState = ProgressState.COMPLETED;
    }
  }

  /**
   * Fail progress indicator with error
   */
  failProgress(message: string): void {
    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = null;
      this.progressState = ProgressState.FAILED;
    }
  }

  /**
   * Get current progress state
   */
  getProgressState(): ProgressState {
    return this.progressState;
  }

  /**
   * Output information message
   */
  info(message: string): void {
    if (this.options.silent || this.options.json) {
      return;
    }

    const formatted = this.options.verbose 
      ? `${this.formatTimestamp(new Date())} ${chalk.blue('ℹ')} ${message}`
      : `${chalk.blue('ℹ')} ${message}`;
    
    console.log(formatted);
  }

  /**
   * Output success message
   */
  success(message: string): void {
    if (this.options.silent || this.options.json) {
      return;
    }

    const formatted = this.options.verbose
      ? `${this.formatTimestamp(new Date())} ${chalk.green('✓')} ${chalk.green(message)}`
      : `${chalk.green('✓')} ${chalk.green(message)}`;
    
    console.log(formatted);
  }

  /**
   * Output warning message
   */
  warning(message: string): void {
    if (this.options.silent || this.options.json) {
      return;
    }

    const formatted = this.options.verbose
      ? `${this.formatTimestamp(new Date())} ${chalk.yellow('⚠')} ${chalk.yellow(message)}`
      : `${chalk.yellow('⚠')} ${chalk.yellow(message)}`;
    
    console.log(formatted);
  }

  /**
   * Output error message (always shown, even in silent mode)
   */
  error(error: string | Error): void {
    if (this.options.json) {
      const errorData = {
        level: 'error',
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
        ...(error instanceof Error && this.options.verbose && { stack: error.stack })
      };
      console.log(JSON.stringify(errorData, null, 2));
      return;
    }

    const message = error instanceof Error ? error.message : error;
    const formatted = this.options.verbose
      ? `${this.formatTimestamp(new Date())} ${chalk.red('✗')} ${chalk.red(message)}`
      : `${chalk.red('✗')} ${chalk.red(message)}`;
    
    console.error(formatted);

    // Show stack trace in verbose mode
    if (this.options.verbose && error instanceof Error && error.stack) {
      console.error(chalk.red('Stack trace:'));
      console.error(chalk.gray(error.stack));
    }
  }

  /**
   * Output debug message (only in verbose mode)
   */
  debug(message: string): void {
    if (!this.options.verbose || this.options.json) {
      return;
    }

    const formatted = `${this.formatTimestamp(new Date())} ${chalk.gray('🐛')} ${chalk.gray(message)}`;
    console.log(formatted);
  }

  /**
   * Output verbose message (only in verbose mode)
   */
  verbose(message: string): void {
    if (!this.options.verbose || this.options.json) {
      return;
    }

    const formatted = `${this.formatTimestamp(new Date())} ${chalk.gray('📝')} ${message}`;
    console.log(formatted);
  }

  /**
   * Output JSON data (only in JSON mode or when explicitly called)
   */
  json(data: any): void {
    console.log(JSON.stringify(data, null, 2));
  }

  /**
   * Output command execution summary
   */
  summary(summary: CommandSummary): void {
    if (this.options.json) {
      this.json(summary);
      return;
    }

    if (this.options.silent) {
      return;
    }

    console.log(''); // Empty line for spacing

    // Command header
    const statusIcon = summary.success ? chalk.green('✓') : chalk.red('✗');
    const statusColor = summary.success ? chalk.green : chalk.red;
    console.log(`${statusIcon} ${chalk.bold(summary.command)} ${statusColor(summary.success ? 'completed' : 'failed')}`);

    // Duration
    console.log(`   Duration: ${chalk.cyan(this.formatDuration(summary.duration))}`);

    // Statistics
    const stats = summary.stats;
    console.log(`   Statistics:`);
    console.log(`     processed: ${chalk.bold(stats.processed)}`);
    console.log(`     succeeded: ${chalk.green(stats.succeeded)}`);
    
    if (stats.failed > 0) {
      console.log(`     failed: ${chalk.red(stats.failed)}`);
    }
    
    if (stats.skipped > 0) {
      console.log(`     skipped: ${chalk.yellow(stats.skipped)}`);
    }

    // Detailed information (verbose mode only)
    if (this.options.verbose && summary.details) {
      console.log(`   Details:`);
      
      if (summary.details.files && summary.details.files.length > 0) {
        console.log(`     Files processed:`);
        summary.details.files.forEach(file => {
          console.log(`       - ${chalk.gray(file)}`);
        });
      }

      if (summary.details.errors && summary.details.errors.length > 0) {
        console.log(`     Errors:`);
        summary.details.errors.forEach(error => {
          console.log(`       - ${chalk.red(error)}`);
        });
      }

      if (summary.details.warnings && summary.details.warnings.length > 0) {
        console.log(`     Warnings:`);
        summary.details.warnings.forEach(warning => {
          console.log(`       - ${chalk.yellow(warning)}`);
        });
      }
    }

    console.log(''); // Empty line for spacing
  }

  /**
   * Format duration in human-readable format
   */
  formatDuration(milliseconds: number): string {
    const seconds = milliseconds / 1000;
    
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h ${remainingMinutes}m ${remainingSeconds.toFixed(1)}s`;
  }

  /**
   * Format timestamp for verbose output
   */
  formatTimestamp(date: Date): string {
    return chalk.gray(`[${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}]`);
  }

  /**
   * Create a new formatter with different options
   */
  withOptions(newOptions: Partial<OutputOptions>): CommandOutputFormatter {
    return new CommandOutputFormatter({
      ...this.options,
      ...newOptions
    });
  }

  /**
   * Reset progress state
   */
  resetProgress(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
    this.progressState = ProgressState.NONE;
  }
}