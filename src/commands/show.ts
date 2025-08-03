/**
 * Show command implementation
 * 指定されたリポジトリの詳細情報を表示
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { RegistryService } from '../core/RegistryService';
import { GitManager } from '../core/GitManager';
import { StateManager } from '../core/StateManager';
import { Repository, RepositoryStatus } from '../types/repository';
import { DeploymentMapper } from '../services/deployment-mapper';
import { RepositoryStatusService } from '../services/repository-status';
import { OutputFormatter, FormatterOptions } from '../formatters/output-formatter';
import { selectRepository, displayNumberedRepositories } from '../utils/repository-selector';

/**
 * Status color definitions
 */
const statusColors: Record<RepositoryStatus, (text: string) => string> = {
  active: chalk.green,
  error: chalk.red,
  uninitialized: chalk.gray
};

/**
 * Status display strings
 */
const statusDisplay: Record<RepositoryStatus, string> = {
  active: '✓ Active',
  error: '✗ Error',
  uninitialized: '○ Not Initialized'
};

/**
 * Show command class
 */
export class ShowCommand {
  private registryService: RegistryService;
  private deploymentMapper: DeploymentMapper;
  private statusService: RepositoryStatusService;
  private formatter: OutputFormatter;
  private stateManager: StateManager;

  constructor(
    registryService?: RegistryService,
    deploymentMapper?: DeploymentMapper,
    statusService?: RepositoryStatusService,
    formatter?: OutputFormatter,
    stateManager?: StateManager
  ) {
    this.registryService = registryService || new RegistryService();
    this.deploymentMapper = deploymentMapper || new DeploymentMapper();
    this.statusService = statusService || new RepositoryStatusService();
    this.formatter = formatter || new OutputFormatter();
    this.stateManager = stateManager || new StateManager();
  }

  /**
   * Execute the show command
   */
  async execute(repositoryName?: string, options: ShowOptions = {}): Promise<void> {
    // If no repository specified, show all repositories summary
    if (!repositoryName) {
      await this.showAllRepositoriesSummary(options);
      return;
    }

    const spinner = ora('Loading repository information...').start();
    
    try {
      // リポジトリを検索
      const repository = await this.registryService.find(repositoryName);
      
      if (!repository) {
        spinner.fail(`Repository not found: ${repositoryName}`);
        console.log(chalk.gray('Use "ccpm list" to see all registered repositories.'));
        process.exit(1);
      }

      spinner.succeed(`Found repository: ${repository.name}`);

      // --files-only オプションの処理
      if (options.filesOnly) {
        await this.showDeployedFilesOnly(repository, options);
        return;
      }

      // 基本情報を表示
      await this.showBasicInfo(repository, options);
      
      // デプロイメント情報を表示
      if (!options.skipDeployments) {
        await this.showDeploymentInfo(repository, options);
      }
      
      // ステータス情報を表示
      if (options.verbose) {
        await this.showStatusInfo(repository, options);
      }
      
    } catch (error) {
      spinner.fail('Error showing repository');
      console.error(chalk.red('Details:'), error);
      process.exit(1);
    }
  }

  /**
   * 基本情報を表示
   */
  private async showBasicInfo(repository: Repository, options: ShowOptions): Promise<void> {
    const formatterOptions: FormatterOptions = {
      format: options.format || 'table',
      verbose: options.verbose,
      colors: true,
      terminalWidth: process.stdout.columns
    };
    
    const output = await this.formatter.formatRepository(repository, formatterOptions);
    console.log(output);
  }

  /**
   * デプロイメント情報を表示
   */
  private async showDeploymentInfo(repository: Repository, options: ShowOptions): Promise<void> {
    const spinner = ora('Loading deployment information...').start();
    
    try {
      const deploymentMapping = await this.deploymentMapper.mapDeployments(repository);
      
      // StateManagerから実際のデプロイ情報を取得
      const repoState = await this.stateManager.getRepositoryState(repository.id);
      
      spinner.succeed('Deployment information loaded');
      
      const formatterOptions: FormatterOptions = {
        format: options.format || 'table',
        verbose: options.verbose,
        colors: true,
        terminalWidth: process.stdout.columns
      };
      
      // デプロイ情報にstate情報を含める
      const mappingWithState = {
        ...deploymentMapping,
        deployedFiles: repoState?.deployedFiles || []
      };
      
      const output = await this.formatter.formatDeploymentMapping(mappingWithState, formatterOptions);
      console.log(output);
    } catch (error) {
      spinner.warn('Unable to load deployment information');
      if (options.verbose) {
        console.log(chalk.gray(`  Error: ${error}`));
      }
    }
  }

