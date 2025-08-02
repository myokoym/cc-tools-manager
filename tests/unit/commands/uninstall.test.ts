/**
 * Uninstall Command Tests
 */

import { uninstallCommand } from '../../../src/commands/uninstall';
import { Option } from 'commander';

describe('Uninstall Command', () => {
  it('should create uninstall command with correct name and description', () => {
    const command = uninstallCommand;
    
    expect(command.name()).toBe('uninstall');
    expect(command.description()).toContain('Remove deployed files from .claude directory');
  });

  it('should accept optional repository argument', () => {
    const command = uninstallCommand;
    
    // Check if command accepts the right arguments
    const helpText = command.helpInformation();
    expect(helpText).toContain('[repository]');
  });

  it('should have all required options', () => {
    const command = uninstallCommand;
    const options = command.options;
    
    const optionNames = options.map((opt: Option) => opt.long);
    expect(optionNames).toContain('--force');
    expect(optionNames).toContain('--all');
    expect(optionNames).toContain('--dry-run');
  });

  it('should have correct option descriptions', () => {
    const command = uninstallCommand;
    const forceOption = command.options.find((opt: Option) => opt.long === '--force');
    const dryRunOption = command.options.find((opt: Option) => opt.long === '--dry-run');
    
    expect(forceOption?.description).toContain('Skip removal confirmation prompt');
    expect(dryRunOption?.description).toContain('Show what would be removed without making changes');
  });
});