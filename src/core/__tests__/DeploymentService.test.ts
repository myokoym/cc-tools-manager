import { DeploymentService } from '../DeploymentService';
import { Repository } from '../../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import * as fileSystem from '../../utils/file-system';
import { CLAUDE_DIR } from '../../constants/paths';

// モック
jest.mock('glob');
jest.mock('../../utils/file-system');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('DeploymentService', () => {
  let service: DeploymentService;
  const mockRepo: Repository = {
    id: 'test-repo',
    name: 'test-repo',
    url: 'https://github.com/test/repo',
    localPath: '/path/to/repo',
    version: '1.0.0',
    registeredAt: new Date().toISOString(),
    status: 'active',
    deployments: {
      commands: [],
      agents: [],
      hooks: []
    }
  };

  beforeEach(() => {
    service = new DeploymentService();
    jest.clearAllMocks();
  });

  describe('detectPatterns', () => {
    it('should detect command files', async () => {
      const mockGlob = glob as unknown as jest.MockedFunction<typeof glob>;
      mockGlob.mockImplementation((pattern: string | string[]) => {
        if (typeof pattern === 'string' && pattern.includes('commands')) {
          return Promise.resolve(['.claude/commands/test.js', 'commands/another.ts']);
        }
        return Promise.resolve([]);
      });

      const result = await service.detectPatterns('/path/to/repo');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        file: '.claude/commands/test.js',
        pattern: expect.stringContaining('commands'),
        targetType: 'commands'
      });
    });

    it('should detect agent and hook files', async () => {
      const mockGlob = glob as unknown as jest.MockedFunction<typeof glob>;
      mockGlob.mockImplementation((pattern: string | string[]) => {
        if (typeof pattern === 'string' && pattern.includes('agents')) {
          return Promise.resolve(['agents/helper.js']);
        }
        if (typeof pattern === 'string' && pattern.includes('hooks')) {
          return Promise.resolve(['.claude/hooks/pre-commit.mjs']);
        }
        return Promise.resolve([]);
      });

      const result = await service.detectPatterns('/path/to/repo');

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        file: 'agents/helper.js',
        pattern: expect.stringContaining('agents'),
        targetType: 'agents'
      });
      expect(result).toContainEqual({
        file: '.claude/hooks/pre-commit.mjs',
        pattern: expect.stringContaining('hooks'),
        targetType: 'hooks'
      });
    });

    it('should remove duplicate files', async () => {
      const mockGlob = glob as unknown as jest.MockedFunction<typeof glob>;
      mockGlob.mockImplementation(() => {
        return Promise.resolve(['commands/test.js']);
      });

      const result = await service.detectPatterns('/path/to/repo');

      // 複数のパターンでマッチしても、結果は1つだけ
      const testFiles = result.filter(r => r.file === 'commands/test.js');
      expect(testFiles).toHaveLength(1);
    });
  });

  describe('deploy', () => {
    beforeEach(() => {
      // detectPatternsのモック
      jest.spyOn(service, 'detectPatterns').mockResolvedValue([
        {
          file: '.claude/commands/test.js',
          pattern: '.claude/commands/**/*.js',
          targetType: 'commands'
        }
      ]);
    });

    it('should deploy files successfully', async () => {
      const mockFileExists = fileSystem.fileExists as jest.MockedFunction<typeof fileSystem.fileExists>;
      const mockCopyFile = fileSystem.copyFile as jest.MockedFunction<typeof fileSystem.copyFile>;
      
      mockFileExists.mockResolvedValue(false);
      mockCopyFile.mockResolvedValue(undefined);

      const result = await service.deploy(mockRepo);

      expect(result.deployed).toContain('.claude/commands/test.js');
      expect(result.failed).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });

    it('should skip existing files with skip strategy', async () => {
      const mockFileExists = fileSystem.fileExists as jest.MockedFunction<typeof fileSystem.fileExists>;
      mockFileExists.mockResolvedValue(true);

      const result = await service.deploy(mockRepo);

      expect(result.skipped).toContain('.claude/commands/test.js');
      expect(result.deployed).toHaveLength(0);
    }, 10000);

    it('should overwrite existing files with overwrite strategy', async () => {
      const mockFileExists = fileSystem.fileExists as jest.MockedFunction<typeof fileSystem.fileExists>;
      const mockCopyFile = fileSystem.copyFile as jest.MockedFunction<typeof fileSystem.copyFile>;
      
      mockFileExists.mockResolvedValue(true);
      mockCopyFile.mockResolvedValue(undefined);

      const repoWithOverwrite = { ...mockRepo, deploymentStrategy: 'overwrite' as const };
      const result = await service.deploy(repoWithOverwrite);

      expect(result.deployed).toContain('.claude/commands/test.js');
      expect(result.skipped).toHaveLength(0);
    }, 10000);

    it('should handle deployment failures', async () => {
      const mockFileExists = fileSystem.fileExists as jest.MockedFunction<typeof fileSystem.fileExists>;
      const mockCopyFile = fileSystem.copyFile as jest.MockedFunction<typeof fileSystem.copyFile>;
      
      mockFileExists.mockResolvedValue(false);
      mockCopyFile.mockRejectedValue(new Error('Copy failed'));

      const result = await service.deploy(mockRepo);

      expect(result.failed).toContain('.claude/commands/test.js');
      expect(result.deployed).toHaveLength(0);
    });
  });

  describe('copyWithStructure', () => {
    it('should create directory structure and copy file', async () => {
      const mockEnsureDir = fileSystem.ensureDir as jest.MockedFunction<typeof fileSystem.ensureDir>;
      const mockCopyFile = fileSystem.copyFile as jest.MockedFunction<typeof fileSystem.copyFile>;
      
      mockEnsureDir.mockResolvedValue(undefined);
      mockCopyFile.mockResolvedValue(undefined);

      await service.copyWithStructure('/source/dir/file.js', '/target/dir/file.js');

      expect(mockEnsureDir).toHaveBeenCalledWith('/target/dir');
      expect(mockCopyFile).toHaveBeenCalledWith('/source/dir/file.js', '/target/dir/file.js');
    });
  });

  describe('handleConflict', () => {
    it('should return false for skip strategy', async () => {
      const result = await service.handleConflict('/some/file', 'skip');
      expect(result).toBe(false);
    });

    it('should return true for overwrite strategy', async () => {
      const result = await service.handleConflict('/some/file', 'overwrite');
      expect(result).toBe(true);
    });

    it('should throw error for unknown strategy', async () => {
      await expect(
        service.handleConflict('/some/file', 'unknown' as any)
      ).rejects.toThrow('Unknown conflict strategy');
    });
  });

  describe('cleanOrphanedFiles', () => {
    it('should skip cleaning when no deployed files', async () => {
      // TODO: deployedFilesのトラッキングがRepository型に追加されるまでスキップ
      const count = await service.cleanOrphanedFiles(mockRepo);
      expect(count).toBe(0);
    });

    it('should handle missing deployed files gracefully', async () => {
      const mockFileExists = fileSystem.fileExists as jest.MockedFunction<typeof fileSystem.fileExists>;
      
      const repoWithDeployed = {
        ...mockRepo,
        deployedFiles: ['commands/not-exist.js']
      };

      mockFileExists.mockResolvedValue(false);

      const count = await service.cleanOrphanedFiles(repoWithDeployed);

      expect(count).toBe(0);
    });
  });
});