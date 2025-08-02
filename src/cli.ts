/**
 * CLI implementation for ccpm
 */

import { Command } from 'commander';
import * as packageJson from '../package.json';

const program = new Command();

program
  .name('ccpm')
  .description('Claude Code Package Manager - Manage MCP servers and tools')
  .version(packageJson.version);

// Core services
import { RegistryService } from './core/RegistryService';
import { GitManager } from './core/GitManager';
import { StateManager } from './core/StateManager';
import { DeploymentMapper } from './services/deployment-mapper';
import { RepositoryStatusService } from './services/repository-status';
import { OutputFormatter } from './formatters/output-formatter';

// 同期的にコマンドを登録
import createRegisterCommand from './commands/register';
import { updateCommand, listCommand, statusCommand, createShowCommand, createInstallCommand } from './commands';
import { createRemoveCommand } from './commands/remove';
import createEditCommand from './commands/edit';

// Initialize core services
const registryService = new RegistryService();
const gitManager = new GitManager();
const stateManager = new StateManager();
const deploymentMapper = new DeploymentMapper();
const repositoryStatusService = new RepositoryStatusService(gitManager, stateManager);
const outputFormatter = new OutputFormatter();

// Register commands with dependency injection
program.addCommand(createRegisterCommand());
program.addCommand(updateCommand);
program.addCommand(listCommand);
program.addCommand(createShowCommand(registryService, deploymentMapper, repositoryStatusService, outputFormatter));
program.addCommand(statusCommand);
program.addCommand(createRemoveCommand());
program.addCommand(createEditCommand());
program.addCommand(createInstallCommand());

// Error handling for unknown commands
program.on('command:*', () => {
  console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
  process.exit(1);
});

export { program as cli };