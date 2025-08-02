/**
 * Unregister Command Tests
 */

import { unregisterCommand } from '../../../src/commands/unregister';

describe('Unregister Command', () => {
  it('should create unregister command with correct name and description', () => {
    expect(unregisterCommand.name()).toBe('unregister');
    expect(unregisterCommand.description()).toBe('Remove repository from registry (keeps deployed files)');
  });

  it('should accept optional repository argument', () => {
    // Check if command accepts the right arguments
    const helpText = unregisterCommand.helpInformation();
    expect(helpText).toContain('[repository]');
  });

  it('should have all required options', () => {
    const options = unregisterCommand.options;
    
    const optionNames = options.map(opt => opt.long);
    expect(optionNames).toContain('--force');
    expect(optionNames).toContain('--all');
  });

  it('should have correct option descriptions', () => {
    const forceOption = unregisterCommand.options.find(opt => opt.long === '--force');
    const allOption = unregisterCommand.options.find(opt => opt.long === '--all');
    
    expect(forceOption?.description).toContain('Skip removal confirmation prompt');
    expect(allOption?.description).toContain('Unregister all repositories');
  });
});