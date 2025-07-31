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

// 同期的にコマンドを登録
import createRegisterCommand from './commands/register';
import { updateCommand, listCommand, statusCommand } from './commands';
import { createRemoveCommand } from './commands/remove';

program.addCommand(createRegisterCommand());
program.addCommand(updateCommand);
program.addCommand(listCommand);
program.addCommand(statusCommand);
program.addCommand(createRemoveCommand());

// Error handling for unknown commands
program.on('command:*', () => {
  console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
  process.exit(1);
});

export { program as cli };