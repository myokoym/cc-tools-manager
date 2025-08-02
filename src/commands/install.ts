/**
 * Install Command
 * 
 * Deploys files from registered repositories to the .claude directory
 * without re-registering the repository.
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { RegistryService } from '../core/RegistryService';
import { StateManager } from '../core/StateManager';
import { DeploymentService } from '../core/DeploymentService';
import { EnhancedStateManager } from '../core/EnhancedStateManager';
import { CommandOutputFormatter } from '../utils/command-output-formatter';
import { ErrorRecoveryService } from '../core/ErrorRecoveryService';
import { InstallationError, NotFoundError } from '../utils/errors';
import { Repository } from '../types';
import { DeployedFile } from '../types/state';
import { DeploymentResult } from '../core/interfaces/IDeploymentService';
import { selectRepository, displayNumberedRepositories } from '../utils/repository-selector';
import { CC_TOOLS_HOME } from '../constants/paths';
import * as path from 'path';
import { logger } from '../utils/logger';

interface InstallOptions {
  force?: boolean;
  yes?: boolean;
  dryRun?: boolean;
  silent?: boolean;
  verbose?: boolean;
  pattern?: string;
  skipConflicts?: boolean;
}

interface InstallResult {
  repository: Repository;
  deployed: DeployedFile[];
  skipped: string[];
  failed: string[];
  conflicts: string[];
  status: 'success' | 'partial' | 'failed' | 'skipped';
}

/**
 * Create install command
 */
export function createInstallCommand(): Command {
  const command = new Command('install');

  command
    .description('Install files from registered repositories to .claude directory')
    .argument('[repository]', 'Repository name or ID to install (optional)')
    .option('-f, --force', 'Force installation even if already installed')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('--dry-run', 'Show what would be installed without making changes')
    .option('--pattern <pattern>', 'Install only files matching pattern')
    .option('--skip-conflicts', 'Skip files that would cause conflicts')
    .option('-s, --silent', 'Suppress output')
    .option('-v, --verbose', 'Show detailed output')
    .action(async (repository: string | undefined, options: InstallOptions) => {
      await handleInstall(repository, options);
    });

  return command;
}

/**
 * Handle install command
 */
async function handleInstall(
  nameOrId: string | undefined, 
  options: InstallOptions
): Promise<void> {
  const registryService = new RegistryService();
  const stateManager = new StateManager();
  const enhancedStateManager = new EnhancedStateManager(stateManager.getStatePath());
  const deploymentService = new DeploymentService();
  const outputFormatter = new CommandOutputFormatter({
    silent: options.silent,
    verbose: options.verbose
  });
  const errorRecovery = new ErrorRecoveryService();
  const spinner = ora();

  try {
    // Get repositories to install
    const repositories = await getTargetRepositories(
      registryService, 
      nameOrId,
      options
    );

    if (repositories.length === 0) {
      outputFormatter.warning('No repositories found to install');
      return;
    }

    // Show what will be installed
    if (!options.yes && !options.silent) {
      outputFormatter.info(`\nRepositories to install:`);
      repositories.forEach((repo, index) => {
        console.log(`  ${index + 1}. ${chalk.cyan(repo.name)} (${repo.url})`);
      });

      if (!options.dryRun) {
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: `Install ${repositories.length} repository(ies)?`,
          default: true
        }]);

        if (!confirm) {
          outputFormatter.info('Installation cancelled');
          return;
        }
      }
    }

    // Dry run mode
    if (options.dryRun) {
      outputFormatter.info('\n🔍 DRY RUN MODE - No files will be installed\n');
    }

    // Install each repository
    const results: InstallResult[] = [];
    let totalDeployed = 0;
    let totalFailed = 0;

    for (const repository of repositories) {
      if (!options.silent) {
        spinner.start(`Installing ${repository.name}...`);
      }

      try {
        const result = await installRepository(
          repository,
          {
            stateManager,
            enhancedStateManager,
            deploymentService,
            errorRecovery
          },
          options
        );

        results.push(result);
        totalDeployed += result.deployed.length;
        totalFailed += result.failed.length;

        // Show result
        if (!options.silent) {
          if (result.status === 'success') {
            spinner.succeed(chalk.green(`✓ Installed ${repository.name} (${result.deployed.length} files)`));
          } else if (result.status === 'partial') {
            spinner.warn(chalk.yellow(`⚠ Partially installed ${repository.name} (${result.deployed.length}/${result.deployed.length + result.failed.length} files)`));
          } else if (result.status === 'skipped') {
            spinner.info(chalk.blue(`- Skipped ${repository.name} (already installed)`));
          } else {
            spinner.fail(chalk.red(`✗ Failed to install ${repository.name}`));
          }
        }

        // Show details in verbose mode
        if (options.verbose && !options.silent) {
          if (result.deployed.length > 0) {
            console.log(chalk.gray('  Deployed files:'));
            result.deployed.forEach(file => 
              console.log(chalk.gray(`    - ${file.source}`))
            );
          }
          if (result.conflicts.length > 0) {
            console.log(chalk.yellow('  Conflicts:'));
            result.conflicts.forEach(file => 
              console.log(chalk.yellow(`    - ${file}`))
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
          spinner.fail(chalk.red(`Failed to install ${repository.name}: ${error}`));
        }
        totalFailed++;
      }
    }

    // Show summary
    if (!options.silent && repositories.length > 1) {
      console.log();
      const endTime = new Date();
      outputFormatter.summary({
        command: 'install',
        startTime: new Date(endTime.getTime() - 5000), // Approximate
        endTime,
        stats: {
          processed: repositories.length,
          succeeded: results.filter(r => r.status === 'success').length,
          failed: totalFailed,
          skipped: results.filter(r => r.status === 'skipped').length
        },
        success: totalFailed === 0,
        duration: endTime.getTime() - (endTime.getTime() - 5000),
        details: totalFailed > 0 ? {
          errors: [`${totalFailed} files failed to install`]
        } : undefined
      });
    }

    // Exit with error if any failures
    if (totalFailed > 0 && !options.dryRun) {
      process.exit(1);
    }

  } catch (error) {
    if (!options.silent) {
      spinner.fail(chalk.red(`Installation failed: ${error}`));
    }
    process.exit(1);
  }
}

