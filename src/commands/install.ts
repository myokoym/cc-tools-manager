/**
 * Install command implementation
 * リポジトリのファイルを.claudeディレクトリにデプロイ
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { RegistryService } from '../core/RegistryService';
import { DeploymentService } from '../core/DeploymentService';
import { StateManager } from '../core/StateManager';
import { Repository } from '../types/repository';
import { promptYesNo } from '../utils/prompt';
import ora from 'ora';
import { selectRepository, displayNumberedRepositories } from '../utils/repository-selector';

/**
 * インストールオプション
 */
interface InstallOptions {
  force?: boolean;
  all?: boolean;
  interactive?: boolean;
}

/**
 * リポジトリをインストール
 */
async function installRepository(repositoryName: string | undefined, options: InstallOptions): Promise<void> {
  const registryService = new RegistryService();
  const deploymentService = new DeploymentService();
  const stateManager = new StateManager();
  
  try {
    const repositories = await registryService.list();
    
    if (repositories.length === 0) {
      console.log(chalk.yellow('No repositories registered.'));
      return;
    }
    
    // インストール対象のリポジトリを特定
    let targetRepos: Repository[];
    
    if (repositoryName) {
      // 番号またはID/名前で検索
      const repo = await selectRepository(repositoryName);
      if (!repo) {
        console.error(chalk.red(`Repository "${repositoryName}" not found.`));
        // 利用可能なリポジトリを表示
        if (repositories.length > 0) {
          displayNumberedRepositories(repositories);
        }
        process.exit(1);
      }
      targetRepos = [repo];
    } else {
      // リポジトリ名が指定されていない場合は全リポジトリをインストール
      targetRepos = repositories;
    }
    
    // 各リポジトリをインストール
    for (const repo of targetRepos) {
      console.log(chalk.bold(`\nInstalling ${repo.name}...`));
      
      const spinner = ora();
      
      try {
        // デプロイメントの検出
        spinner.start('Checking for deployment files...');
        
        // タイプベースデプロイメントの場合は別処理
        if (repo.type && repo.deploymentMode === 'type-based') {
          spinner.succeed(`Type-based deployment mode (${repo.type})`);
          
          // デプロイメント確認（--forceでスキップ）
          if (!options.force) {
            const shouldDeploy = await promptYesNo(
              chalk.yellow('\nDeploy files? (y/N): '),
              false
            );
            
            if (!shouldDeploy) {
              console.log(chalk.gray('Skipping deployment'));
              continue;
            }
          }
          
          spinner.start('Deploying files...');
          const deployResult = await deploymentService.deploy(repo, { interactive: options.interactive });
          
          if (deployResult.deployed.length > 0) {
            spinner.succeed(`Deployed ${deployResult.deployed.length} files`);
            
            // デプロイメント情報を更新
            const deployedFiles = deployResult.deployed.map(d => d.source);
            const updatedDeployments = {
              commands: repo.type === 'commands' ? deployedFiles : [],
              agents: repo.type === 'agents' ? deployedFiles : [],
              hooks: repo.type === 'hooks' ? deployedFiles : []
            };
            
            await registryService.update(repo.id, { 
              deployments: updatedDeployments,
              lastUpdatedAt: new Date().toISOString()
            });
          } else {
            spinner.succeed('No new files to deploy');
          }
          
          // StateManagerに状態を保存
          const gitUpdateResult = {
            filesChanged: 0,
            insertions: 0,
            deletions: 0,
            currentCommit: '',
            previousCommit: ''
          };
          await stateManager.updateRepositoryState(repo, gitUpdateResult, deployResult);
          
          console.log(chalk.green(`✓ ${repo.name} installed successfully`));
          continue;
        }
        
        // 通常のパターンベースデプロイメント
        const patterns = await deploymentService.detectPatterns(repo.localPath!);
        
        if (patterns.length === 0) {
          spinner.succeed('No deployment files found');
          continue;
        }
        
        spinner.succeed(`Found ${patterns.length} deployable files`);
        
        // デプロイメント確認（--forceでスキップ）
        if (!options.force) {
          const shouldDeploy = await promptYesNo(
            chalk.yellow('\nDeploy files? (y/N): '),
            false
          );
          
          if (!shouldDeploy) {
            console.log(chalk.gray('Skipping deployment'));
            continue;
          }
        }
        
        // ファイルをデプロイ
        spinner.start('Deploying files...');
        const deployResult = await deploymentService.deploy(repo, { interactive: options.interactive });
        
        if (deployResult.deployed.length > 0) {
          spinner.succeed(`Deployed ${deployResult.deployed.length} files`);
          
          // デプロイメント情報を更新
          const deployedFiles = deployResult.deployed.map(d => d.source);
          const updatedDeployments = {
            commands: patterns.filter(p => p.targetType === 'commands').map(p => p.file),
            agents: patterns.filter(p => p.targetType === 'agents').map(p => p.file),
            hooks: patterns.filter(p => p.targetType === 'hooks').map(p => p.file)
          };
          
          await registryService.update(repo.id, { 
            deployments: updatedDeployments,
            lastUpdatedAt: new Date().toISOString()
          });
          
          // StateManagerに状態を保存
          const gitUpdateResult = {
            filesChanged: 0,
            insertions: 0,
            deletions: 0,
            currentCommit: '',
            previousCommit: ''
          };
          await stateManager.updateRepositoryState(repo, gitUpdateResult, deployResult);
          
        } else {
          spinner.succeed('No new files to deploy');
        }
        
        console.log(chalk.green(`✓ ${repo.name} installed successfully`));
        
      } catch (error) {
        spinner.fail('Install failed');
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`  Error: ${errorMessage}`));
        
        if (!options.all) {
          process.exit(1);
        }
      }
    }
    
    if (options.all) {
      console.log(chalk.bold(`\n✓ Installed ${targetRepos.length} repositories`));
    }
    
  } catch (error) {
    console.error(chalk.red('Error installing repository:'), error);
    process.exit(1);
  }
}

/**
 * Install command definition
 */
export const installCommand = new Command('install')
  .description('Install files from a registered repository')
  .argument('[repository]', 'Repository name to install')
  .option('-f, --force', 'Skip deployment confirmation prompt')
  .option('-a, --all', 'Install all repositories')
  .option('-i, --interactive', 'Prompt before overwriting each file')
  .action(installRepository);