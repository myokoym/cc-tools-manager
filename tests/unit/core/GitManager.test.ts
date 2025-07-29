import { GitManager } from '../../../src/core/GitManager';
import { Repository } from '../../../src/types';
import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TOOLS_DIR } from '../../../src/constants/paths';
import { Logger } from '../../../src/utils/logger';

// Mocks
jest.mock('simple-git');
jest.mock('fs/promises');
jest.mock('../../../src/utils/logger');

describe('GitManager', () => {
  let gitManager: GitManager;
  let mockGit: jest.Mocked<SimpleGit>;
  let mockRepoGit: jest.Mocked<SimpleGit>;
  let mockLogger: jest.Mocked<Logger>;

  const testRepo: Repository = {
    id: 'test-id',
    name: 'test-repo',
    url: 'https://github.com/user/test-repo.git',
    registeredAt: '2025-07-28T00:00:00Z',
    deployments: {
      commands: ['test-command'],
    },
    status: 'active',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock logger
    mockLogger = new Logger() as jest.Mocked<Logger>;
    mockLogger.info = jest.fn();
    mockLogger.warn = jest.fn();
    mockLogger.error = jest.fn();

    // Mock git instances
    mockGit = {
      clone: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockRepoGit = {
      pull: jest.fn().mockResolvedValue({ summary: {} }),
      status: jest.fn().mockResolvedValue({
        isClean: jest.fn().mockReturnValue(true),
        ahead: 0,
        behind: 0,
        modified: [],
        not_added: [],
      }),
      branch: jest.fn().mockResolvedValue({ current: 'main' }),
      revparse: jest.fn().mockResolvedValue('abc123\n'),
      diffSummary: jest.fn().mockResolvedValue({
        files: [{ file: 'test.ts' }],
        insertions: 10,
        deletions: 5,
      }),
    } as any;

    // Mock simpleGit
    (simpleGit as jest.Mock).mockImplementation((options?: any) => {
      // If options is an object with baseDir property (initial constructor)
      if (options && typeof options === 'object' && options.baseDir) {
        return mockGit;
      }
      // If options is a string (path)
      if (typeof options === 'string') {
        // For cloning operations (parent directory) - return mockGit
        if (options === TOOLS_DIR || options === '/custom') {
          return mockGit;
        }
        // For repo operations (subdirectory of TOOLS_DIR or specific repo path) - return mockRepoGit
        return mockRepoGit;
      }
      // Default to repo git
      return mockRepoGit;
    });

    gitManager = new GitManager(mockLogger);
  });

  describe('clone', () => {
    it('should successfully clone a repository', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Not found'));
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      await gitManager.clone(testRepo);

      expect(fs.mkdir).toHaveBeenCalledWith(
        path.dirname(path.join(TOOLS_DIR, 'user-test-repo')),
        { recursive: true }
      );
      expect(mockGit.clone).toHaveBeenCalledWith(
        testRepo.url,
        'user-test-repo',
        {
          '--progress': null,
          '--depth': '1',
        }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Successfully cloned test-repo')
      );
    });

    it('should skip cloning if repository already exists', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      await gitManager.clone(testRepo);

      expect(mockGit.clone).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should throw authentication error on auth failure', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Not found'));
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      
      const authError = new Error('Authentication failed');
      (authError as any).task = 'clone';
      mockGit.clone.mockRejectedValue(authError);

      await expect(gitManager.clone(testRepo)).rejects.toThrow('Authentication failed');
    });

    it('should use custom local path if provided', async () => {
      const repoWithPath = { ...testRepo, localPath: '/custom/path' };
      (fs.access as jest.Mock).mockRejectedValue(new Error('Not found'));
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      await gitManager.clone(repoWithPath);

      expect(mockGit.clone).toHaveBeenCalledWith(
        repoWithPath.url,
        'path',
        expect.any(Object)
      );
    });
  });

  describe('pull', () => {
    beforeEach(() => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
    });

    it('should successfully pull repository updates', async () => {
      mockRepoGit.revparse
        .mockResolvedValueOnce('abc123\n')
        .mockResolvedValueOnce('def456\n');

      const result = await gitManager.pull(testRepo);

      expect(mockRepoGit.pull).toHaveBeenCalled();
      expect(result).toEqual({
        filesChanged: 1,
        insertions: 10,
        deletions: 5,
        currentCommit: 'def456',
        previousCommit: 'abc123',
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Successfully updated test-repo (1 files changed)')
      );
    });

    it('should handle no changes in pull', async () => {
      mockRepoGit.revparse.mockResolvedValue('abc123\n');

      const result = await gitManager.pull(testRepo);

      expect(result).toEqual({
        filesChanged: 0,
        insertions: 0,
        deletions: 0,
        currentCommit: 'abc123',
        previousCommit: 'abc123',
      });
    });

    it('should throw error if repository does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Not found'));

      await expect(gitManager.pull(testRepo)).rejects.toThrow('Repository not found');
    });
  });

  describe('getStatus', () => {
    beforeEach(() => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
    });

    it('should return repository status', async () => {
      const status = await gitManager.getStatus(testRepo);

      expect(status).toEqual({
        isClean: true,
        branch: 'main',
        ahead: 0,
        behind: 0,
        modified: [],
        untracked: [],
      });
    });

    it('should handle dirty repository', async () => {
      mockRepoGit.status.mockResolvedValue({
        isClean: jest.fn().mockReturnValue(false),
        ahead: 2,
        behind: 1,
        modified: ['file1.ts', 'file2.ts'],
        not_added: ['newfile.ts'],
      } as any);

      const status = await gitManager.getStatus(testRepo);

      expect(status).toEqual({
        isClean: false,
        branch: 'main',
        ahead: 2,
        behind: 1,
        modified: ['file1.ts', 'file2.ts'],
        untracked: ['newfile.ts'],
      });
    });
  });

  describe('getLatestCommit', () => {
    beforeEach(() => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
    });

    it('should return the latest commit SHA', async () => {
      const commit = await gitManager.getLatestCommit(testRepo);

      expect(mockRepoGit.revparse).toHaveBeenCalledWith(['HEAD']);
      expect(commit).toBe('abc123');
    });
  });

  describe('isRepoClean', () => {
    beforeEach(() => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
    });

    it('should return true for clean repository', async () => {
      const isClean = await gitManager.isRepoClean(testRepo);

      expect(isClean).toBe(true);
    });

    it('should return false for dirty repository', async () => {
      mockRepoGit.status.mockResolvedValue({
        isClean: jest.fn().mockReturnValue(false),
      } as any);

      const isClean = await gitManager.isRepoClean(testRepo);

      expect(isClean).toBe(false);
    });

    it('should return false on error', async () => {
      const gitError = new Error('Git error');
      (gitError as any).task = 'status';
      mockRepoGit.status.mockRejectedValue(gitError);

      const isClean = await gitManager.isRepoClean(testRepo);

      expect(isClean).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('URL parsing', () => {
    it('should extract repo name from GitHub HTTPS URL', async () => {
      const repo = { ...testRepo, url: 'https://github.com/owner/repo-name.git' };
      (fs.access as jest.Mock).mockRejectedValue(new Error('Not found'));
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      await gitManager.clone(repo);

      expect(mockGit.clone).toHaveBeenCalledWith(
        repo.url,
        'owner-repo-name',
        expect.any(Object)
      );
    });

    it('should extract repo name from GitHub SSH URL', async () => {
      const repo = { ...testRepo, url: 'git@github.com:owner/repo-name.git' };
      (fs.access as jest.Mock).mockRejectedValue(new Error('Not found'));
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      await gitManager.clone(repo);

      expect(mockGit.clone).toHaveBeenCalledWith(
        repo.url,
        'owner-repo-name',
        expect.any(Object)
      );
    });

    it('should handle non-GitHub URLs', async () => {
      const repo = { ...testRepo, url: 'https://example.com/path/to/repo.git' };
      (fs.access as jest.Mock).mockRejectedValue(new Error('Not found'));
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      await gitManager.clone(repo);

      expect(mockGit.clone).toHaveBeenCalledWith(
        repo.url,
        'repo',
        expect.any(Object)
      );
    });
  });
});