/**
 * Install Command Tests
 */

import { createInstallCommand } from '../../../src/commands/install';

describe('Install Command', () => {
  it('should create install command with correct name and description', () => {
    const command = createInstallCommand();
    
    expect(command.name()).toBe('install');
    expect(command.description()).toContain('Install files from registered repositories');
  });

  it('should accept optional repository argument', () => {
    const command = createInstallCommand();
    
    // Check if command accepts the right arguments
    const helpText = command.helpInformation();
    expect(helpText).toContain('[repository]');
  });

  it('should have all required options', () => {
    const command = createInstallCommand();
    const options = command.options;
    
    const optionNames = options.map(opt => opt.long);
    expect(optionNames).toContain('--force');
    expect(optionNames).toContain('--yes');
    expect(optionNames).toContain('--dry-run');
    expect(optionNames).toContain('--pattern');
    expect(optionNames).toContain('--skip-conflicts');
    expect(optionNames).toContain('--silent');
    expect(optionNames).toContain('--verbose');
  });

  it('should have correct option descriptions', () => {
    const command = createInstallCommand();
    const forceOption = command.options.find(opt => opt.long === '--force');
    const yesOption = command.options.find(opt => opt.long === '--yes');
    
    expect(forceOption?.description).toContain('Force installation');
    expect(yesOption?.description).toContain('Skip confirmation');
  });
});