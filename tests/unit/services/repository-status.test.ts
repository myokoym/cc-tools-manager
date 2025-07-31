/**
 * RepositoryStatusService Tests
 * リポジトリのステータス情報管理のテスト
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import {
  RepositoryStatusService,
  LocalRepositoryInfo,
  DeploymentStatusInfo,
  RepositoryStatusInfo
} from '../../../src/services/repository-status';
import { Repository, RepositoryStatus } from '../../../src/types/repository';
import { GitManager } from '../../../src/core/GitManager';
import { StateManager } from '../../../src/core/StateManager';
import { GitStatus } from '../../../src/core/interfaces/IGitManager';
import { RepositoryState } from '../../../src/core/interfaces/IStateManager';
import { fileExists, getAllFiles } from '../../../src/utils/file-system';

// File system utilities のモック
jest.mock('../../../src/utils/file-system');
const mockFileExists = fileExists as jest.MockedFunction<typeof fileExists>;
const mockGetAllFiles = getAllFiles as jest.MockedFunction<typeof getAllFiles>;

// fs.promises のモック
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    stat: jest.fn(),
    readdir: jest.fn(),
  }
}));
const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
const mockStat = fs.stat as jest.MockedFunction<typeof fs.stat>;

// GitManager のモック
jest.mock('../../../src/core/GitManager');
const MockGitManager = GitManager as jest.MockedClass<typeof GitManager>;

// StateManager のモック
jest.mock('../../../src/core/StateManager');
const MockStateManager = StateManager as jest.MockedClass<typeof StateManager>;

// テスト用のリポジトリデータ
const createMockRepository = (overrides: Partial<Repository> = {}): Repository => ({
  id: 'test-repo-id',
  name: 'owner/test-repo',
  url: 'https://github.com/owner/test-repo.git',
  registeredAt: '2024-01-01T00:00:00Z',
  status: 'active',
  localPath: '/tmp/repos/owner-test-repo',
  deployments: {
    commands: ['*.js'],
    agents: ['*.agent.js'],
    hooks: ['*.hook.js']
  },
  ...overrides
});

// テスト用のGitステータス
const createMockGitStatus = (overrides: Partial<GitStatus> = {}): GitStatus => ({
  isClean: true,
  branch: 'main',
  ahead: 0,
  behind: 0,
  modified: [],
  untracked: [],
  ...overrides
});

// テスト用のリポジトリ状態
const createMockRepositoryState = (overrides: Partial<RepositoryState> = {}): RepositoryState => ({
  lastSync: '2024-01-01T12:00:00Z',
  lastCommit: 'abc123def456',
  deployedFiles: [
    {
      source: '.claude/commands/test.js',
      target: 'commands/test.js',
      hash: 'hash123',
      deployedAt: '2024-01-01T12:00:00Z'
    }
  ],
  errors: [],
  ...overrides
});

describe('RepositoryStatusService', () => {
  let repositoryStatusService: RepositoryStatusService;
  let mockGitManager: jest.Mocked<GitManager>;
  let mockStateManager: jest.Mocked<StateManager>;
  let mockRepository: Repository;

  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();
    
    // File system mocks の明示的リセット
    mockFileExists.mockReset();
    mockAccess.mockReset();
    mockStat.mockReset();
    mockGetAllFiles.mockReset();

    // GitManager のモック作成
    mockGitManager = new MockGitManager() as jest.Mocked<GitManager>;
    mockStateManager = new MockStateManager() as jest.Mocked<StateManager>;

    repositoryStatusService = new RepositoryStatusService(mockGitManager, mockStateManager);
    mockRepository = createMockRepository();
  });

  describe('getRepositoryStatus', () => {
    it('should return complete repository status for active repository', async () => {
      // Setup: ローカルリポジトリが存在し、デプロイメントも正常な状態
      const mockGitStatus = createMockGitStatus();
      const mockRepoState = createMockRepositoryState();

      mockFileExists.mockResolvedValue(true);
      mockAccess.mockResolvedValue(undefined);
      mockStat.mockResolvedValue({
        mtime: new Date('2024-01-01T12:00:00Z'),
        size: 1024,
        isFile: () => true,
        isDirectory: () => false
      } as any);
      // Mock file stats for size calculation
      mockStat.mockResolvedValue({
        size: 2048,
        mtime: new Date('2024-01-01T12:00:00Z'),
        isFile: () => true,
        isDirectory: () => false
      } as any);
      mockGetAllFiles.mockResolvedValue(['file1.js', 'file2.js']);

      // GitManager モック
      mockGitManager.getStatus.mockResolvedValue(mockGitStatus);
      mockGitManager.getLatestCommit.mockResolvedValue('abc123def456');

      // StateManager モック
      mockStateManager.getRepositoryState.mockResolvedValue(mockRepoState);

      const result = await repositoryStatusService.getRepositoryStatus(mockRepository);

      expect(result).toMatchObject({
        repository: mockRepository,
        local: {
          exists: true,
          path: mockRepository.localPath,
          currentBranch: 'main',
          lastCommit: 'abc123def456',
          isDirty: false,
          diskSize: expect.any(Number),
          fileCount: expect.any(Number)
        },
        deployment: {
          totalDeployedFiles: 1,
          lastDeploymentTime: '2024-01-01T12:00:00Z',
          deploymentErrors: [],
          activeDeployments: {
            commands: expect.any(Number),
            agents: expect.any(Number),
            hooks: expect.any(Number)
          }
        },
        health: {
          status: 'healthy',
          issues: [],
          lastChecked: expect.any(String)
        }
      });
    });

    it('should handle repository without local clone', async () => {
      const repoWithoutLocal = createMockRepository({ localPath: undefined });

      mockFileExists.mockResolvedValue(false);
      mockStateManager.getRepositoryState.mockResolvedValue(null);

      const result = await repositoryStatusService.getRepositoryStatus(repoWithoutLocal);

      expect(result.local.exists).toBe(false);
      expect(result.local.path).toBeUndefined();
      expect(result.deployment.totalDeployedFiles).toBe(0);
    });

    it('should detect health issues for problematic repository', async () => {
      const mockRepoState = createMockRepositoryState({
        errors: ['Deployment failed: Permission denied']
      });

      mockFileExists.mockResolvedValue(true);
      mockAccess.mockRejectedValue(new Error('Permission denied'));
      mockStateManager.getRepositoryState.mockResolvedValue(mockRepoState);

      const result = await repositoryStatusService.getRepositoryStatus(mockRepository);

      expect(result.health.status).toBe('error');
      expect(result.health.issues).toContain('Deployment failed: Permission denied');
    });

    it('should handle git status errors gracefully', async () => {
      mockFileExists.mockResolvedValue(true);
      mockAccess.mockResolvedValue(undefined);
      mockGitManager.getStatus.mockRejectedValue(new Error('Not a git repository'));
      mockStateManager.getRepositoryState.mockResolvedValue(null);

      const result = await repositoryStatusService.getRepositoryStatus(mockRepository);

      expect(result.health.status).toBe('warning');
      expect(result.health.issues).toContain('Git status check failed');
    });
  });

  describe('getLocalInfo', () => {
    it('should return complete local info for existing repository', async () => {
      const mockGitStatus = createMockGitStatus({
        branch: 'feature/test',
        isClean: false,
        modified: ['file1.js']
      });

      mockFileExists.mockResolvedValue(true);
      mockAccess.mockResolvedValue(undefined);
      mockStat.mockResolvedValue({
        mtime: new Date('2024-01-01T12:00:00Z')
      } as any);
      // Directory size will be calculated from file stats
      mockGetAllFiles.mockResolvedValue(['file1.js', 'file2.js', 'file3.ts']);

      mockGitManager.getStatus.mockResolvedValue(mockGitStatus);
      mockGitManager.getLatestCommit.mockResolvedValue('xyz789abc123');

      const result = await repositoryStatusService.getLocalInfo(mockRepository);

      expect(result).toEqual({
        exists: true,
        path: mockRepository.localPath,
        currentBranch: 'feature/test',
        lastCommit: 'xyz789abc123',
        commitMessage: expect.any(String),
        isDirty: true,
        diskSize: expect.any(Number),
        fileCount: 3
      });
    });

    it('should return minimal info for non-existent repository', async () => {
      mockFileExists.mockResolvedValue(false);

      const result = await repositoryStatusService.getLocalInfo(mockRepository);

      expect(result).toEqual({
        exists: false
      });
    });

    it('should handle directory without git repository', async () => {
      mockFileExists.mockResolvedValue(true);
      mockAccess.mockResolvedValueOnce(undefined); // Directory exists
      mockAccess.mockRejectedValueOnce(new Error('ENOENT')); // .git directory doesn't exist
      mockGetAllFiles.mockResolvedValue(['file1.js', 'file2.js']);
      mockStat.mockResolvedValue({ size: 1024 } as any);

      const result = await repositoryStatusService.getLocalInfo(mockRepository);

      expect(result).toEqual({
        exists: true,
        path: mockRepository.localPath,
        currentBranch: undefined,
        lastCommit: undefined,
        isDirty: undefined,
        diskSize: expect.any(Number),
        fileCount: expect.any(Number)
      });
    });

    it('should handle file system errors gracefully', async () => {
      mockFileExists.mockRejectedValue(new Error('Permission denied'));

      const result = await repositoryStatusService.getLocalInfo(mockRepository);

      expect(result).toEqual({
        exists: false
      });
    });
  });

  describe('getDeploymentStatus', () => {
    it('should return deployment status with all deployment types', async () => {
      const mockRepoState = createMockRepositoryState({
        deployedFiles: [
          {
            source: '.claude/commands/cmd1.js',
            target: 'commands/cmd1.js',
            hash: 'hash1',
            deployedAt: '2024-01-01T10:00:00Z'
          },
          {
            source: '.claude/agents/agent1.js',
            target: 'agents/agent1.js',
            hash: 'hash2',
            deployedAt: '2024-01-01T11:00:00Z'
          },
          {
            source: '.claude/hooks/hook1.js',
            target: 'hooks/hook1.js',
            hash: 'hash3',
            deployedAt: '2024-01-01T12:00:00Z'
          }
        ]
      });

      mockStateManager.getRepositoryState.mockResolvedValue(mockRepoState);

      const result = await repositoryStatusService.getDeploymentStatus(mockRepository);

      expect(result).toEqual({
        totalDeployedFiles: 3,
        lastDeploymentTime: '2024-01-01T12:00:00Z',
        deploymentErrors: [],
        activeDeployments: {
          commands: 1,
          agents: 1,
          hooks: 1
        }
      });
    });

    it('should return empty deployment status for undeployed repository', async () => {
      mockStateManager.getRepositoryState.mockResolvedValue(null);

      const result = await repositoryStatusService.getDeploymentStatus(mockRepository);

      expect(result).toEqual({
        totalDeployedFiles: 0,
        deploymentErrors: [],
        activeDeployments: {
          commands: 0,
          agents: 0,
          hooks: 0
        }
      });
    });

    it('should include deployment errors when present', async () => {
      const mockRepoState = createMockRepositoryState({
        errors: [
          'Failed to deploy commands/broken.js: Syntax error',
          'Permission denied: agents/restricted.js'
        ],
        deployedFiles: []
      });

      mockStateManager.getRepositoryState.mockResolvedValue(mockRepoState);

      const result = await repositoryStatusService.getDeploymentStatus(mockRepository);

      expect(result.deploymentErrors).toEqual([
        'Failed to deploy commands/broken.js: Syntax error',
        'Permission denied: agents/restricted.js'
      ]);
    });

    it('should calculate correct active deployments by type', async () => {
      const mockRepoState = createMockRepositoryState({
        deployedFiles: [
          {
            source: '.claude/commands/cmd1.js',
            target: 'commands/cmd1.js',
            hash: 'hash1',
            deployedAt: '2024-01-01T10:00:00Z'
          },
          {
            source: '.claude/commands/cmd2.js',
            target: 'commands/cmd2.js',
            hash: 'hash2',
            deployedAt: '2024-01-01T10:30:00Z'
          },
          {
            source: '.claude/agents/agent1.js',
            target: 'agents/agent1.js',
            hash: 'hash3',
            deployedAt: '2024-01-01T11:00:00Z'
          }
        ]
      });

      mockStateManager.getRepositoryState.mockResolvedValue(mockRepoState);

      const result = await repositoryStatusService.getDeploymentStatus(mockRepository);

      expect(result.activeDeployments).toEqual({
        commands: 2,
        agents: 1,
        hooks: 0
      });
    });
  });

  describe('performHealthCheck', () => {
    it('should return healthy status for well-functioning repository', async () => {
      const mockGitStatus = createMockGitStatus();
      const mockRepoState = createMockRepositoryState();

      // Clear and setup all mocks
      mockAccess.mockClear();
      mockAccess.mockResolvedValue(undefined); // All .git directory checks succeed
      mockGitManager.getStatus.mockResolvedValue(mockGitStatus);
      mockGitManager.isRepoClean.mockResolvedValue(true);
      mockStateManager.getRepositoryState.mockResolvedValue(mockRepoState);

      // すべてのデプロイされたファイルが存在することを確認
      mockFileExists.mockImplementation(async (path: string) => {
        return path.includes('commands/test.js') || path === mockRepository.localPath;
      });

      const result = await repositoryStatusService.performHealthCheck(mockRepository);

      expect(result).toEqual({
        status: 'healthy',
        issues: [],
        suggestions: []
      });
    });

    it('should detect missing local repository', async () => {
      mockFileExists.mockResolvedValue(false);

      const result = await repositoryStatusService.performHealthCheck(mockRepository);

      expect(result.status).toBe('error');
      expect(result.issues).toContain('Local repository not found');
      expect(result.suggestions).toContain('Run clone command to create local copy');
    });

    it('should detect git repository corruption', async () => {
      mockFileExists.mockResolvedValue(true);
      mockAccess.mockClear();
      mockAccess.mockRejectedValueOnce(new Error('ENOENT')); // .git directory missing

      const result = await repositoryStatusService.performHealthCheck(mockRepository);

      expect(result.status).toBe('error');
      expect(result.issues).toContain('Git repository is corrupted or invalid');
      expect(result.suggestions).toContain('Re-clone the repository');
    });

    it('should detect missing deployed files', async () => {
      const mockRepoState = createMockRepositoryState({
        deployedFiles: [
          {
            source: '.claude/commands/missing.js',
            target: 'commands/missing.js',
            hash: 'hash1',
            deployedAt: '2024-01-01T10:00:00Z'
          }
        ]
      });

      mockFileExists.mockImplementation(async (path: string) => {
        // Repository directory should exist, but missing.js should not
        if (path === mockRepository.localPath) return true;
        return !path.includes('missing.js');
      });
      mockAccess.mockClear();
      mockAccess.mockResolvedValue(undefined);
      mockStateManager.getRepositoryState.mockResolvedValue(mockRepoState);

      const result = await repositoryStatusService.performHealthCheck(mockRepository);

      expect(result.status).toBe('warning');
      expect(result.issues).toContain('Some deployed files are missing');
      expect(result.suggestions).toContain('Re-deploy the repository');
    });

    it('should detect dirty working directory', async () => {
      const mockGitStatus = createMockGitStatus({
        isClean: false,
        modified: ['file1.js', 'file2.js']
      });

      mockFileExists.mockResolvedValue(true);
      mockAccess.mockResolvedValue(undefined);
      mockGitManager.getStatus.mockResolvedValue(mockGitStatus);
      mockGitManager.isRepoClean.mockResolvedValue(false);
      mockStateManager.getRepositoryState.mockResolvedValue(null);

      const result = await repositoryStatusService.performHealthCheck(mockRepository);

      expect(result.status).toBe('warning');
      expect(result.issues).toContain('Working directory has uncommitted changes');
      expect(result.suggestions).toContain('Commit or stash local changes');
    });

    it('should detect sync issues (behind remote)', async () => {
      const mockGitStatus = createMockGitStatus({
        behind: 5
      });

      mockFileExists.mockResolvedValue(true);
      mockAccess.mockResolvedValue(undefined);
      mockGitManager.getStatus.mockResolvedValue(mockGitStatus);
      mockStateManager.getRepositoryState.mockResolvedValue(null);

      const result = await repositoryStatusService.performHealthCheck(mockRepository);

      expect(result.status).toBe('warning');
      expect(result.issues).toContain('Repository is behind remote by 5 commits');
      expect(result.suggestions).toContain('Run update command to sync with remote');
    });

    it('should detect deployment errors', async () => {
      const mockRepoState = createMockRepositoryState({
        errors: ['Permission denied', 'Syntax error in file.js']
      });

      mockFileExists.mockResolvedValue(true);
      mockAccess.mockResolvedValue(undefined);
      mockStateManager.getRepositoryState.mockResolvedValue(mockRepoState);

      const result = await repositoryStatusService.performHealthCheck(mockRepository);

      expect(result.status).toBe('error');
      expect(result.issues).toContain('Deployment errors detected');
      expect(result.suggestions).toContain('Check deployment configuration and permissions');
    });
  });

  describe('updateStatus', () => {
    it('should update repository status successfully', async () => {
      const newStatus: RepositoryStatus = 'error';
      const reason = 'Deployment failed';

      // RegistryService のモックが必要になるが、ここでは基本的な動作確認
      await expect(repositoryStatusService.updateStatus(mockRepository, newStatus, reason))
        .resolves.not.toThrow();
    });

    it('should handle status update without reason', async () => {
      const newStatus: RepositoryStatus = 'active';

      await expect(repositoryStatusService.updateStatus(mockRepository, newStatus))
        .resolves.not.toThrow();
    });
  });

  describe('checkSyncStatus', () => {
    it('should return up-to-date status for synced repository', async () => {
      const mockGitStatus = createMockGitStatus({
        ahead: 0,
        behind: 0
      });

      mockGitManager.getStatus.mockResolvedValue(mockGitStatus);

      // このメソッドは実装されていないが、期待される動作をテスト
      // 実装時にこのテストが実装を導く
      const result = await repositoryStatusService.checkSyncStatus(mockRepository);

      expect(result).toBe('up-to-date');
    });

    it('should return behind status when repository is behind remote', async () => {
      const mockGitStatus = createMockGitStatus({
        ahead: 0,
        behind: 3
      });

      mockGitManager.getStatus.mockResolvedValue(mockGitStatus);

      const result = await repositoryStatusService.checkSyncStatus(mockRepository);

      expect(result).toBe('behind');
    });

    it('should return ahead status when repository is ahead of remote', async () => {
      const mockGitStatus = createMockGitStatus({
        ahead: 2,
        behind: 0
      });

      mockGitManager.getStatus.mockResolvedValue(mockGitStatus);

      const result = await repositoryStatusService.checkSyncStatus(mockRepository);

      expect(result).toBe('ahead');
    });

    it('should return diverged status when repository has diverged', async () => {
      const mockGitStatus = createMockGitStatus({
        ahead: 2,
        behind: 3
      });

      mockGitManager.getStatus.mockResolvedValue(mockGitStatus);

      const result = await repositoryStatusService.checkSyncStatus(mockRepository);

      expect(result).toBe('diverged');
    });
  });

  describe('getDeploymentStats', () => {
    it('should calculate deployment statistics correctly', async () => {
      const mockRepoState = createMockRepositoryState({
        deployedFiles: [
          {
            source: '.claude/commands/cmd1.js',
            target: 'commands/cmd1.js',
            hash: 'hash1',
            deployedAt: '2024-01-01T10:00:00Z'
          },
          {
            source: '.claude/commands/cmd2.js',
            target: 'commands/cmd2.js',
            hash: 'hash2',
            deployedAt: '2024-01-01T11:00:00Z'
          },
          {
            source: '.claude/agents/agent1.js',
            target: 'agents/agent1.js',
            hash: 'hash3',
            deployedAt: '2024-01-01T12:00:00Z'
          }
        ]
      });

      mockStateManager.getRepositoryState.mockResolvedValue(mockRepoState);

      // このメソッドは実装されていないが、期待される動作をテスト
      const result = await repositoryStatusService.getDeploymentStats(mockRepository);

      expect(result).toEqual({
        totalFiles: 3,
        byType: {
          commands: 2,
          agents: 1,
          hooks: 0
        },
        lastDeployment: '2024-01-01T12:00:00Z'
      });
    });

    it('should handle repository with no deployments', async () => {
      mockStateManager.getRepositoryState.mockResolvedValue(null);

      const result = await repositoryStatusService.getDeploymentStats(mockRepository);

      expect(result).toEqual({
        totalFiles: 0,
        byType: {
          commands: 0,
          agents: 0,
          hooks: 0
        },
        lastDeployment: undefined
      });
    });
  });

  describe('detectConflicts', () => {
    it('should detect no conflicts for clean repository', async () => {
      const mockGitStatus = createMockGitStatus({
        isClean: true,
        modified: [],
        untracked: []
      });

      mockGitManager.getStatus.mockResolvedValue(mockGitStatus);

      // このメソッドは実装されていないが、期待される動作をテスト
      const result = await repositoryStatusService.detectConflicts(mockRepository);

      expect(result).toEqual({
        hasConflicts: false,
        conflicts: []
      });
    });

    it('should detect file conflicts', async () => {
      const mockGitStatus = createMockGitStatus({
        isClean: false,
        modified: ['conflicted-file.js'],
        untracked: ['new-file.js']
      });

      mockGitManager.getStatus.mockResolvedValue(mockGitStatus);

      const result = await repositoryStatusService.detectConflicts(mockRepository);

      expect(result).toEqual({
        hasConflicts: true,
        conflicts: [
          {
            type: 'modified',
            file: 'conflicted-file.js',
            description: 'File has been modified locally'
          },
          {
            type: 'untracked',
            file: 'new-file.js',
            description: 'Untracked file present'
          }
        ]
      });
    });
  });

  describe('verifyLocalClone', () => {
    it('should verify valid local clone', async () => {
      mockFileExists.mockResolvedValue(true);
      mockAccess.mockResolvedValue(undefined);

      // このメソッドは実装されていないが、期待される動作をテスト
      const result = await repositoryStatusService.verifyLocalClone(mockRepository);

      expect(result).toEqual({
        isValid: true,
        issues: []
      });
    });

    it('should detect missing repository directory', async () => {
      mockFileExists.mockResolvedValue(false);

      const result = await repositoryStatusService.verifyLocalClone(mockRepository);

      expect(result).toEqual({
        isValid: false,
        issues: ['Repository directory does not exist']
      });
    });

    it('should detect missing .git directory', async () => {
      mockFileExists.mockResolvedValue(true);
      mockAccess.mockClear();
      mockAccess.mockRejectedValueOnce(new Error('ENOENT')); // .git directory missing

      const result = await repositoryStatusService.verifyLocalClone(mockRepository);

      expect(result).toEqual({
        isValid: false,
        issues: ['Not a valid git repository (.git directory missing)']
      });
    });
  });

  describe('error handling', () => {
    it('should handle git manager errors gracefully', async () => {
      mockFileExists.mockResolvedValue(true);
      mockAccess.mockResolvedValue(undefined);
      mockGitManager.getStatus.mockRejectedValue(new Error('Git command failed'));
      mockStateManager.getRepositoryState.mockResolvedValue(null);

      const result = await repositoryStatusService.getRepositoryStatus(mockRepository);

      expect(result.health.status).toBe('warning');
      expect(result.health.issues).toContain('Git status check failed');
    });

    it('should handle state manager errors gracefully', async () => {
      mockFileExists.mockResolvedValue(true);
      mockAccess.mockResolvedValue(undefined);
      mockStateManager.getRepositoryState.mockRejectedValue(new Error('State file corrupted'));

      const result = await repositoryStatusService.getRepositoryStatus(mockRepository);

      expect(result.deployment.totalDeployedFiles).toBe(0);
    });

    it('should handle file system permission errors', async () => {
      mockFileExists.mockRejectedValue(new Error('EACCES: permission denied'));

      const result = await repositoryStatusService.getLocalInfo(mockRepository);

      expect(result.exists).toBe(false);
    });

    it('should handle malformed repository objects', async () => {
      const malformedRepo = {} as Repository;

      const result = await repositoryStatusService.getRepositoryStatus(malformedRepo);

      expect(result.local.exists).toBe(false);
      expect(result.deployment.totalDeployedFiles).toBe(0);
      expect(result.health.status).toBe('error');
    });
  });

  describe('integration scenarios', () => {
    it('should handle repository in various states consistently', async () => {
      // Test different repository states
      const scenarios = [
        { status: 'active' as RepositoryStatus, localExists: true },
        { status: 'error' as RepositoryStatus, localExists: false },
        { status: 'uninitialized' as RepositoryStatus, localExists: false }
      ];

      for (const scenario of scenarios) {
        const repo = createMockRepository({ status: scenario.status });
        mockFileExists.mockResolvedValue(scenario.localExists);
        
        if (scenario.localExists) {
          mockAccess.mockResolvedValue(undefined);
          mockGitManager.getStatus.mockResolvedValue(createMockGitStatus());
        }

        const result = await repositoryStatusService.getRepositoryStatus(repo);

        expect(result.repository.status).toBe(scenario.status);
        expect(result.local.exists).toBe(scenario.localExists);
      }
    });

    it('should provide performance metrics for large repositories', async () => {
      // Create a large file list
      const largeFileList = Array.from({ length: 1000 }, (_, i) => `file${i}.js`);
      const largeDeployedFiles = Array.from({ length: 500 }, (_, i) => ({
        source: `.claude/commands/cmd${i}.js`,
        target: `commands/cmd${i}.js`,
        hash: `hash${i}`,
        deployedAt: '2024-01-01T12:00:00Z'
      }));

      mockFileExists.mockResolvedValue(true);
      mockAccess.mockResolvedValue(undefined);
      mockGetAllFiles.mockResolvedValue(largeFileList);
      // Large file size will be mocked through fs.stat
      mockGitManager.getStatus.mockResolvedValue(createMockGitStatus());
      mockStateManager.getRepositoryState.mockResolvedValue(
        createMockRepositoryState({ deployedFiles: largeDeployedFiles })
      );

      const startTime = Date.now();
      const result = await repositoryStatusService.getRepositoryStatus(mockRepository);
      const endTime = Date.now();

      expect(result.local.fileCount).toBe(1000);
      expect(result.deployment.totalDeployedFiles).toBe(500);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});