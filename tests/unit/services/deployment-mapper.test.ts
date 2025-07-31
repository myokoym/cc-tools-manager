/**
 * DeploymentMapper Service Tests
 * デプロイメント情報のマッピングと管理のテスト
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { DeploymentMapper, DeploymentInfo, DeploymentMapping } from '../../../src/services/deployment-mapper';
import { Repository, RepositoryDeployments } from '../../../src/types/repository';
import { fileExists, getAllFiles } from '../../../src/utils/file-system';

// File system utilities のモック
jest.mock('../../../src/utils/file-system');
const mockFileExists = fileExists as jest.MockedFunction<typeof fileExists>;
const mockGetAllFiles = getAllFiles as jest.MockedFunction<typeof getAllFiles>;

// fs.promises のモック
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
  }
}));
const mockStat = fs.stat as jest.MockedFunction<typeof fs.stat>;
const mockReaddir = fs.readdir as jest.MockedFunction<typeof fs.readdir>;
const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

// テスト用のリポジトリデータ
const createMockRepository = (overrides: Partial<Repository> = {}): Repository => ({
  id: 'test-repo-id',
  name: 'owner/test-repo',
  url: 'https://github.com/owner/test-repo',
  registeredAt: '2024-01-01T00:00:00Z',
  status: 'active',
  localPath: '/tmp/test-repo',
  deployments: {
    commands: ['*.js'],
    agents: ['*.agent.js'],
    hooks: ['*.hook.js']
  },
  ...overrides
});

describe('DeploymentMapper', () => {
  let deploymentMapper: DeploymentMapper;
  let mockRepository: Repository;

  beforeEach(() => {
    deploymentMapper = new DeploymentMapper();
    mockRepository = createMockRepository();
    
    // モックをリセット
    jest.clearAllMocks();
  });

  describe('mapDeployments', () => {
    it('should map deployments for a repository with all types', async () => {
      // テストファイルの設定
      const testFiles = [
        '.claude/commands/test-command.js',
        '.claude/agents/test-agent.js',
        '.claude/hooks/test-hook.js',
        'commands/another-command.js',
        'agents/another-agent.js'
      ];

      mockGetAllFiles.mockResolvedValue(testFiles);
      mockFileExists.mockResolvedValue(true);

      const result = await deploymentMapper.mapDeployments(mockRepository);

      expect(result).toMatchObject({
        repository: mockRepository,
        totalFiles: expect.any(Number),
        deployments: expect.arrayContaining([
          expect.objectContaining({
            type: 'commands',
            files: expect.any(Array),
            status: expect.any(String)
          }),
          expect.objectContaining({
            type: 'agents',
            files: expect.any(Array),
            status: expect.any(String)
          }),
          expect.objectContaining({
            type: 'hooks',
            files: expect.any(Array),
            status: expect.any(String)
          })
        ])
      });
      expect(result.deployments).toHaveLength(3);
    });

    it('should handle repository with no deployments', async () => {
      const repoWithNoDeployments = createMockRepository({
        deployments: {
          commands: [],
          agents: [],
          hooks: []
        }
      });

      mockGetAllFiles.mockResolvedValue([]);

      const result = await deploymentMapper.mapDeployments(repoWithNoDeployments);

      expect(result.deployments).toHaveLength(0);
      expect(result.totalFiles).toBe(0);
    });

    it('should handle repository with missing local path', async () => {
      const repoWithoutLocalPath = createMockRepository({
        localPath: undefined
      });

      const result = await deploymentMapper.mapDeployments(repoWithoutLocalPath);

      expect(result.deployments).toHaveLength(0);
      expect(result.totalFiles).toBe(0);
    });

    it('should include deployment timestamp when files are found', async () => {
      const testFiles = ['.claude/commands/test.js'];
      mockGetAllFiles.mockResolvedValue(testFiles);
      mockFileExists.mockResolvedValue(true);
      
      // ファイルの最終更新時間をモック
      mockStat.mockResolvedValue({
        mtime: new Date('2024-01-01T12:00:00Z'),
        isFile: () => true,
        isDirectory: () => false
      } as any);

      const result = await deploymentMapper.mapDeployments(mockRepository);

      expect(result.lastDeployment).toBeDefined();
      expect(result.deployments[0].deployedAt).toBeDefined();
    });
  });

  describe('scanSourceFiles', () => {
    it('should scan files matching .claude/ patterns', async () => {
      const testFiles = [
        '.claude/commands/test1.js',
        '.claude/commands/test2.ts',
        '.claude/commands/subfolder/test3.js',
        '.claude/agents/agent1.js',
        '.claude/hooks/hook1.js',
        'other/file.js' // Should be ignored
      ];

      mockGetAllFiles.mockResolvedValue(testFiles);

      const result = await deploymentMapper.scanSourceFiles('/tmp/test-repo', ['commands', 'agents', 'hooks']);

      expect(result).toHaveLength(5); // All .claude/ files
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({
          sourcePath: '.claude/commands/test1.js',
          type: 'commands'
        }),
        expect.objectContaining({
          sourcePath: '.claude/agents/agent1.js',
          type: 'agents'
        }),
        expect.objectContaining({
          sourcePath: '.claude/hooks/hook1.js',
          type: 'hooks'
        })
      ]));
    });

    it('should scan files matching root-level patterns', async () => {
      const testFiles = [
        'commands/root-command.js',
        'agents/root-agent.js',
        'hooks/root-hook.js',
        'commands.js', // Single file pattern
        'agents.js',
        'hooks.js'
      ];

      mockGetAllFiles.mockResolvedValue(testFiles);

      const result = await deploymentMapper.scanSourceFiles('/tmp/test-repo', ['commands', 'agents', 'hooks']);

      expect(result).toHaveLength(6);
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({
          sourcePath: 'commands/root-command.js',
          type: 'commands'
        }),
        expect.objectContaining({
          sourcePath: 'commands.js',
          type: 'commands'
        })
      ]));
    });

    it('should handle mixed file extensions', async () => {
      const testFiles = [
        '.claude/commands/test.js',
        '.claude/commands/test.ts',
        '.claude/commands/test.mjs',
        '.claude/commands/test.md',
        '.claude/commands/test.txt', // Should be ignored
        '.claude/commands/test.json' // Should be ignored
      ];

      mockGetAllFiles.mockResolvedValue(testFiles);

      const result = await deploymentMapper.scanSourceFiles('/tmp/test-repo', ['commands']);

      expect(result).toHaveLength(4); // Only .js, .ts, .mjs, .md
      expect(result.map(r => r.sourcePath)).not.toContain('.claude/commands/test.txt');
      expect(result.map(r => r.sourcePath)).not.toContain('.claude/commands/test.json');
    });

    it('should handle empty repository', async () => {
      mockGetAllFiles.mockResolvedValue([]);

      const result = await deploymentMapper.scanSourceFiles('/tmp/empty-repo', ['commands', 'agents', 'hooks']);

      expect(result).toHaveLength(0);
    });

    it('should handle non-existent repository path', async () => {
      mockGetAllFiles.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const result = await deploymentMapper.scanSourceFiles('/tmp/non-existent', ['commands']);

      expect(result).toHaveLength(0);
    });

    it('should filter by requested types only', async () => {
      const testFiles = [
        '.claude/commands/test.js',
        '.claude/agents/test.js',
        '.claude/hooks/test.js'
      ];

      mockGetAllFiles.mockResolvedValue(testFiles);

      const result = await deploymentMapper.scanSourceFiles('/tmp/test-repo', ['commands']);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('commands');
    });
  });

  describe('resolveTargetPath', () => {
    it('should resolve .claude/ prefixed paths correctly', async () => {
      const sourcePath = '.claude/commands/test-command.js';
      
      const result = await deploymentMapper.resolveTargetPath(sourcePath);

      expect(result).toBe('commands/test-command.js');
    });

    it('should resolve root-level paths correctly', async () => {
      const sourcePath = 'commands/test-command.js';
      
      const result = await deploymentMapper.resolveTargetPath(sourcePath);

      expect(result).toBe('commands/test-command.js');
    });

    it('should resolve single file patterns', async () => {
      const sourcePath = 'commands.js';
      
      const result = await deploymentMapper.resolveTargetPath(sourcePath);

      expect(result).toBe('commands/commands.js');
    });

    it('should handle nested directory structures', async () => {
      const sourcePath = '.claude/commands/utils/helper.js';
      
      const result = await deploymentMapper.resolveTargetPath(sourcePath);

      expect(result).toBe('commands/utils/helper.js');
    });

    it('should handle empty or invalid paths', async () => {
      expect(await deploymentMapper.resolveTargetPath('')).toBe('');
      expect(await deploymentMapper.resolveTargetPath('/')).toBe('/');
      expect(await deploymentMapper.resolveTargetPath('.')).toBe('.');
    });
  });

  describe('checkDeploymentStatus', () => {
    it('should return active status for deployed files', async () => {
      mockFileExists.mockResolvedValue(true);

      const deploymentInfo: DeploymentInfo = {
        type: 'commands',
        files: ['test-command.js'],
        status: 'pending'
      };

      const result = await deploymentMapper.checkDeploymentStatus(deploymentInfo, '/home/user/.claude');

      expect(result.status).toBe('active');
    });

    it('should return error status for missing files', async () => {
      mockFileExists.mockResolvedValue(false);

      const deploymentInfo: DeploymentInfo = {
        type: 'commands',
        files: ['missing-command.js'],
        status: 'active'
      };

      const result = await deploymentMapper.checkDeploymentStatus(deploymentInfo, '/home/user/.claude');

      expect(result.status).toBe('error');
    });

    it('should return pending status for empty file list', async () => {
      const deploymentInfo: DeploymentInfo = {
        type: 'commands',
        files: [],
        status: 'pending'
      };

      const result = await deploymentMapper.checkDeploymentStatus(deploymentInfo, '/home/user/.claude');

      expect(result.status).toBe('pending');
    });

    it('should handle mixed file existence', async () => {
      mockFileExists
        .mockResolvedValueOnce(true)  // First file exists
        .mockResolvedValueOnce(false); // Second file missing

      const deploymentInfo: DeploymentInfo = {
        type: 'commands',
        files: ['existing.js', 'missing.js'],
        status: 'active'
      };

      const result = await deploymentMapper.checkDeploymentStatus(deploymentInfo, '/home/user/.claude');

      expect(result.status).toBe('error');
    });
  });

  describe('groupByDirectory', () => {
    it('should group files by their directory', async () => {
      const files = [
        { sourcePath: '.claude/commands/cmd1.js', type: 'commands' as const },
        { sourcePath: '.claude/commands/utils/helper.js', type: 'commands' as const },
        { sourcePath: '.claude/agents/agent1.js', type: 'agents' as const },
        { sourcePath: 'commands/root-cmd.js', type: 'commands' as const }
      ];

      const result = await deploymentMapper.groupByDirectory(files);

      expect(result).toEqual({
        '.claude/commands': [
          { sourcePath: '.claude/commands/cmd1.js', type: 'commands' }
        ],
        '.claude/commands/utils': [
          { sourcePath: '.claude/commands/utils/helper.js', type: 'commands' }
        ],
        '.claude/agents': [
          { sourcePath: '.claude/agents/agent1.js', type: 'agents' }
        ],
        'commands': [
          { sourcePath: 'commands/root-cmd.js', type: 'commands' }
        ]
      });
    });

    it('should handle single files in root', async () => {
      const files = [
        { sourcePath: 'commands.js', type: 'commands' as const }
      ];

      const result = await deploymentMapper.groupByDirectory(files);

      expect(result).toEqual({
        '.': [
          { sourcePath: 'commands.js', type: 'commands' }
        ]
      });
    });

    it('should handle empty file list', async () => {
      const result = await deploymentMapper.groupByDirectory([]);

      expect(result).toEqual({});
    });

    it('should handle deeply nested structures', async () => {
      const files = [
        { sourcePath: '.claude/commands/deep/nested/structure/file.js', type: 'commands' as const }
      ];

      const result = await deploymentMapper.groupByDirectory(files);

      expect(result).toEqual({
        '.claude/commands/deep/nested/structure': [
          { sourcePath: '.claude/commands/deep/nested/structure/file.js', type: 'commands' }
        ]
      });
    });
  });

  describe('validateDeployments', () => {
    it('should validate correct deployment patterns', async () => {
      const deployments: RepositoryDeployments = {
        commands: ['*.js', '.claude/commands/**/*.ts'],
        agents: ['*.agent.js'],
        hooks: ['*.hook.js']
      };

      const result = await deploymentMapper.validateDeployments(deployments);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect invalid patterns', async () => {
      const deployments: RepositoryDeployments = {
        commands: ['[invalid-pattern'],
        agents: ['valid-pattern.js'],
        hooks: []
      };

      const result = await deploymentMapper.validateDeployments(deployments);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('[invalid-pattern');
    });

    it('should warn about potentially problematic patterns', async () => {
      const deployments: RepositoryDeployments = {
        commands: ['**/*'], // Too broad
        agents: ['*.js'], // Might conflict with commands
        hooks: []
      };

      const result = await deploymentMapper.validateDeployments(deployments);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle empty deployments', async () => {
      const deployments: RepositoryDeployments = {};

      const result = await deploymentMapper.validateDeployments(deployments);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect conflicting patterns', async () => {
      const deployments: RepositoryDeployments = {
        commands: ['*.js'],
        agents: ['*.js'], // Same pattern
        hooks: []
      };

      const result = await deploymentMapper.validateDeployments(deployments);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('conflict'))).toBe(true);
    });
  });

  describe('getDeploymentsByType', () => {
    beforeEach(() => {
      // Setup mock files for each type
      mockGetAllFiles.mockImplementation(async () => [
        '.claude/commands/cmd1.js',
        '.claude/commands/cmd2.ts',
        '.claude/agents/agent1.js',
        '.claude/hooks/hook1.js'
      ]);
      mockFileExists.mockResolvedValue(true);
    });

    it('should return deployments for commands type', async () => {
      const result = await deploymentMapper.getDeploymentsByType(mockRepository, 'commands');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('commands');
      expect(result[0].files.length).toBeGreaterThan(0);
    });

    it('should return deployments for agents type', async () => {
      const result = await deploymentMapper.getDeploymentsByType(mockRepository, 'agents');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('agents');
    });

    it('should return deployments for hooks type', async () => {
      const result = await deploymentMapper.getDeploymentsByType(mockRepository, 'hooks');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('hooks');
    });

    it('should return empty array for type with no files', async () => {
      mockGetAllFiles.mockResolvedValue([]);

      const result = await deploymentMapper.getDeploymentsByType(mockRepository, 'commands');

      expect(result).toHaveLength(0);
    });
  });

  describe('getDeployedFiles', () => {
    it('should return all deployed files across types', async () => {
      mockGetAllFiles.mockResolvedValue([
        '.claude/commands/cmd1.js',
        '.claude/agents/agent1.js',
        '.claude/hooks/hook1.js'
      ]);

      const result = await deploymentMapper.getDeployedFiles(mockRepository);

      expect(result).toHaveLength(3);
      expect(result).toContain('commands/cmd1.js');
      expect(result).toContain('agents/agent1.js');
      expect(result).toContain('hooks/hook1.js');
    });

    it('should handle repository with no deployed files', async () => {
      mockGetAllFiles.mockResolvedValue([]);

      const result = await deploymentMapper.getDeployedFiles(mockRepository);

      expect(result).toHaveLength(0);
    });

    it('should resolve paths correctly', async () => {
      mockGetAllFiles.mockResolvedValue([
        '.claude/commands/subfolder/cmd.js',
        'commands/root-level.js'
      ]);

      const result = await deploymentMapper.getDeployedFiles(mockRepository);

      expect(result).toContain('commands/subfolder/cmd.js');
      expect(result).toContain('commands/root-level.js');
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      mockGetAllFiles.mockRejectedValue(new Error('File system error'));

      const result = await deploymentMapper.mapDeployments(mockRepository);

      expect(result.deployments).toHaveLength(0);
      expect(result.totalFiles).toBe(0);
    });

    it('should handle permission errors', async () => {
      mockFileExists.mockRejectedValue(new Error('EACCES: permission denied'));

      const deploymentInfo: DeploymentInfo = {
        type: 'commands',
        files: ['test.js'],
        status: 'active'
      };

      const result = await deploymentMapper.checkDeploymentStatus(deploymentInfo, '/restricted/path');

      expect(result.status).toBe('error');
    });

    it('should handle malformed repository objects', async () => {
      const malformedRepo = {} as Repository;

      const result = await deploymentMapper.mapDeployments(malformedRepo);

      expect(result.deployments).toHaveLength(0);
      expect(result.totalFiles).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle type-based deployment repository', async () => {
      const typeBasedRepo = createMockRepository({
        type: 'commands',
        deploymentMode: 'type-based'
      });

      mockGetAllFiles.mockResolvedValue([
        'main-command.js',
        'utils/helper.js',
        'README.md'
      ]);
      mockFileExists.mockResolvedValue(true);

      const result = await deploymentMapper.mapDeployments(typeBasedRepo);

      expect(result.deployments).toHaveLength(1);
      expect(result.deployments[0].type).toBe('commands');
    });

    it('should handle auto-detect deployment repository', async () => {
      const autoDetectRepo = createMockRepository({
        deploymentMode: 'auto-detect'
      });

      mockGetAllFiles.mockResolvedValue([
        '.claude/commands/cmd.js',
        '.claude/agents/agent.js',
        'other-file.js'
      ]);
      mockFileExists.mockResolvedValue(true);

      const result = await deploymentMapper.mapDeployments(autoDetectRepo);

      expect(result.deployments.length).toBeGreaterThan(0);
    });

    it('should handle large repository with many files', async () => {
      const largeFileList = Array.from({ length: 1000 }, (_, i) => 
        `.claude/commands/cmd${i}.js`
      );

      mockGetAllFiles.mockResolvedValue(largeFileList);
      mockFileExists.mockResolvedValue(true);

      const result = await deploymentMapper.mapDeployments(mockRepository);

      expect(result.totalFiles).toBe(1000);
      expect(result.deployments[0].files).toHaveLength(1000);
    });
  });
});