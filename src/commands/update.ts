/**
 * Update command implementation
 * リポジトリを最新の状態に更新
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { RegistryService } from '../core/RegistryService';
import { GitManager } from '../core/GitManager';
import { DeploymentService } from '../core/DeploymentService';
import { StateManager } from '../core/StateManager';
import { Repository } from '../types/repository';
import { CC_TOOLS_HOME, REPOS_DIR } from '../constants/paths';
import { ensureDir } from '../utils/file-system';
import { promptYesNo } from '../utils/prompt';
import * as fs from 'fs/promises';
import ora from 'ora';
import { selectRepository, displayNumberedRepositories } from '../utils/repository-selector';

/**
 * ディレクトリがGitリポジトリかどうかを確認
 */
async function isGitRepository(dirPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(dirPath, '.git'));
    return true;
  } catch {
    return false;
  }
}

/**
 * 更新オプション
 */
interface UpdateOptions {
  force?: boolean;
  all?: boolean;
  interactive?: boolean;
}

/**
 * リポジトリを更新
 */
async function updateRepository(repositoryName: string | undefined, options: UpdateOptions): Promise<void> {
  const registryService = new RegistryService();
  const deploymentService = new DeploymentService();
  const stateManager = new StateManager();
  
  try {
    const repositories = await registryService.list();
    
    if (repositories.length === 0) {
      console.log(chalk.yellow('No repositories registered.'));
      return;
    }
    
    // 更新対象のリポジトリを特定
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
      // リポジトリ名が指定されていない場合は全リポジトリを更新
      targetRepos = repositories;
    }
    
    // 各リポジトリを更新
    for (const repo of targetRepos) {
      console.log(chalk.bold(`\nUpdating ${repo.name}...`));
      
      const spinner = ora();
      
      try {
        // Git pull
        spinner.start('Pulling latest changes...');
        
        let gitUpdateResult;
        
        if (!repo.localPath || !(await isGitRepository(repo.localPath))) {
          // リポジトリがまだクローンされていない場合、クローンする
          spinner.text = 'Cloning repository...';
          const repoDir = repo.localPath || path.join(REPOS_DIR, repo.name.replace('/', '-'));
          
          // localPathを設定
          repo.localPath = repoDir;
          
          // ディレクトリを作成
          await ensureDir(path.dirname(repoDir));
          
          const gitManager = new GitManager();
          await gitManager.clone(repo);
          
          // データベースのlocalPathを更新
          await registryService.update(repo.id, { localPath: repoDir });
          
          // クローンの場合の仮の更新結果
          gitUpdateResult = {
            filesChanged: 0,
            insertions: 0,
            deletions: 0,
            currentCommit: await gitManager.getLatestCommit(repo),
            previousCommit: ''
          };
          
          spinner.succeed('Repository cloned successfully');
        } else {
          // ディレクトリが存在することを確認
          await ensureDir(repo.localPath);
          
          const gitManager = new GitManager(path.dirname(repo.localPath));
          gitUpdateResult = await gitManager.pull(repo);
          
          if (gitUpdateResult.filesChanged === 0) {
            spinner.succeed('Already up to date');
          } else {
            spinner.succeed(`Updated: ${gitUpdateResult.filesChanged} files changed, +${gitUpdateResult.insertions} -${gitUpdateResult.deletions}`);
          }
        }
        
        // デプロイメントの再検出と更新
        spinner.start('Checking for deployment changes...');
        
        // パターンを再検出
        const patterns = await deploymentService.detectPatterns(repo.localPath);
        
        if (patterns.length > 0) {
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
          
          spinner.start('Deploying files...');
          const deployResult = await deploymentService.deploy(repo, { interactive: options.interactive });
          
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
          
          // StateManagerに状態を保存
          await stateManager.updateRepositoryState(repo, gitUpdateResult, deployResult);
        } else {
          spinner.succeed('No deployment files found');
          
          // デプロイがない場合でも状態を更新
          const emptyDeployResult = {
            deployed: [],
            skipped: [],
            failed: [],
            conflicts: []
          };
          await stateManager.updateRepositoryState(repo, gitUpdateResult, emptyDeployResult);
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
  .option('-f, --force', 'Skip deployment confirmation prompt')
  .option('-a, --all', 'Update all repositories')
  .option('-i, --interactive', 'Prompt before overwriting each file')
  .action(updateRepository);