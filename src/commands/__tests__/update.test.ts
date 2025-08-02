/**
 * Update Command Tests
 */

import { jest } from '@jest/globals';
import { updateCommand } from '../update';
import { RegistryService } from '../../core/RegistryService';
import { GitManager } from '../../core/GitManager';
import { DeploymentService } from '../../core/DeploymentService';
import { Repository, RepositoryStatus } from '../../types/repository';

// モックの設定
jest.mock('../../core/RegistryService');
jest.mock('../../core/GitManager');
jest.mock('../../core/DeploymentService');
jest.mock('../../utils/logger');

// チョークモック
jest.mock('chalk', () => ({
  bold: jest.fn((str) => str),
  green: jest.fn((str) => str),
  red: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
  cyan: jest.fn((str) => str),
  gray: jest.fn((str) => str),
}));

// oraモック
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
  }));
});

describe('Update Command', () => {
  let mockRegistryService: jest.Mocked<RegistryService>;
  let mockGitManager: jest.Mocked<GitManager>;
  let mockDeploymentService: jest.Mocked<DeploymentService>;
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  let processExitSpy: jest.SpiedFunction<typeof process.exit>;

  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();
    
    // コンソールのスパイ
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    }) as jest.SpiedFunction<typeof process.exit>;

    // サービスモックの設定
    mockRegistryService = new RegistryService() as jest.Mocked<RegistryService>;
    mockGitManager = new GitManager() as jest.Mocked<GitManager>;
    mockDeploymentService = new DeploymentService() as jest.Mocked<DeploymentService>;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Command Creation', () => {
    it('should create update command with correct configuration', () => {
      const command = updateCommand;
      
      expect(command.name()).toBe('update');
      expect(command.description()).toBe('Update repository to latest version');
    });

    it('should have correct options', () => {
      const command = updateCommand;
      const options = command.options;
      
      const forceOption = options.find(opt => opt.long === '--force');
      expect(forceOption).toBeDefined();
      expect(forceOption?.short).toBe('-f');
      
      const allOption = options.find(opt => opt.long === '--all');
      expect(allOption).toBeDefined();
      expect(allOption?.short).toBe('-a');
      
      const installOption = options.find(opt => opt.long === '--install');
      expect(installOption).toBeDefined();
      expect(installOption?.description).toBe('Automatically deploy files after update (same as answering "y" to deploy prompt)');
    });
  });

  describe('Update Functionality', () => {
    const mockRepositories: Repository[] = [
      {
        id: 'repo1',
        name: 'test-repo-1',
        url: 'https://github.com/user/test-repo-1',
        status: 'active' as RepositoryStatus,
        registeredAt: new Date().toISOString(),
        deployments: { commands: [], agents: [], hooks: [] },
        localPath: '/path/to/repo1'
      },
      {
        id: 'repo2',
        name: 'test-repo-2',
        url: 'https://github.com/user/test-repo-2',
        status: 'active' as RepositoryStatus,
        registeredAt: new Date().toISOString(),
        deployments: { commands: [], agents: [], hooks: [] },
        localPath: '/path/to/repo2'
      }
    ];

    const mockGitResult = {
      filesChanged: 5,
      insertions: 100,
      deletions: 50,
      currentCommit: 'abc123',
      previousCommit: 'def456'
    };

    const mockPatterns = [
      {
        file: 'commands/test.js',
        pattern: '.claude/commands/**/*.js',
        targetType: 'commands' as const
      }
    ];

    const mockDeployResult = {
      deployed: [{
        source: 'commands/test.js',
        target: '/Users/test/.claude/commands/test.js',
        hash: 'abc123',
        deployedAt: new Date().toISOString()
      }],
      skipped: [],
      failed: [],
      conflicts: []
    };

    beforeEach(() => {
      mockRegistryService.list.mockResolvedValue(mockRepositories);
      mockGitManager.pull.mockResolvedValue(mockGitResult);
      mockDeploymentService.detectPatterns.mockResolvedValue(mockPatterns);
      mockDeploymentService.deploy.mockResolvedValue(mockDeployResult);
      mockRegistryService.update.mockResolvedValue(mockRepositories[0]);
    });

    it('should update a specific repository', async () => {
      const command = updateCommand;
      
      // Mock readline for user input
      const mockReadline = {
        createInterface: jest.fn().mockReturnValue({
          question: jest.fn((_, callback: (answer: string) => void) => callback('y')),
          close: jest.fn()
        })
      };
      jest.doMock('readline', () => mockReadline);
      
      await expect(async () => {
        await command.parseAsync(['node', 'test', 'update', 'test-repo-1']);
      }).rejects.toThrow('Process exited with code undefined');

      expect(mockRegistryService.list).toHaveBeenCalled();
      expect(mockGitManager.pull).toHaveBeenCalledWith(mockRepositories[0]);
      expect(mockDeploymentService.detectPatterns).toHaveBeenCalledWith(mockRepositories[0].localPath);
      expect(mockDeploymentService.deploy).toHaveBeenCalledWith(mockRepositories[0]);
      expect(mockRegistryService.update).toHaveBeenCalledWith('repo1', { status: 'active' });
    });

    it('should require repository name or --all flag', async () => {
      const command = updateCommand;
      
      await expect(async () => {
        await command.parseAsync(['node', 'test', 'update']);
      }).rejects.toThrow('Process exited with code 1');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Please specify a repository name or use --all flag.')
      );
    });

    it('should update all repositories with --all flag', async () => {
      const command = updateCommand;
      
      // Mock readline for user input
      const mockReadline = {
        createInterface: jest.fn().mockReturnValue({
          question: jest.fn((_, callback: (answer: string) => void) => callback('y')),
          close: jest.fn()
        })
      };
      jest.doMock('readline', () => mockReadline);
      
      await expect(async () => {
        await command.parseAsync(['node', 'test', 'update', '--all']);
      }).rejects.toThrow('Process exited with code undefined');

      expect(mockGitManager.pull).toHaveBeenCalledTimes(2);
      expect(mockDeploymentService.detectPatterns).toHaveBeenCalledTimes(2);
    });

    it('should handle repository not found', async () => {
      const command = updateCommand;
      
      await expect(async () => {
        await command.parseAsync(['node', 'test', 'update', 'non-existent']);
      }).rejects.toThrow('Process exited with code 1');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Repository "non-existent" not found.')
      );
    });

    it('should handle repository without local path', async () => {
      const repoWithoutPath = { ...mockRepositories[0], localPath: undefined };
      mockRegistryService.list.mockResolvedValue([repoWithoutPath]);
      
      const command = updateCommand;
      
      await expect(async () => {
        await command.parseAsync(['node', 'test', 'update', 'test-repo-1']);
      }).rejects.toThrow('Process exited with code undefined');

      expect(mockGitManager.pull).not.toHaveBeenCalled();
    });

    it('should skip deployment when user declines', async () => {
      const command = updateCommand;
      
      // Mock readline for user input
      const mockReadline = {
        createInterface: jest.fn().mockReturnValue({
          question: jest.fn((_, callback: (answer: string) => void) => callback('n')),
          close: jest.fn()
        })
      };
      jest.doMock('readline', () => mockReadline);
      
      await expect(async () => {
        await command.parseAsync(['node', 'test', 'update', 'test-repo-1']);
      }).rejects.toThrow('Process exited with code undefined');

      expect(mockDeploymentService.deploy).not.toHaveBeenCalled();
    });

    it('should skip confirmation with --force flag', async () => {
      const command = updateCommand;
      
      await expect(async () => {
        await command.parseAsync(['node', 'test', 'update', 'test-repo-1', '--force']);
      }).rejects.toThrow('Process exited with code undefined');

      expect(mockDeploymentService.deploy).toHaveBeenCalledWith(mockRepositories[0]);
    });

    it('should automatically deploy with --install flag', async () => {
      const command = updateCommand;
      
      await expect(async () => {
        await command.parseAsync(['node', 'test', 'update', 'test-repo-1', '--install']);
      }).rejects.toThrow('Process exited with code undefined');

      expect(mockDeploymentService.deploy).toHaveBeenCalledWith(mockRepositories[0], { interactive: undefined });
    });

    it('should work with --install and --interactive flags together', async () => {
      const command = updateCommand;
      
      await expect(async () => {
        await command.parseAsync(['node', 'test', 'update', 'test-repo-1', '--install', '--interactive']);
      }).rejects.toThrow('Process exited with code undefined');

      expect(mockDeploymentService.deploy).toHaveBeenCalledWith(mockRepositories[0], { interactive: true });
    });
  });

  describe('Error Handling', () => {
    it('should handle git pull errors', async () => {
      mockRegistryService.list.mockResolvedValue([
        {
          id: 'repo1',
          name: 'test-repo',
          url: 'https://github.com/user/test-repo',
          status: 'active' as RepositoryStatus,
          registeredAt: new Date().toISOString(),
          deployments: { commands: [], agents: [], hooks: [] },
          localPath: '/path/to/repo'
        }
      ]);
      
      const error = new Error('Git pull failed');
      mockGitManager.pull.mockRejectedValue(error);
      
      const command = updateCommand;
      
      await expect(async () => {
        await command.parseAsync(['node', 'test', 'update', 'test-repo']);
      }).rejects.toThrow('Process exited with code 1');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error: Git pull failed')
      );
      expect(mockRegistryService.update).toHaveBeenCalledWith('repo1', { 
        status: 'error',
        error: 'Git pull failed' 
      });
    });

    it('should handle no repositories registered', async () => {
      mockRegistryService.list.mockResolvedValue([]);
      
      const command = updateCommand;
      
      await expect(async () => {
        await command.parseAsync(['node', 'test', 'update', '--all']);
      }).rejects.toThrow('Process exited with code undefined');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No repositories registered.')
      );
    });
  });
});