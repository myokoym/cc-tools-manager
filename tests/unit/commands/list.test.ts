/**
 * Tests for list command
 */

import { listCommand } from '../../../src/commands/list';
import { RegistryService } from '../../../src/core/RegistryService';
import { StateManager } from '../../../src/core/StateManager';
import { Repository } from '../../../src/types/repository';
import chalk from 'chalk';

// Mock dependencies
jest.mock('../../../src/core/RegistryService');
jest.mock('../../../src/core/StateManager');
jest.mock('chalk', () => ({
  bold: jest.fn((text: string) => text),
  gray: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  red: jest.fn((text: string) => text),
  cyan: jest.fn((text: string) => text),
  blue: jest.fn((text: string) => text),
}));

describe('List Command', () => {
  let mockRegistryService: jest.Mocked<RegistryService>;
  let mockStateManager: jest.Mocked<StateManager>;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Mock RegistryService
    mockRegistryService = new RegistryService() as jest.Mocked<RegistryService>;
    
    // Mock StateManager
    mockStateManager = new StateManager() as jest.Mocked<StateManager>;
    mockStateManager.getRepositoryState = jest.fn().mockResolvedValue(null);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('listCommand', () => {
    it('should be defined with correct properties', () => {
      expect(listCommand.name()).toBe('list');
      expect(listCommand.description()).toBe('List all registered repositories');
      expect(listCommand.aliases()).toContain('ls');
    });

    it('should have verbose option', () => {
      const options = listCommand.options;
      const verboseOption = options.find(opt => opt.short === '-v');
      expect(verboseOption).toBeDefined();
      expect(verboseOption?.long).toBe('--verbose');
      expect(verboseOption?.description).toBe('Show detailed information');
    });
  });

  describe('when listing repositories', () => {
    it('should display message when no repositories are registered', async () => {
      mockRegistryService.list.mockResolvedValue([]);

      await listCommand.parseAsync(['node', 'test', 'list']);

      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.yellow('No repositories registered.'));
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.gray('Use "cc-tools-manager register <url>" to add a repository.'));
    });

    it('should display repositories in table format', async () => {
      const mockRepositories: Repository[] = [
        {
          id: '123abc',
          name: 'owner/repo1',
          url: 'https://github.com/owner/repo1',
          registeredAt: '2025-01-15T10:00:00Z',
          deployments: {
            commands: ['cmd1', 'cmd2'],
            agents: ['agent1'],
            hooks: []
          },
          status: 'active'
        },
        {
          id: '456def',
          name: 'owner/repo2',
          url: 'https://github.com/owner/repo2',
          registeredAt: '2025-01-16T10:00:00Z',
          deployments: {
            commands: [],
            agents: [],
            hooks: ['hook1']
          },
          status: 'uninitialized'
        }
      ];

      mockRegistryService.list.mockResolvedValue(mockRepositories);

      await listCommand.parseAsync(['node', 'test', 'list']);

      // Verify header
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.bold('\nRegistered Repositories:\n'));
      
      // Verify table headers
      const logCalls = consoleLogSpy.mock.calls.map(call => call[0]);
      const headerRow = logCalls.find(call => call.includes('Name') && call.includes('Status'));
      expect(headerRow).toBeDefined();
      expect(headerRow).toContain('Name');
      expect(headerRow).toContain('Status');
      expect(headerRow).toContain('Deployments');
      expect(headerRow).toContain('Registered');

      // Verify repository rows
      const allLogs = consoleLogSpy.mock.calls.map(call => call[0]);
      expect(allLogs.some(log => log.includes('owner/repo1'))).toBe(true);
      expect(allLogs.some(log => log.includes('owner/repo2'))).toBe(true);
      
      // Verify summary
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.gray('Total: 2 repositories'));
    });

    it('should display detailed information with --verbose flag', async () => {
      const mockRepository: Repository = {
        id: '123abc',
        name: 'owner/repo',
        url: 'https://github.com/owner/repo',
        registeredAt: '2025-01-15T10:00:00Z',
        lastUpdatedAt: '2025-01-16T15:30:00Z',
        deployments: {
          commands: ['cmd1'],
          agents: ['agent1'],
          hooks: ['hook1']
        },
        status: 'active',
        localPath: '/path/to/repo'
      };

      mockRegistryService.list.mockResolvedValue([mockRepository]);

      await listCommand.parseAsync(['node', 'test', 'list', '--verbose']);

      // Verify detailed information sections
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.bold('\nDetailed Information:\n'));
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.bold('owner/repo:'));
      
      const allLogs = consoleLogSpy.mock.calls.map(call => call[0]);
      expect(allLogs).toContain(`  ID: ${chalk.gray('123abc')}`);
      expect(allLogs).toContain(`  URL: ${chalk.gray('https://github.com/owner/repo')}`);
      expect(allLogs).toContain(`  Local Path: ${chalk.gray('/path/to/repo')}`);
      expect(allLogs).toContain('  Deployments:');
      expect(allLogs).toContain(`    Commands: ${chalk.cyan('cmd1')}`);
      expect(allLogs).toContain(`    Agents: ${chalk.cyan('agent1')}`);
      expect(allLogs).toContain(`    Hooks: ${chalk.cyan('hook1')}`);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Failed to read registry');
      mockRegistryService.list.mockRejectedValue(error);

      await listCommand.parseAsync(['node', 'test', 'list']);

      expect(consoleErrorSpy).toHaveBeenCalledWith(chalk.red('Error listing repositories:'), error);
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should display correct status colors and symbols', async () => {
      const mockRepositories: Repository[] = [
        {
          id: '1',
          name: 'repo1',
          url: 'https://github.com/owner/repo1',
          registeredAt: '2025-01-15T10:00:00Z',
          deployments: { commands: [], agents: [], hooks: [] },
          status: 'active'
        },
        {
          id: '2',
          name: 'repo2',
          url: 'https://github.com/owner/repo2',
          registeredAt: '2025-01-15T10:00:00Z',
          deployments: { commands: [], agents: [], hooks: [] },
          status: 'error'
        },
        {
          id: '3',
          name: 'repo3',
          url: 'https://github.com/owner/repo3',
          registeredAt: '2025-01-15T10:00:00Z',
          deployments: { commands: [], agents: [], hooks: [] },
          status: 'uninitialized'
        }
      ];

      mockRegistryService.list.mockResolvedValue(mockRepositories);

      await listCommand.parseAsync(['node', 'test', 'list']);

      // Verify status displays
      const allLogs = consoleLogSpy.mock.calls.map(call => call[0]);
      expect(allLogs.some(log => log.includes('● Active'))).toBe(true);
      expect(allLogs.some(log => log.includes('✗ Error'))).toBe(true);
      expect(allLogs.some(log => log.includes('○ Not Initialized'))).toBe(true);
    });
  });
});