/**
 * Uninstall Command
 * 
 * Removes deployed files from the .claude directory without
 * unregistering the repository.
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { RegistryService } from '../core/RegistryService';
import { StateManager } from '../core/StateManager';
import { EnhancedStateManager } from '../core/EnhancedStateManager';
import { CommandOutputFormatter } from '../utils/command-output-formatter';
import { ErrorRecoveryService } from '../core/ErrorRecoveryService';
import { NotFoundError } from '../utils/errors';
import { Repository } from '../types';
import { DeployedFile, DeploymentState } from '../types/state';
import { getFileHash, fileExists, remove } from '../utils/file-system';
import { CLAUDE_DIR } from '../constants/paths';
import { logger } from '../utils/logger';

interface UninstallOptions {
  force?: boolean;
  yes?: boolean;
  dryRun?: boolean;
  silent?: boolean;
  verbose?: boolean;
  keepBackup?: boolean;
}

interface UninstallResult {
  repository: Repository;
  removed: string[];
  skipped: string[];
  failed: string[];
  modified: string[];
  backedUp: string[];
  status: 'success' | 'partial' | 'failed' | 'skipped';
}

/**
 * Create uninstall command
 */
export function createUninstallCommand(): Command {
  const command = new Command('uninstall');

  command
    .description('Uninstall files from .claude directory without unregistering repository')
    .argument('[repository]', 'Repository name or ID to uninstall (optional)')
    .option('-f, --force', 'Force uninstall even if files have been modified')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('--dry-run', 'Show what would be uninstalled without making changes')
    .option('--keep-backup', 'Keep backup of modified files before removal')
    .option('-s, --silent', 'Suppress output')
    .option('-v, --verbose', 'Show detailed output')
    .action(async (repository: string | undefined, options: UninstallOptions) => {
      await handleUninstall(repository, options);
    });

  return command;
}

/**
 * Handle uninstall command
 */
async function handleUninstall(
  nameOrId: string | undefined,
  options: UninstallOptions
): Promise<void> {
  const registryService = new RegistryService();
  const stateManager = new StateManager();
  const enhancedStateManager = new EnhancedStateManager(stateManager.getStatePath());
  const outputFormatter = new CommandOutputFormatter({
    silent: options.silent,
    verbose: options.verbose
  });
  const errorRecovery = new ErrorRecoveryService();
  const spinner = ora();

  try {
    // Get repositories to uninstall
    const repositories = await getTargetRepositories(
      registryService,
      enhancedStateManager,
      nameOrId,
      options
    );

    if (repositories.length === 0) {
      outputFormatter.warning('No installed repositories found to uninstall');
      return;
    }

    // Show what will be uninstalled
    if (!options.yes && !options.silent) {
      outputFormatter.info(`\nRepositories to uninstall:`);
      for (const { repository, deploymentState } of repositories) {
        const fileCount = deploymentState.deployedFiles.length;
        console.log(`  - ${chalk.cyan(repository.name)} (${fileCount} files)`);
      }

      if (!options.dryRun) {
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: `Uninstall ${repositories.length} repository(ies)?`,
          default: true
        }]);

        if (!confirm) {
          outputFormatter.info('Uninstallation cancelled');
          return;
        }
      }
    }

    // Dry run mode
    if (options.dryRun) {
      outputFormatter.info('\n🔍 DRY RUN MODE - No files will be removed\n');
    }

    // Uninstall each repository
    const results: UninstallResult[] = [];
    let totalRemoved = 0;
    let totalFailed = 0;

    for (const { repository, deploymentState } of repositories) {
      if (!options.silent) {
        spinner.start(`Uninstalling ${repository.name}...`);
      }

      try {
        const result = await uninstallRepository(
          repository,
          deploymentState,
          {
            stateManager,
            enhancedStateManager,
            errorRecovery
          },
          options
        );

        results.push(result);
        totalRemoved += result.removed.length;
        totalFailed += result.failed.length;

        // Show result
        if (!options.silent) {
          if (result.status === 'success') {
            spinner.succeed(chalk.green(`✓ Uninstalled ${repository.name} (${result.removed.length} files)`));
          } else if (result.status === 'partial') {
            spinner.warn(chalk.yellow(`⚠ Partially uninstalled ${repository.name} (${result.removed.length}/${deploymentState.deployedFiles.length} files)`));
          } else if (result.status === 'skipped') {
            spinner.info(chalk.blue(`- Skipped ${repository.name} (not installed)`));
          } else {
            spinner.fail(chalk.red(`✗ Failed to uninstall ${repository.name}`));
          }
        }

        // Show details in verbose mode
        if (options.verbose && !options.silent) {
          if (result.removed.length > 0) {
            console.log(chalk.gray('  Removed files:'));
            result.removed.forEach(file =>
              console.log(chalk.gray(`    - ${file}`))
            );
          }
          if (result.modified.length > 0) {
            console.log(chalk.yellow('  Modified files:'));
            result.modified.forEach(file =>
              console.log(chalk.yellow(`    - ${file} (use --force to remove)`))
            );
          }
          if (result.backedUp.length > 0) {
            console.log(chalk.blue('  Backed up files:'));
            result.backedUp.forEach(file =>
              console.log(chalk.blue(`    - ${file}`))
            );
          }
          if (result.failed.length > 0) {
            console.log(chalk.red('  Failed:'));
            result.failed.forEach(file =>
              console.log(chalk.red(`    - ${file}`))
            );
          }
        }
      } catch (error) {
        if (!options.silent) {
          spinner.fail(chalk.red(`Failed to uninstall ${repository.name}: ${error}`));
        }
        totalFailed++;
      }
    }

    // Show summary
    if (!options.silent && repositories.length > 1) {
      console.log();
      const endTime = new Date();
      outputFormatter.summary({
        command: 'uninstall',
        startTime: new Date(endTime.getTime() - 5000), // Approximate
        endTime,
        success: totalFailed === 0,
        duration: 5000,
        stats: {
          processed: repositories.length,
          succeeded: results.filter(r => r.status === 'success').length,
          failed: totalFailed,
          skipped: results.filter(r => r.status === 'skipped').length
        },
        details: totalFailed > 0 ? {
          errors: [`${totalFailed} files failed to remove`]
        } : undefined
      });
    }

    // Exit with error if any failures
    if (totalFailed > 0 && !options.dryRun) {
      process.exit(1);
    }

  } catch (error) {
    if (!options.silent) {
      spinner.fail(chalk.red(`Uninstallation failed: ${error}`));
    }
    process.exit(1);
  }
}

