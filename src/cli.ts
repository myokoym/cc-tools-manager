/**
 * CLI implementation for cc-tools-manager
 */

import { Command } from 'commander';

const program = new Command();

program
  .name('cc-tools-manager')
  .description('Claude Code Tools Manager - Manage MCP servers and tools')
  .version('0.1.0');

// 遅延インポートでコマンドを追加
program
  .command('register')
  .description('Register a new repository')
  .argument('<url>', 'Repository URL')
  .option('-n, --name <name>', 'Custom repository name')
  .option('-t, --tag <tag>', 'Add tag to repository')
  .option('-d, --data-dir <dir>', 'Data directory path')
  .action(async (...args) => {
    const { default: createRegisterCommand } = await import('./commands/register');
    const cmd = createRegisterCommand();
    await cmd.parseAsync(['node', 'register', ...process.argv.slice(3)]);
  });

program
  .command('update')
  .description('Update repositories')
  .argument('[repository]', 'Repository name or number to update')
  .option('--concurrent <number>', 'Number of concurrent updates', '3')
  .option('--skip-deploy', 'Skip deployment after update')
  .action(async (...args) => {
    const { updateCommand } = await import('./commands');
    await updateCommand.parseAsync(['node', 'update', ...process.argv.slice(3)]);
  });

program
  .command('list')
  .aliases(['ls'])
  .description('List all registered repositories')
  .option('-v, --verbose', 'Show detailed information')
  .action(async (...args) => {
    const { listCommand } = await import('./commands');
    await listCommand.parseAsync(['node', 'list', ...process.argv.slice(3)]);
  });

program
  .command('status')
  .description('Show repository status')
  .argument('[repository]', 'Repository name or number')
  .action(async (...args) => {
    const { statusCommand } = await import('./commands');
    await statusCommand.parseAsync(['node', 'status', ...process.argv.slice(3)]);
  });

program
  .command('remove')
  .description('Remove a repository from the registry')
  .argument('<repository>', 'Repository name or ID to remove')
  .option('-f, --force', 'Skip confirmation prompt')
  .option('--keep-files', 'Keep deployed files')
  .option('--keep-repo', 'Keep local repository clone')
  .action(async (...args) => {
    const { createRemoveCommand } = await import('./commands/remove');
    const cmd = createRemoveCommand();
    await cmd.parseAsync(['node', 'remove', ...process.argv.slice(3)]);
  });

// Error handling for unknown commands
program.on('command:*', () => {
  console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
  process.exit(1);
});

export { program as cli };