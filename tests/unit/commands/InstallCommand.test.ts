/**
 * InstallCommand Tests
 * 
 * Tests for the install command that deploys files from registered repositories
 * to the .claude directory without re-registering the repository.
 */

import { InstallCommand } from '../../../src/commands/InstallCommand';
import { EnhancedStateManager } from '../../../src/core/EnhancedStateManager';
import { RepositoryManager } from '../../../src/services/repository-manager';
import { DeploymentService } from '../../../src/core/DeploymentService';
import { CommandOutputFormatter } from '../../../src/utils/command-output-formatter';
import { ConfigurationManager } from '../../../src/core/ConfigurationManager';
import { ErrorRecoveryService } from '../../../src/core/ErrorRecoveryService';
import { InstallationError } from '../../../src/utils/errors';
import { Repository, DeployedFile } from '../../../src/types';
import { StateFileV2 } from '../../../src/types/state';

// Mock dependencies
jest.mock('../../../src/core/EnhancedStateManager');
jest.mock('../../../src/services/repository-manager');
jest.mock('../../../src/services/deployment-service');
jest.mock('../../../src/utils/command-output-formatter');
jest.mock('../../../src/core/ConfigurationManager');
jest.mock('../../../src/core/ErrorRecoveryService');

describe('InstallCommand', () => {
  let installCommand: InstallCommand;
  let mockStateManager: jest.Mocked<EnhancedStateManager>;
  let mockRepositoryManager: jest.Mocked<RepositoryManager>;
  let mockDeploymentService: jest.Mocked<DeploymentService>;
  let mockOutputFormatter: jest.Mocked<CommandOutputFormatter>;
  let mockConfigManager: jest.Mocked<ConfigurationManager>;
  let mockErrorRecovery: jest.Mocked<ErrorRecoveryService>;

  const mockRepository: Repository = {
    id: 'test-repo',
    name: 'test-repo',
    url: 'https://github.com/user/test-repo',
    registeredAt: '2023-01-01T00:00:00.000Z',
    status: 'active',
    deployments: {
      commands: ['test-command.js'],
      agents: [],
      hooks: []
    },
    type: 'commands',
    deploymentMode: 'type-based',
    localPath: '/home/user/repos/test-repo'
  };

  const mockDeployedFiles: DeployedFile[] = [
    {
      path: '.claude/commands/test-command.js',
      hash: 'hash123',
      deployedAt: '2023-01-01T10:00:00.000Z',
      source: 'commands/test-command.js',
      target: '.claude/commands/test-command.js'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockStateManager = new EnhancedStateManager('') as jest.Mocked<EnhancedStateManager>;
    mockRepositoryManager = new RepositoryManager() as jest.Mocked<RepositoryManager>;
    mockDeploymentService = new DeploymentService() as jest.Mocked<DeploymentService>;
    mockOutputFormatter = new CommandOutputFormatter() as jest.Mocked<CommandOutputFormatter>;
    mockConfigManager = new ConfigurationManager() as jest.Mocked<ConfigurationManager>;
    mockErrorRecovery = new ErrorRecoveryService() as jest.Mocked<ErrorRecoveryService>;

    // Default mock implementations
    mockRepositoryManager.getAll.mockResolvedValue([mockRepository]);
    mockRepositoryManager.get.mockResolvedValue(mockRepository);
    mockStateManager.getDeploymentState.mockResolvedValue(undefined);
    mockStateManager.trackInstallation.mockResolvedValue(undefined);
    mockDeploymentService.deploy.mockResolvedValue({
      deployed: mockDeployedFiles.map(f => f.path),
      skipped: [],
      failed: [],
      conflicts: []
    });
    mockConfigManager.get.mockReturnValue({ verbose: false, silent: false });

    // Create command instance
    installCommand = new InstallCommand(
      mockStateManager,
      mockRepositoryManager,
      mockDeploymentService,
      mockOutputFormatter,
      mockConfigManager,
      mockErrorRecovery
    );
  });

  describe('execute', () => {
    it('should install files from a single repository', async () => {
      const options = { repository: 'test-repo' };

      await installCommand.execute(options);

      expect(mockRepositoryManager.get).toHaveBeenCalledWith('test-repo');
      expect(mockDeploymentService.deploy).toHaveBeenCalledWith(
        mockRepository,
        expect.objectContaining({
          force: false,
          skipConflicts: false
        })
      );
      expect(mockStateManager.trackInstallation).toHaveBeenCalledWith(
        'test-repo',
        mockDeployedFiles,
        options
      );
      expect(mockOutputFormatter.formatSuccess).toHaveBeenCalled();
    });

    it('should install files from all registered repositories', async () => {
      const options = {};
      mockRepositoryManager.getAll.mockResolvedValue([
        mockRepository,
        { ...mockRepository, id: 'repo-2', name: 'repo-2' }
      ]);

      await installCommand.execute(options);

      expect(mockRepositoryManager.getAll).toHaveBeenCalled();
      expect(mockDeploymentService.deploy).toHaveBeenCalledTimes(2);
      expect(mockStateManager.trackInstallation).toHaveBeenCalledTimes(2);
      expect(mockOutputFormatter.formatSummary).toHaveBeenCalled();
    });

    it('should handle force option', async () => {
      const options = { repository: 'test-repo', force: true };

      await installCommand.execute(options);

      expect(mockDeploymentService.deploy).toHaveBeenCalledWith(
        mockRepository,
        expect.objectContaining({
          force: true,
          skipConflicts: false
        })
      );
    });

    it('should skip already installed repositories', async () => {
      const options = { repository: 'test-repo' };
      mockStateManager.getDeploymentState.mockResolvedValue({
        repositoryId: 'test-repo',
        deployedFiles: mockDeployedFiles,
        installationStatus: 'installed'
      });

      await installCommand.execute(options);

      expect(mockDeploymentService.deploy).not.toHaveBeenCalled();
      expect(mockOutputFormatter.formatInfo).toHaveBeenCalledWith(
        expect.stringContaining('already installed')
      );
    });

    it('should allow force install on already installed repository', async () => {
      const options = { repository: 'test-repo', force: true };
      mockStateManager.getDeploymentState.mockResolvedValue({
        repositoryId: 'test-repo',
        deployedFiles: mockDeployedFiles,
        installationStatus: 'installed'
      });

      await installCommand.execute(options);

      expect(mockDeploymentService.deploy).toHaveBeenCalled();
    });

    it('should handle deployment conflicts', async () => {
      const options = { repository: 'test-repo' };
      mockDeploymentService.deploy.mockResolvedValue({
        deployed: [],
        skipped: [],
        failed: [],
        conflicts: ['commands/conflict.js']
      });

      await installCommand.execute(options);

      expect(mockOutputFormatter.formatWarning).toHaveBeenCalledWith(
        expect.stringContaining('conflicts')
      );
    });

    it('should handle deployment failures', async () => {
      const options = { repository: 'test-repo' };
      mockDeploymentService.deploy.mockResolvedValue({
        deployed: [],
        skipped: [],
        failed: ['commands/failed.js'],
        conflicts: []
      });

      await installCommand.execute(options);

      expect(mockStateManager.trackInstallation).toHaveBeenCalledWith(
        'test-repo',
        [],
        expect.objectContaining({
          error: expect.stringContaining('failed')
        })
      );
      expect(mockOutputFormatter.formatError).toHaveBeenCalled();
    });

    it('should handle installation errors with recovery', async () => {
      const options = { repository: 'test-repo' };
      const error = new InstallationError(
        'Permission denied',
        'PERMISSION_DENIED',
        'test-repo'
      );
      mockDeploymentService.deploy.mockRejectedValue(error);
      mockErrorRecovery.canRecover.mockReturnValue(true);
      mockErrorRecovery.recover.mockResolvedValue({
        success: true,
        data: {
          deployed: mockDeployedFiles.map(f => f.path),
          skipped: [],
          failed: [],
          conflicts: []
        }
      });

      await installCommand.execute(options);

      expect(mockErrorRecovery.recover).toHaveBeenCalledWith(error, expect.any(Object));
      expect(mockStateManager.trackInstallation).toHaveBeenCalled();
    });

    it('should throw error when recovery fails', async () => {
      const options = { repository: 'test-repo' };
      const error = new InstallationError(
        'Permission denied',
        'PERMISSION_DENIED',
        'test-repo'
      );
      mockDeploymentService.deploy.mockRejectedValue(error);
      mockErrorRecovery.canRecover.mockReturnValue(false);

      await expect(installCommand.execute(options)).rejects.toThrow(error);
    });

    it('should handle repository not found', async () => {
      const options = { repository: 'non-existent' };
      mockRepositoryManager.get.mockResolvedValue(null);

      await expect(installCommand.execute(options)).rejects.toThrow(
        'Repository not found: non-existent'
      );
    });

    it('should handle dry-run mode', async () => {
      const options = { repository: 'test-repo', dryRun: true };

      await installCommand.execute(options);

      expect(mockDeploymentService.deploy).toHaveBeenCalledWith(
        mockRepository,
        expect.objectContaining({
          dryRun: true
        })
      );
      expect(mockStateManager.trackInstallation).not.toHaveBeenCalled();
      expect(mockOutputFormatter.formatInfo).toHaveBeenCalledWith(
        expect.stringContaining('DRY RUN')
      );
    });

    it('should respect silent mode', async () => {
      const options = { repository: 'test-repo', silent: true };
      mockConfigManager.get.mockReturnValue({ verbose: false, silent: true });

      await installCommand.execute(options);

      expect(mockOutputFormatter.setMode).toHaveBeenCalledWith('silent');
    });

    it('should respect verbose mode', async () => {
      const options = { repository: 'test-repo', verbose: true };
      mockConfigManager.get.mockReturnValue({ verbose: true, silent: false });

      await installCommand.execute(options);

      expect(mockOutputFormatter.setMode).toHaveBeenCalledWith('verbose');
    });

    it('should show progress during installation', async () => {
      const options = { repository: 'test-repo' };

      await installCommand.execute(options);

      expect(mockOutputFormatter.showProgress).toHaveBeenCalledWith(
        expect.stringContaining('Installing'),
        expect.any(Function)
      );
    });

    it('should handle specific file patterns', async () => {
      const options = { 
        repository: 'test-repo',
        pattern: '*.js'
      };

      await installCommand.execute(options);

      expect(mockDeploymentService.deploy).toHaveBeenCalledWith(
        mockRepository,
        expect.objectContaining({
          pattern: '*.js'
        })
      );
    });

    it('should track partial installation', async () => {
      const options = { repository: 'test-repo' };
      mockDeploymentService.deploy.mockResolvedValue({
        deployed: [mockDeployedFiles[0].path],
        skipped: ['commands/skipped.js'],
        failed: ['commands/failed.js'],
        conflicts: []
      });

      await installCommand.execute(options);

      expect(mockStateManager.trackInstallation).toHaveBeenCalledWith(
        'test-repo',
        expect.arrayContaining([expect.objectContaining({ path: mockDeployedFiles[0].path })]),
        expect.objectContaining({
          partial: true
        })
      );
    });

    it('should update deployment statistics', async () => {
      const options = {};
      mockRepositoryManager.getAll.mockResolvedValue([mockRepository]);

      await installCommand.execute(options);

      expect(mockStateManager.getDeploymentStatistics).toHaveBeenCalled();
    });
  });

  describe('validateOptions', () => {
    it('should validate repository exists when specified', async () => {
      mockRepositoryManager.get.mockResolvedValue(null);

      await expect(
        installCommand.validateOptions({ repository: 'non-existent' })
      ).rejects.toThrow('Repository not found: non-existent');
    });

    it('should validate conflicting options', async () => {
      await expect(
        installCommand.validateOptions({ force: true, dryRun: true })
      ).rejects.toThrow('Cannot use --force with --dry-run');
    });

    it('should pass validation for valid options', async () => {
      await expect(
        installCommand.validateOptions({ repository: 'test-repo' })
      ).resolves.not.toThrow();
    });
  });
});