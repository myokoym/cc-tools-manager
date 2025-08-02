/**
 * Uninstall Command Tests
 */

import { createUninstallCommand } from '../../../src/commands/uninstall';

describe('Uninstall Command', () => {
  it('should create uninstall command with correct name and description', () => {
    const command = createUninstallCommand();
    
    expect(command.name()).toBe('uninstall');
    expect(command.description()).toContain('Uninstall files from .claude directory');
  });

  it('should accept optional repository argument', () => {
    const command = createUninstallCommand();
    
    // Check if command accepts the right arguments
    const helpText = command.helpInformation();
    expect(helpText).toContain('[repository]');
  });

  it('should have all required options', () => {
    const command = createUninstallCommand();
    const options = command.options;
    
    const optionNames = options.map(opt => opt.long);
    expect(optionNames).toContain('--force');
    expect(optionNames).toContain('--yes');
    expect(optionNames).toContain('--dry-run');
    expect(optionNames).toContain('--keep-backup');
    expect(optionNames).toContain('--silent');
    expect(optionNames).toContain('--verbose');
  });

  it('should have correct option descriptions', () => {
    const command = createUninstallCommand();
    const forceOption = command.options.find(opt => opt.long === '--force');
    const keepBackupOption = command.options.find(opt => opt.long === '--keep-backup');
    
    expect(forceOption?.description).toContain('Force uninstall');
    expect(keepBackupOption?.description).toContain('Keep backup');
  });
});