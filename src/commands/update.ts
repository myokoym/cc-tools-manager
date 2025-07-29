/**
 * Update command implementation
 * リポジトリを最新の状態に更新
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { RegistryService } from '../core/RegistryService';
import { GitManager } from '../core/GitManager';
import { DeploymentService } from '../core/DeploymentService';
import { Repository } from '../types/repository';
import ora from 'ora';

/**
 * 更新オプション
 */
interface UpdateOptions {
  force?: boolean;
  all?: boolean;
}

/**
 * リポジトリを更新
 */
async function updateRepository(repositoryName: string | undefined, options: UpdateOptions): Promise<void> {
  const registryService = new RegistryService();
  const gitManager = new GitManager();
  const deploymentService = new DeploymentService();
  
  try {
    const repositories = await registryService.list();
    
    if (repositories.length === 0) {
      console.log(chalk.yellow('No repositories registered.'));
      return;
    }
    
    // 更新対象のリポジトリを特定
    let targetRepos: Repository[];
    
    if (options.all) {
      targetRepos = repositories;
    } else if (repositoryName) {
      const repo = repositories.find(r => r.name === repositoryName);
      if (!repo) {
        console.error(chalk.red(`Repository "${repositoryName}" not found.`));
        process.exit(1);
      }
      targetRepos = [repo];
    } else {
      console.error(chalk.red('Please specify a repository name or use --all flag.'));
      process.exit(1);
    }
    
    // 各リポジトリを更新
    for (const repo of targetRepos) {
      console.log(chalk.bold(`\nUpdating ${repo.name}...`));
      
      const spinner = ora();
      
      try {
        // Git pull
        spinner.start('Pulling latest changes...');
        
        if (!repo.localPath) {
          spinner.fail('Repository not cloned locally');
          continue;
        }
        
        const pullResult = await gitManager.pull(repo);
        
        if (pullResult.filesChanged === 0) {
          spinner.succeed('Already up to date');
        } else {
          spinner.succeed(`Updated: ${pullResult.filesChanged} files changed, +${pullResult.insertions} -${pullResult.deletions}`);
        }
        
        // デプロイメントの再検出と更新
        spinner.start('Checking for deployment changes...');
        
        // パターンを再検出
        const patterns = await deploymentService.detectPatterns(repo.localPath);
        
        if (patterns.length > 0) {
          spinner.succeed(`Found ${patterns.length} deployable files`);
          
          // デプロイメントを実行
          if (!options.force) {
            const readline = await import('readline');
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            });
            
            const answer = await new Promise<string>((resolve) => {
              rl.question(chalk.yellow('\nDeploy files? (y/N): '), resolve);
            });
            rl.close();
            
            if (answer.toLowerCase() !== 'y') {
              console.log(chalk.gray('Skipping deployment'));
              continue;
            }
          }
          
          spinner.start('Deploying files...');
          const deployResult = await deploymentService.deploy(repo);
          
          if (deployResult.deployed.length > 0) {
            spinner.succeed(`Deployed ${deployResult.deployed.length} files`);
          } else {
            spinner.succeed('No new files to deploy');
          }
          
          // デプロイメント情報を更新
          const updatedDeployments = {
            commands: patterns.filter(p => p.targetType === 'commands').map(p => p.file),
            agents: patterns.filter(p => p.targetType === 'agents').map(p => p.file),
            hooks: patterns.filter(p => p.targetType === 'hooks').map(p => p.file)
          };
          
          await registryService.update(repo.id, { 
            deployments: updatedDeployments,
            lastUpdatedAt: new Date().toISOString()
          });
        } else {
          spinner.succeed('No deployment files found');
        }
        
        // ステータスを更新
        await registryService.update(repo.id, { status: 'active' });
        console.log(chalk.green(`✓ ${repo.name} updated successfully`));
        
      } catch (error) {
        spinner.fail('Update failed');
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`  Error: ${errorMessage}`));
        
        // エラーステータスを設定
        await registryService.update(repo.id, { 
          status: 'error'
        });
        
        if (!options.all) {
          process.exit(1);
        }
      }
    }
    
    if (options.all) {
      console.log(chalk.bold(`\n✓ Updated ${targetRepos.length} repositories`));
    }
    
  } catch (error) {
    console.error(chalk.red('Error updating repository:'), error);
    process.exit(1);
  }
}

/**
 * Update command definition
 */
export const updateCommand = new Command('update')
  .description('Update repository to latest version')
  .argument('[repository]', 'Repository name to update')
  .option('-f, --force', 'Skip confirmation prompts')
  .option('-a, --all', 'Update all repositories')
  .action(updateRepository);