  /**
   * ステータス情報を表示
   */
  private async showStatusInfo(repository: Repository, options: ShowOptions): Promise<void> {
    const spinner = ora('Checking repository status...').start();
    
    try {
      const statusInfo = await this.statusService.getRepositoryStatus(repository);
      spinner.succeed('Status information loaded');
      
      console.log(chalk.bold('\nStatus Information:\n'));
      
      // Local repository information
      console.log(chalk.bold('  Local Repository:'));
      if (statusInfo.local.exists) {
        console.log(`    Path: ${chalk.cyan(statusInfo.local.path || 'N/A')}`);
        console.log(`    Files: ${chalk.yellow(statusInfo.local.fileCount?.toString() || 'N/A')}`);
        if (statusInfo.local.diskSize) {
          const sizeInMB = (statusInfo.local.diskSize / 1024 / 1024).toFixed(2);
          console.log(`    Size: ${chalk.yellow(sizeInMB + ' MB')}`);
        }
        
        if (statusInfo.local.currentBranch) {
          console.log(`    Branch: ${chalk.cyan(statusInfo.local.currentBranch)}`);
        }
        
        if (statusInfo.local.lastCommit) {
          console.log(`    Last Commit: ${chalk.gray(statusInfo.local.lastCommit)}`);
        }
        
        if (statusInfo.local.isDirty) {
          console.log(`    Status: ${chalk.yellow('Dirty - has uncommitted changes')}`);
        } else {
          console.log(`    Status: ${chalk.green('Clean')}`);
        }
      } else {
        console.log(`    ${chalk.red('Local repository not found')}`);
      }
      
      console.log('');
      
      // Deployment information
      console.log(chalk.bold('  Deployment Status:'));
      console.log(`    Total Files: ${chalk.yellow(statusInfo.deployment.totalDeployedFiles.toString())}`);
      console.log(`    Commands: ${chalk.cyan(statusInfo.deployment.activeDeployments.commands.toString())}`);
      console.log(`    Agents: ${chalk.cyan(statusInfo.deployment.activeDeployments.agents.toString())}`);
      console.log(`    Hooks: ${chalk.cyan(statusInfo.deployment.activeDeployments.hooks.toString())}`);
      
      if (statusInfo.deployment.lastDeploymentTime) {
        console.log(`    Last Deployment: ${chalk.gray(new Date(statusInfo.deployment.lastDeploymentTime).toLocaleString())}`);
      }
      
      if (statusInfo.deployment.deploymentErrors.length > 0) {
        console.log(`    Errors: ${chalk.red(statusInfo.deployment.deploymentErrors.length.toString())}`);
        if (options.verbose) {
          statusInfo.deployment.deploymentErrors.forEach(error => {
            console.log(`      ${chalk.red('•')} ${error}`);
          });
        }
      }
      
      console.log('');
      
      // Health check
      console.log(chalk.bold('  Health Status:'));
      const healthColor = statusInfo.health.status === 'healthy' ? 'green' : 
                        statusInfo.health.status === 'warning' ? 'yellow' : 'red';
      console.log(`    Status: ${chalk[healthColor](statusInfo.health.status.toUpperCase())}`);
      console.log(`    Last Checked: ${chalk.gray(new Date(statusInfo.health.lastChecked).toLocaleString())}`);
      
      if (statusInfo.health.issues.length > 0) {
        console.log(`    Issues: ${chalk.red(statusInfo.health.issues.length.toString())}`);
        if (options.verbose) {
          statusInfo.health.issues.forEach(issue => {
            console.log(`      ${chalk.red('•')} ${issue}`);
          });
        }
      }
      
    } catch (error) {
      spinner.fail('Unable to load status information');
      if (options.verbose) {
        console.log(chalk.gray(`  Error: ${error}`));
      }
    }
  }

