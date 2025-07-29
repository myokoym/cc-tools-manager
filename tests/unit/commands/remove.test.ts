/**
 * Remove Command Tests
 */

// Mock dependencies
const mockPrompt = jest.fn();
jest.mock('inquirer', () => ({
  prompt: mockPrompt
}));
jest.mock('../../../src/core/RegistryService');
jest.mock('ora', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
  })),
}));
jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    red: (str: string) => str,
    green: (str: string) => str,
    yellow: (str: string) => str,
    cyan: (str: string) => str,
    gray: (str: string) => str,
    bold: (str: string) => str,
  }
}));

import { Command } from 'commander';
import inquirer from 'inquirer';
import { createRemoveCommand } from '../../../src/commands/remove';
import { RegistryService } from '../../../src/core/RegistryService';
import { Repository } from '../../../src/types';

describe('Remove Command', () => {
  let mockRegistryService: jest.Mocked<RegistryService>;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;
  let command: Command;

  const mockRepository: Repository = {
    id: 'abc123def456',
    name: 'test-org/test-repo',
    url: 'https://github.com/test-org/test-repo',
    registeredAt: '2024-01-15T10:00:00Z',
    deployments: {
      commands: ['cmd1', 'cmd2'],
      agents: ['agent1'],
      hooks: []
    },
    status: 'active'
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: string | number | null | undefined) => {
      throw new Error(`Process.exit called with code ${code}`);
    }) as any);

    // Setup RegistryService mock
    mockRegistryService = new RegistryService() as jest.Mocked<RegistryService>;
    (RegistryService as jest.MockedClass<typeof RegistryService>).mockImplementation(() => mockRegistryService);

    // Create command
    command = createRemoveCommand();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Command Structure', () => {
    test('should have correct name and description', () => {
      expect(command.name()).toBe('remove');
      expect(command.description()).toBe('Remove a repository from the registry');
    });

    test('should have repository argument', () => {
      const args = command.registeredArguments;
      expect(args).toHaveLength(1);
      expect(args[0].name()).toBe('repository');
      expect(args[0].required).toBe(true);
    });

    test('should have force option', () => {
      const forceOption = command.options.find(opt => opt.flags === '-f, --force');
      expect(forceOption).toBeDefined();
      expect(forceOption?.description).toBe('Skip confirmation prompt');
    });
  });

  describe('Repository Removal', () => {
    test('should remove repository with confirmation', async () => {
      // Setup mocks
      mockRegistryService.find.mockResolvedValue(mockRepository);
      mockRegistryService.remove.mockResolvedValue(undefined);
      mockPrompt.mockResolvedValue({ confirmed: true });

      // Execute command
      await command.parseAsync(['node', 'test', 'test-repo']);

      // Verify repository search
      expect(mockRegistryService.find).toHaveBeenCalledWith('test-repo');

      // Verify confirmation prompt
      expect(mockPrompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'confirm',
          name: 'confirmed',
          message: expect.stringContaining('Are you sure'),
          default: false
        })
      ]);

      // Verify removal
      expect(mockRegistryService.remove).toHaveBeenCalledWith('abc123def456');

      // Verify success message
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Repository 'test-org/test-repo' has been removed")
      );
    });

    test('should skip confirmation with --force option', async () => {
      // Setup mocks
      mockRegistryService.find.mockResolvedValue(mockRepository);
      mockRegistryService.remove.mockResolvedValue(undefined);

      // Execute command with --force
      await command.parseAsync(['node', 'test', 'test-repo', '--force']);

      // Verify no confirmation prompt
      expect(mockPrompt).not.toHaveBeenCalled();

      // Verify removal
      expect(mockRegistryService.remove).toHaveBeenCalledWith('abc123def456');
    });

    test('should cancel removal when not confirmed', async () => {
      // Setup mocks
      mockRegistryService.find.mockResolvedValue(mockRepository);
      mockPrompt.mockResolvedValue({ confirmed: false });

      // Execute command
      await command.parseAsync(['node', 'test', 'test-repo']);

      // Verify no removal
      expect(mockRegistryService.remove).not.toHaveBeenCalled();

      // Verify cancellation message
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removal cancelled')
      );
    });

    test('should display deployment warning when repository has deployments', async () => {
      // Setup mocks
      mockRegistryService.find.mockResolvedValue(mockRepository);
      mockRegistryService.remove.mockResolvedValue(undefined);
      mockPrompt.mockResolvedValue({ confirmed: true });

      // Execute command
      await command.parseAsync(['node', 'test', 'test-repo']);

      // Verify deployment warning
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('This repository has 3 active deployment(s)')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('2 command(s)')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 agent(s)')
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle repository not found', async () => {
      // Setup mock
      mockRegistryService.find.mockResolvedValue(null);

      // Execute command and expect error
      await expect(
        command.parseAsync(['node', 'test', 'non-existent'])
      ).rejects.toThrow('Process.exit called with code 1');

      // Verify error message
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Repository not found: non-existent')
      );
    });

    test('should handle removal error', async () => {
      // Setup mocks
      mockRegistryService.find.mockResolvedValue(mockRepository);
      mockRegistryService.remove.mockRejectedValue(new Error('Database error'));
      mockPrompt.mockResolvedValue({ confirmed: true });

      // Execute command and expect error
      await expect(
        command.parseAsync(['node', 'test', 'test-repo'])
      ).rejects.toThrow('Process.exit called with code 1');

      // Verify error message
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error: Database error')
      );
    });
  });

  describe('Repository Search', () => {
    test('should find repository by ID', async () => {
      // Setup mocks
      mockRegistryService.find.mockResolvedValue(mockRepository);
      mockRegistryService.remove.mockResolvedValue(undefined);
      mockPrompt.mockResolvedValue({ confirmed: true });

      // Execute command with ID
      await command.parseAsync(['node', 'test', 'abc123def456']);

      // Verify search by ID
      expect(mockRegistryService.find).toHaveBeenCalledWith('abc123def456');
      expect(mockRegistryService.remove).toHaveBeenCalledWith('abc123def456');
    });

    test('should find repository by name', async () => {
      // Setup mocks
      mockRegistryService.find.mockResolvedValue(mockRepository);
      mockRegistryService.remove.mockResolvedValue(undefined);
      mockPrompt.mockResolvedValue({ confirmed: true });

      // Execute command with name
      await command.parseAsync(['node', 'test', 'test-org/test-repo']);

      // Verify search by name
      expect(mockRegistryService.find).toHaveBeenCalledWith('test-org/test-repo');
      expect(mockRegistryService.remove).toHaveBeenCalledWith('abc123def456');
    });
  });
});