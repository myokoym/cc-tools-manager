/**
 * Install Command Tests
 */

import { installCommand } from '../../../src/commands/install';
import { Option } from 'commander';

describe('Install Command', () => {
  it('should create install command with correct name and description', () => {
    const command = installCommand;
    
    expect(command.name()).toBe('install');
    expect(command.description()).toContain('Install files from a registered repository');
  });

  it('should accept optional repository argument', () => {
    const command = installCommand;
    
    // Check if command accepts the right arguments
    const helpText = command.helpInformation();
    expect(helpText).toContain('[repository]');
  });

  it('should have all required options', () => {
    const command = installCommand;
    const options = command.options;
    
    const optionNames = options.map((opt: Option) => opt.long);
    expect(optionNames).toContain('--force');
    expect(optionNames).toContain('--all');
    expect(optionNames).toContain('--interactive');
  });

  it('should have correct option descriptions', () => {
    const command = installCommand;
    const forceOption = command.options.find((opt: Option) => opt.long === '--force');
    const allOption = command.options.find((opt: Option) => opt.long === '--all');
    
    expect(forceOption?.description).toContain('Skip deployment confirmation prompt');
    expect(allOption?.description).toContain('Install all repositories');
  });
});