  /**
   * デプロイされたファイルのみを表示
   */
  private async showDeployedFilesOnly(repository: Repository, options: ShowOptions): Promise<void> {
    const spinner = ora('Loading deployed files...').start();
    
    try {
      const deployedFiles = await this.deploymentMapper.getDeployedFiles(repository);
      
      if (deployedFiles.length === 0) {
        spinner.warn('No deployed files found');
        return;
      }
      
      spinner.succeed(`Found ${deployedFiles.length} deployed files`);
      console.log(chalk.bold(`\nDeployed Files for ${repository.name}:\n`));
      
      const formatterOptions: FormatterOptions = {
        format: options.tree ? 'tree' : 'table',
        verbose: options.verbose,
        colors: true,
        terminalWidth: process.stdout.columns
      };
      
      const output = await this.formatter.formatFileTree(deployedFiles, formatterOptions);
      console.log(output);
    } catch (error) {
      spinner.fail('Unable to load deployed files information');
      if (options.verbose) {
        console.log(chalk.gray(`  Error: ${error}`));
      }
    }
  }

  /**
   * Show summary of all repositories
   */
  private async showAllRepositoriesSummary(options: ShowOptions): Promise<void> {
    const repositories = await this.registryService.list();
    
    if (repositories.length === 0) {
      console.log(chalk.yellow('No repositories registered.'));
      return;
    }
    
    // If --summary flag or no special format requested, show compact summary
    if (options.summary || !options.format || options.format === 'table') {
      console.log(chalk.bold('\nRepository Status Summary:\n'));
      
      // Count by status
      const statusCounts = repositories.reduce((acc, repo) => {
        acc[repo.status] = (acc[repo.status] || 0) + 1;
        return acc;
      }, {} as Record<RepositoryStatus, number>);
      
      // Display summary
      Object.entries(statusCounts).forEach(([status, count]) => {
        const colorFn = statusColors[status as RepositoryStatus];
        console.log(`  ${colorFn(statusDisplay[status as RepositoryStatus])}: ${count}`);
      });
      
      console.log(`\n  Total: ${repositories.length} repositories`);
      
      // Show repositories needing attention
      const problemRepos = repositories.filter(r => r.status !== 'active');
      if (problemRepos.length > 0) {
        console.log(chalk.yellow('\nRepositories needing attention:'));
        problemRepos.forEach(repo => {
          console.log(`  - ${repo.name} (${statusColors[repo.status](repo.status)})`);
        });
      }
      
      // Show numbered list of all repositories
      console.log(chalk.bold('\nAll Repositories:\n'));
      displayNumberedRepositories(repositories);
    } else {
      // For other formats (json, yaml), show full details
      const formatterOptions: FormatterOptions = {
        format: options.format,
        verbose: options.verbose,
        colors: true,
        terminalWidth: process.stdout.columns
      };
      
      // For JSON/YAML formats, output raw repository data
      if (options.format === 'json') {
        console.log(JSON.stringify(repositories, null, 2));
      } else if (options.format === 'yaml') {
        // Simple YAML-like output
        repositories.forEach(repo => {
          console.log(`- name: ${repo.name}`);
          console.log(`  id: ${repo.id}`);
          console.log(`  url: ${repo.url}`);
          console.log(`  status: ${repo.status}`);
          console.log(`  registeredAt: ${repo.registeredAt}`);
          if (repo.lastUpdatedAt) {
            console.log(`  lastUpdatedAt: ${repo.lastUpdatedAt}`);
          }
          console.log('');
        });
      }
    }
  }
}


/**
 * コマンドオプション
 */
interface ShowOptions {
  filesOnly?: boolean;
  format?: 'table' | 'json' | 'yaml' | 'tree';
  verbose?: boolean;
  skipDeployments?: boolean;
  tree?: boolean;
  summary?: boolean;
}

/**
 * Create show command with dependency injection
 */
export function createShowCommand(
  registryService?: RegistryService,
  deploymentMapper?: DeploymentMapper,
  statusService?: RepositoryStatusService,
  formatter?: OutputFormatter,
  stateManager?: StateManager
): Command {
  const showCommand = new ShowCommand(registryService, deploymentMapper, statusService, formatter, stateManager);
  
  return new Command('show')
    .description('Show repository information')
    .argument('[repository]', 'Repository number, name, or ID to show (optional)')
    .option('--files-only', 'Show only deployed files list')
    .option('--format <format>', 'Output format (table, json, yaml, tree)', 'table')
    .option('-v, --verbose', 'Show detailed status information')
    .option('--skip-deployments', 'Skip deployment information')
    .option('--tree', 'Show files in tree format')
    .option('--summary', 'Show summary view (when showing all repositories)')
    .action((repositoryName: string | undefined, options: ShowOptions) => 
      showCommand.execute(repositoryName, options)
    );
}

/**
 * Default show command export for backward compatibility
 */
export const showCommand = createShowCommand();