/**
 * Get target repositories
 */
async function getTargetRepositories(
  registryService: RegistryService,
  nameOrId: string | undefined,
  options: InstallOptions
): Promise<Repository[]> {
  if (nameOrId) {
    // Install specific repository
    const repository = await registryService.getRepository(nameOrId);
    if (!repository) {
      throw new NotFoundError(`Repository not found: ${nameOrId}`);
    }
    return [repository];
  }

  // Install all repositories
  const allRepositories = Array.from((await registryService.list()).values());
  
  if (!options.yes && !options.silent && allRepositories.length > 1) {
    // Allow user to select repositories
    const { repositories } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'repositories',
      message: 'Select repositories to install:',
      choices: allRepositories.map((repo: Repository) => ({
        name: `${repo.name} (${repo.url})`,
        value: repo,
        checked: true
      }))
    }]);
    
    return repositories;
  }

  return allRepositories;
}

/**
 * Install a single repository
 */
async function installRepository(
  repository: Repository,
  services: {
    stateManager: StateManager;
    enhancedStateManager: EnhancedStateManager;
    deploymentService: DeploymentService;
    errorRecovery: ErrorRecoveryService;
  },
  options: InstallOptions
): Promise<InstallResult> {
  const { enhancedStateManager, deploymentService } = services;

  // Check if already installed
  if (!options.force) {
    const deploymentState = await enhancedStateManager.getDeploymentState(repository.id);
    if (deploymentState?.installationStatus === 'installed') {
      return {
        repository,
        deployed: [],
        skipped: [],
        failed: [],
        conflicts: [],
        status: 'skipped'
      };
    }
  }

  try {
    // Deploy files using existing DeploymentService
    const deploymentResult = await deploymentService.deploy(
      repository,
      { interactive: !options.yes && !options.skipConflicts }
    );

    // Convert deployment result - map DeployedFile types
    const deployedFiles: DeployedFile[] = deploymentResult.deployed.map(file => ({
      path: file.target,
      hash: file.hash,
      deployedAt: file.deployedAt,
      source: file.source,
      target: file.target
    }));

    const result: InstallResult = {
      repository,
      deployed: deployedFiles,
      skipped: deploymentResult.skipped,
      failed: deploymentResult.failed,
      conflicts: deploymentResult.conflicts,
      status: 'success'
    };

    // Determine status
    if (result.deployed.length === 0) {
      result.status = 'failed';
    } else if (result.failed.length > 0 || result.conflicts.length > 0) {
      result.status = 'partial';
    }

    // Track installation in enhanced state (unless dry-run)
    if (!options.dryRun && result.deployed.length > 0) {
      await enhancedStateManager.trackInstallation(
        repository.id,
        result.deployed,
        {
          force: options.force,
          partial: result.status === 'partial'
        }
      );
    }

    return result;

  } catch (error) {
    // Try recovery if possible
    if (error instanceof InstallationError && services.errorRecovery.canRecover(error)) {
      const recovery = await services.errorRecovery.recover(error, { 
        repository, 
        options 
      });

      if (recovery.success && recovery.data) {
        const deploymentResult = recovery.data as DeploymentResult;
        // Convert deployment result - map DeployedFile types
        const deployedFiles: DeployedFile[] = deploymentResult.deployed.map(file => ({
          path: file.target,
          hash: file.hash,
          deployedAt: file.deployedAt,
          source: file.source,
          target: file.target
        }));
        
        return {
          repository,
          deployed: deployedFiles,
          skipped: deploymentResult.skipped,
          failed: deploymentResult.failed,
          conflicts: deploymentResult.conflicts,
          status: deploymentResult.deployed.length > 0 ? 'partial' : 'failed'
        };
      }
    }

    throw error;
  }
}


// Export for use in index
export const installCommand = createInstallCommand();