/**
 * Get target repositories with deployment state
 */
async function getTargetRepositories(
  registryService: RegistryService,
  enhancedStateManager: EnhancedStateManager,
  nameOrId: string | undefined,
  options: UninstallOptions
): Promise<Array<{ repository: Repository; deploymentState: DeploymentState }>> {
  const targets: Array<{ repository: Repository; deploymentState: DeploymentState }> = [];

  if (nameOrId) {
    // Uninstall specific repository
    const repository = await registryService.getRepository(nameOrId);
    if (!repository) {
      throw new NotFoundError(`Repository not found: ${nameOrId}`);
    }
    
    const deploymentState = await enhancedStateManager.getDeploymentState(repository.id);
    if (deploymentState && deploymentState.installationStatus === 'installed') {
      targets.push({ repository, deploymentState });
    }
  } else {
    // Uninstall all installed repositories
    const allRepositories = await registryService.list();
    
    for (const repository of allRepositories) {
      const deploymentState = await enhancedStateManager.getDeploymentState(repository.id);
      if (deploymentState && deploymentState.installationStatus === 'installed') {
        targets.push({ repository, deploymentState });
      }
    }
  }

  return targets;
}

/**
 * Uninstall a single repository
 */
async function uninstallRepository(
  repository: Repository,
  deploymentState: DeploymentState,
  services: {
    stateManager: StateManager;
    enhancedStateManager: EnhancedStateManager;
    errorRecovery: ErrorRecoveryService;
  },
  options: UninstallOptions
): Promise<UninstallResult> {
  const { enhancedStateManager } = services;

  const result: UninstallResult = {
    repository,
    removed: [],
    skipped: [],
    failed: [],
    modified: [],
    backedUp: [],
    status: 'success'
  };

  // Process each deployed file
  for (const deployedFile of deploymentState.deployedFiles) {
    const filePath = deployedFile.target || deployedFile.path;
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(CLAUDE_DIR, filePath);

    try {
      // Check if file exists
      if (!await fileExists(absolutePath)) {
        result.skipped.push(filePath);
        continue;
      }

      // Check if file has been modified (unless --force)
      if (!options.force && deployedFile.hash) {
        const currentHash = await getFileHash(absolutePath);
        if (currentHash !== deployedFile.hash) {
          result.modified.push(filePath);
          
          // Backup modified file if requested
          if (options.keepBackup) {
            const backupPath = `${absolutePath}.backup.${Date.now()}`;
            if (!options.dryRun) {
              await fs.copyFile(absolutePath, backupPath);
            }
            result.backedUp.push(backupPath);
          }
          
          // Skip removal unless forced
          if (!options.force) {
            continue;
          }
        }
      }

      // Remove the file
      if (!options.dryRun) {
        await remove(absolutePath);
      }
      result.removed.push(filePath);

    } catch (error) {
      logger.error(`Failed to remove ${filePath}:`, error);
      result.failed.push(filePath);
    }
  }

  // Update deployment state (unless dry-run)
  if (!options.dryRun && result.removed.length > 0) {
    await enhancedStateManager.trackUninstallation(
      repository.id,
      result.removed
    );
  }

  // Determine overall status
  if (result.removed.length === 0) {
    result.status = 'failed';
  } else if (result.failed.length > 0 || result.modified.length > 0) {
    result.status = 'partial';
  }

  return result;
}

// Export for use in index
export const uninstallCommand = createUninstallCommand();