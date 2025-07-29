/**
 * CLI implementation for cc-tools-manager
 */

import { Command } from 'commander';
import { listCommand, statusCommand, updateCommand } from './commands';
import { createRemoveCommand } from './commands/remove';
import createRegisterCommand from './commands/register';

const program = new Command();

program
  .name('cc-tools-manager')
  .description('Claude Code Tools Manager - Manage MCP servers and tools')
  .version('0.1.0');

// Add register command
program.addCommand(createRegisterCommand());

// Add the update command from commands/update.ts
program.addCommand(updateCommand);

// Add the list command from commands/list.ts
program.addCommand(listCommand);

// Add the status command from commands/status.ts
program.addCommand(statusCommand);

// Add remove command
program.addCommand(createRemoveCommand());

// Error handling for unknown commands
program.on('command:*', () => {
  console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
  process.exit(1);
});

export { program as cli };