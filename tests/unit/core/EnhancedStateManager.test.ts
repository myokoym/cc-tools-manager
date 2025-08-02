/**
 * EnhancedStateManager Tests
 * Tests for enhanced state management with deployment tracking, version migration,
 * installation records, and comprehensive state operations
 */

import { EnhancedStateManager } from '../../../src/core/EnhancedStateManager';
import { StateManager } from '../../../src/core/StateManager';
import { ErrorRecoveryService } from '../../../src/core/ErrorRecoveryService';
import { stateMigration } from '../../../src/utils/state-migration';
import { 
  StateFileV2, 
  DeploymentState, 
  InstallationRecord,
  DeployedFile,
  Repository
} from '../../../src/types/state';
import { StateCorruptionError } from '../../../src/utils/errors';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('../../../src/core/StateManager');
jest.mock('../../../src/core/ErrorRecoveryService');
jest.mock('../../../src/utils/state-migration', () => ({
  stateMigration: {
    checkAndMigrate: jest.fn()
  }
}));
jest.mock('fs');

describe('EnhancedStateManager', () => {
  let enhancedStateManager: EnhancedStateManager;
  let mockStateManager: jest.Mocked<StateManager>;
  let mockErrorRecovery: jest.Mocked<ErrorRecoveryService>;
  let mockFs: jest.Mocked<typeof fs>;
  
  const testStatePath = '/home/test/.claude/state.json';
  
  const mockRepository: Repository = {
    id: 'repo-123',
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

  const mockStateV2: StateFileV2 = {
    version: 2,
    repositories: [mockRepository],
    deploymentStates: {},
    installationHistory: [],
    metadata: {
      lastUpdated: '2023-01-01T00:00:00.000Z',
      lastMigration: null
    }
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset mockStateV2 to clean state
    mockStateV2.repositories = [mockRepository];
    mockStateV2.deploymentStates = {};
    mockStateV2.installationHistory = [];
    
    // Setup mock StateManager
    mockStateManager = {
      getState: jest.fn().mockResolvedValue(mockStateV2),
      saveState: jest.fn().mockResolvedValue(undefined),
      getStatePath: jest.fn().mockReturnValue(testStatePath),
      updateRepositoryState: jest.fn(),
      getRepositoryState: jest.fn(),
      checkForUpdates: jest.fn(),
      getTotalDeployedFiles: jest.fn(),
      getLastCleanupDate: jest.fn(),
      updateCleanupDate: jest.fn()
    } as any;
    
    // Setup mock ErrorRecoveryService
    mockErrorRecovery = {
      recover: jest.fn().mockResolvedValue(true),
      canRecover: jest.fn().mockReturnValue(true)
    } as any;
    
    // Setup mock fs
    mockFs = fs as jest.Mocked<typeof fs>;
    // Don't need to mock fs methods as they're not directly used by EnhancedStateManager
    
    // Create instance
    enhancedStateManager = new EnhancedStateManager(
      testStatePath,
      mockStateManager,
      mockErrorRecovery
    );
  });

  describe('constructor and initialization', () => {
    it('should initialize with required dependencies', () => {
      expect(enhancedStateManager).toBeInstanceOf(EnhancedStateManager);
    });

    it('should initialize with default dependencies if not provided', () => {
      const defaultManager = new EnhancedStateManager(testStatePath);
      expect(defaultManager).toBeInstanceOf(EnhancedStateManager);
    });
  });

  describe('state loading and migration', () => {
    it('should load state and check for migration needs', async () => {
      const mockMigrationResult = {
        migrated: false,
        state: mockStateV2,
        backupPath: null
      };
      
      (stateMigration.checkAndMigrate as jest.Mock).mockResolvedValue(mockMigrationResult);
      
      const state = await enhancedStateManager.loadState();
      
      expect(state).toEqual(mockStateV2);
      expect(stateMigration.checkAndMigrate).toHaveBeenCalledWith(testStatePath);
    });

    it('should handle migration when needed', async () => {
      const migratedState = { ...mockStateV2, metadata: { ...mockStateV2.metadata, lastMigration: '2023-01-02T00:00:00.000Z' } };
      const mockMigrationResult = {
        migrated: true,
        state: migratedState,
        backupPath: `${testStatePath}.backup.v1`
      };
      
      (stateMigration.checkAndMigrate as jest.Mock).mockResolvedValue(mockMigrationResult);
      
      const state = await enhancedStateManager.loadState();
      
      expect(state).toEqual(migratedState);
      expect(mockStateManager.saveState).toHaveBeenCalledWith(migratedState);
    });

    it('should handle corrupted state with recovery', async () => {
      const error = new StateCorruptionError('State file corrupted');
      (stateMigration.checkAndMigrate as jest.Mock).mockRejectedValue(error);
      
      const recoveredState = { ...mockStateV2 };
      mockErrorRecovery.recover.mockResolvedValue({ success: true, data: recoveredState });
      
      const state = await enhancedStateManager.loadState();
      
      expect(state).toEqual(recoveredState);
      expect(mockErrorRecovery.recover).toHaveBeenCalledWith(error, expect.any(Object));
    });

    it('should throw error when recovery fails', async () => {
      const error = new StateCorruptionError('State file corrupted');
      (stateMigration.checkAndMigrate as jest.Mock).mockRejectedValue(error);
      mockErrorRecovery.recover.mockResolvedValue({ success: false });
      
      await expect(enhancedStateManager.loadState()).rejects.toThrow(error);
    });
  });

  describe('deployment state management', () => {
    describe('getDeploymentState', () => {
      it('should return deployment state for repository', async () => {
        const deploymentState: DeploymentState = {
          repositoryId: 'repo-123',
          lastInstalled: '2023-01-01T10:00:00.000Z',
          deployedFiles: [
            { path: '.claude/commands/test.js', hash: 'hash123', deployedAt: '2023-01-01T10:00:00.000Z' }
          ],
          installationStatus: 'installed',
          version: '1.0.0'
        };
        
        mockStateV2.deploymentStates['repo-123'] = deploymentState;
        
        const result = await enhancedStateManager.getDeploymentState('repo-123');
        expect(result).toEqual(deploymentState);
      });

      it('should return undefined for non-existent repository', async () => {
        const result = await enhancedStateManager.getDeploymentState('non-existent');
        expect(result).toBeUndefined();
      });
    });

    describe('updateDeploymentState', () => {
      it('should update deployment state for repository', async () => {
        const deploymentState: DeploymentState = {
          repositoryId: 'repo-123',
          lastInstalled: '2023-01-01T10:00:00.000Z',
          deployedFiles: [
            { path: '.claude/commands/test.js', hash: 'hash123', deployedAt: '2023-01-01T10:00:00.000Z' }
          ],
          installationStatus: 'installed',
          version: '1.0.0'
        };
        
        await enhancedStateManager.updateDeploymentState('repo-123', deploymentState);
        
        expect(mockStateManager.saveState).toHaveBeenCalledWith(
          expect.objectContaining({
            deploymentStates: {
              'repo-123': deploymentState
            }
          })
        );
      });

      it('should validate deployment state before updating', async () => {
        const invalidState = {
          repositoryId: 'repo-123'
          // Missing required fields
        } as DeploymentState;
        
        await expect(
          enhancedStateManager.updateDeploymentState('repo-123', invalidState)
        ).rejects.toThrow('Invalid deployment state');
      });
    });

    describe('removeDeploymentState', () => {
      it('should remove deployment state for repository', async () => {
        mockStateV2.deploymentStates['repo-123'] = {
          repositoryId: 'repo-123',
          deployedFiles: [],
          installationStatus: 'uninstalled'
        };
        
        await enhancedStateManager.removeDeploymentState('repo-123');
        
        expect(mockStateManager.saveState).toHaveBeenCalledWith(
          expect.objectContaining({
            deploymentStates: {}
          })
        );
      });
    });
  });

  describe('installation tracking', () => {
    describe('trackInstallation', () => {
      it('should track successful installation', async () => {
        const files: DeployedFile[] = [
          { path: '.claude/commands/test.js', hash: 'hash123', deployedAt: '2023-01-01T10:00:00.000Z' }
        ];
        
        await enhancedStateManager.trackInstallation('repo-123', files, { force: true });
        
        expect(mockStateManager.saveState).toHaveBeenCalledWith(
          expect.objectContaining({
            deploymentStates: {
              'repo-123': expect.objectContaining({
                repositoryId: 'repo-123',
                lastInstalled: expect.any(String),
                deployedFiles: files,
                installationStatus: 'installed'
              })
            },
            installationHistory: expect.arrayContaining([
              expect.objectContaining({
                repositoryId: 'repo-123',
                operation: 'install',
                filesAffected: 1,
                success: true,
                options: { force: true }
              })
            ])
          })
        );
      });

      it('should handle installation with existing files', async () => {
        const existingState: DeploymentState = {
          repositoryId: 'repo-123',
          deployedFiles: [
            { path: '.claude/commands/old.js', hash: 'oldhash', deployedAt: '2023-01-01T09:00:00.000Z' }
          ],
          installationStatus: 'installed'
        };
        
        mockStateV2.deploymentStates['repo-123'] = existingState;
        
        const newFiles: DeployedFile[] = [
          { path: '.claude/commands/test.js', hash: 'hash123', deployedAt: '2023-01-01T10:00:00.000Z' }
        ];
        
        await enhancedStateManager.trackInstallation('repo-123', newFiles);
        
        const savedState = (mockStateManager.saveState as jest.Mock).mock.calls[0][0];
        expect(savedState.deploymentStates['repo-123'].deployedFiles).toHaveLength(2);
      });
    });

    describe('trackUninstallation', () => {
      it('should track successful uninstallation', async () => {
        const deploymentState: DeploymentState = {
          repositoryId: 'repo-123',
          deployedFiles: [
            { path: '.claude/commands/test.js', hash: 'hash123', deployedAt: '2023-01-01T10:00:00.000Z' }
          ],
          installationStatus: 'installed'
        };
        
        mockStateV2.deploymentStates['repo-123'] = deploymentState;
        
        const removedFiles = ['.claude/commands/test.js'];
        await enhancedStateManager.trackUninstallation('repo-123', removedFiles);
        
        expect(mockStateManager.saveState).toHaveBeenCalledWith(
          expect.objectContaining({
            deploymentStates: {
              'repo-123': expect.objectContaining({
                lastUninstalled: expect.any(String),
                deployedFiles: [],
                installationStatus: 'uninstalled'
              })
            },
            installationHistory: expect.arrayContaining([
              expect.objectContaining({
                repositoryId: 'repo-123',
                operation: 'uninstall',
                filesAffected: 1,
                success: true
              })
            ])
          })
        );
      });

      it('should handle partial uninstallation', async () => {
        const deploymentState: DeploymentState = {
          repositoryId: 'repo-123',
          deployedFiles: [
            { path: '.claude/commands/test1.js', hash: 'hash1', deployedAt: '2023-01-01T10:00:00.000Z' },
            { path: '.claude/commands/test2.js', hash: 'hash2', deployedAt: '2023-01-01T10:00:00.000Z' }
          ],
          installationStatus: 'installed'
        };
        
        mockStateV2.deploymentStates['repo-123'] = deploymentState;
        
        const removedFiles = ['.claude/commands/test1.js'];
        await enhancedStateManager.trackUninstallation('repo-123', removedFiles);
        
        const savedState = (mockStateManager.saveState as jest.Mock).mock.calls[0][0];
        expect(savedState.deploymentStates['repo-123'].deployedFiles).toHaveLength(1);
        expect(savedState.deploymentStates['repo-123'].installationStatus).toBe('partial');
      });
    });

    describe('trackUnregistration', () => {
      it('should track unregistration and clean up deployment state', async () => {
        mockStateV2.deploymentStates['repo-123'] = {
          repositoryId: 'repo-123',
          deployedFiles: [],
          installationStatus: 'uninstalled'
        };
        
        await enhancedStateManager.trackUnregistration('repo-123');
        
        expect(mockStateManager.saveState).toHaveBeenCalledWith(
          expect.objectContaining({
            deploymentStates: {},
            installationHistory: expect.arrayContaining([
              expect.objectContaining({
                repositoryId: 'repo-123',
                operation: 'unregister',
                success: true
              })
            ])
          })
        );
      });
    });
  });

  describe('installation history', () => {
    describe('getInstallationHistory', () => {
      it('should return all installation history', async () => {
        const history: InstallationRecord[] = [
          {
            id: 'record-1',
            repositoryId: 'repo-123',
            operation: 'install',
            timestamp: '2023-01-01T10:00:00.000Z',
            filesAffected: 2,
            success: true
          },
          {
            id: 'record-2',
            repositoryId: 'repo-456',
            operation: 'uninstall',
            timestamp: '2023-01-01T11:00:00.000Z',
            filesAffected: 1,
            success: true
          }
        ];
        
        mockStateV2.installationHistory = history;
        
        const result = await enhancedStateManager.getInstallationHistory();
        expect(result).toEqual(history);
      });

      it('should filter history by repository', async () => {
        const history: InstallationRecord[] = [
          {
            id: 'record-1',
            repositoryId: 'repo-123',
            operation: 'install',
            timestamp: '2023-01-01T10:00:00.000Z',
            filesAffected: 2,
            success: true
          },
          {
            id: 'record-2',
            repositoryId: 'repo-456',
            operation: 'uninstall',
            timestamp: '2023-01-01T11:00:00.000Z',
            filesAffected: 1,
            success: true
          }
        ];
        
        mockStateV2.installationHistory = history;
        
        const result = await enhancedStateManager.getInstallationHistory({ repositoryId: 'repo-123' });
        expect(result).toHaveLength(1);
        expect(result[0].repositoryId).toBe('repo-123');
      });

      it('should filter history by operation', async () => {
        const history: InstallationRecord[] = [
          {
            id: 'record-1',
            repositoryId: 'repo-123',
            operation: 'install',
            timestamp: '2023-01-01T10:00:00.000Z',
            filesAffected: 2,
            success: true
          },
          {
            id: 'record-2',
            repositoryId: 'repo-456',
            operation: 'uninstall',
            timestamp: '2023-01-01T11:00:00.000Z',
            filesAffected: 1,
            success: true
          }
        ];
        
        mockStateV2.installationHistory = history;
        
        const result = await enhancedStateManager.getInstallationHistory({ operation: 'install' });
        expect(result).toHaveLength(1);
        expect(result[0].operation).toBe('install');
      });

      it('should filter history by date range', async () => {
        const history: InstallationRecord[] = [
          {
            id: 'record-1',
            repositoryId: 'repo-123',
            operation: 'install',
            timestamp: '2023-01-01T10:00:00.000Z',
            filesAffected: 2,
            success: true
          },
          {
            id: 'record-2',
            repositoryId: 'repo-456',
            operation: 'uninstall',
            timestamp: '2023-01-02T11:00:00.000Z',
            filesAffected: 1,
            success: true
          }
        ];
        
        mockStateV2.installationHistory = history;
        
        const result = await enhancedStateManager.getInstallationHistory({
          startDate: new Date('2023-01-02T00:00:00.000Z'),
          endDate: new Date('2023-01-03T00:00:00.000Z')
        });
        
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('record-2');
      });

      it('should limit results', async () => {
        const history: InstallationRecord[] = Array.from({ length: 10 }, (_, i) => ({
          id: `record-${i}`,
          repositoryId: 'repo-123',
          operation: 'install' as const,
          timestamp: new Date(Date.now() - i * 1000).toISOString(),
          filesAffected: 1,
          success: true
        }));
        
        mockStateV2.installationHistory = history;
        
        const result = await enhancedStateManager.getInstallationHistory({ limit: 5 });
        expect(result).toHaveLength(5);
      });
    });

    describe('clearInstallationHistory', () => {
      it('should clear all history when no filter provided', async () => {
        mockStateV2.installationHistory = [
          {
            id: 'record-1',
            repositoryId: 'repo-123',
            operation: 'install',
            timestamp: '2023-01-01T10:00:00.000Z',
            filesAffected: 2,
            success: true
          }
        ];
        
        await enhancedStateManager.clearInstallationHistory();
        
        expect(mockStateManager.saveState).toHaveBeenCalledWith(
          expect.objectContaining({
            installationHistory: []
          })
        );
      });

      it('should clear history for specific repository', async () => {
        mockStateV2.installationHistory = [
          {
            id: 'record-1',
            repositoryId: 'repo-123',
            operation: 'install',
            timestamp: '2023-01-01T10:00:00.000Z',
            filesAffected: 2,
            success: true
          },
          {
            id: 'record-2',
            repositoryId: 'repo-456',
            operation: 'install',
            timestamp: '2023-01-01T11:00:00.000Z',
            filesAffected: 1,
            success: true
          }
        ];
        
        await enhancedStateManager.clearInstallationHistory({ repositoryId: 'repo-123' });
        
        const savedState = (mockStateManager.saveState as jest.Mock).mock.calls[0][0];
        expect(savedState.installationHistory).toHaveLength(1);
        expect(savedState.installationHistory[0].repositoryId).toBe('repo-456');
      });

      it('should clear history before specific date', async () => {
        mockStateV2.installationHistory = [
          {
            id: 'record-1',
            repositoryId: 'repo-123',
            operation: 'install',
            timestamp: '2023-01-01T10:00:00.000Z',
            filesAffected: 2,
            success: true
          },
          {
            id: 'record-2',
            repositoryId: 'repo-456',
            operation: 'install',
            timestamp: '2023-01-03T11:00:00.000Z',
            filesAffected: 1,
            success: true
          }
        ];
        
        await enhancedStateManager.clearInstallationHistory({ 
          beforeDate: new Date('2023-01-02T00:00:00.000Z') 
        });
        
        const savedState = (mockStateManager.saveState as jest.Mock).mock.calls[0][0];
        expect(savedState.installationHistory).toHaveLength(1);
        expect(savedState.installationHistory[0].id).toBe('record-2');
      });
    });
  });

  describe('deployment queries', () => {
    describe('getDeployedFiles', () => {
      it('should return deployed files for repository', async () => {
        const deploymentState: DeploymentState = {
          repositoryId: 'repo-123',
          deployedFiles: [
            { path: '.claude/commands/test1.js', hash: 'hash1', deployedAt: '2023-01-01T10:00:00.000Z' },
            { path: '.claude/commands/test2.js', hash: 'hash2', deployedAt: '2023-01-01T10:00:00.000Z' }
          ],
          installationStatus: 'installed'
        };
        
        mockStateV2.deploymentStates['repo-123'] = deploymentState;
        
        const files = await enhancedStateManager.getDeployedFiles('repo-123');
        expect(files).toEqual(deploymentState.deployedFiles);
      });

      it('should return empty array for non-existent repository', async () => {
        const files = await enhancedStateManager.getDeployedFiles('non-existent');
        expect(files).toEqual([]);
      });
    });

    describe('isFileDeployed', () => {
      it('should return true for deployed file', async () => {
        mockStateV2.deploymentStates['repo-123'] = {
          repositoryId: 'repo-123',
          deployedFiles: [
            { path: '.claude/commands/test.js', hash: 'hash123', deployedAt: '2023-01-01T10:00:00.000Z' }
          ],
          installationStatus: 'installed'
        };
        
        const result = await enhancedStateManager.isFileDeployed('repo-123', '.claude/commands/test.js');
        expect(result).toBe(true);
      });

      it('should return false for non-deployed file', async () => {
        mockStateV2.deploymentStates['repo-123'] = {
          repositoryId: 'repo-123',
          deployedFiles: [],
          installationStatus: 'uninstalled'
        };
        
        const result = await enhancedStateManager.isFileDeployed('repo-123', '.claude/commands/test.js');
        expect(result).toBe(false);
      });
    });

    describe('getRepositoriesByDeploymentStatus', () => {
      it('should return repositories with specific deployment status', async () => {
        mockStateV2.repositories = [
          { ...mockRepository, id: 'repo-1' },
          { ...mockRepository, id: 'repo-2' },
          { ...mockRepository, id: 'repo-3' }
        ];
        
        mockStateV2.deploymentStates = {
          'repo-1': { repositoryId: 'repo-1', deployedFiles: [], installationStatus: 'installed' },
          'repo-2': { repositoryId: 'repo-2', deployedFiles: [], installationStatus: 'uninstalled' },
          'repo-3': { repositoryId: 'repo-3', deployedFiles: [], installationStatus: 'installed' }
        };
        
        const result = await enhancedStateManager.getRepositoriesByDeploymentStatus('installed');
        expect(result).toHaveLength(2);
        expect(result.map(r => r.id)).toEqual(['repo-1', 'repo-3']);
      });
    });

    describe('getDeploymentStatistics', () => {
      it('should return deployment statistics', async () => {
        mockStateV2.repositories = [
          { ...mockRepository, id: 'repo-1' },
          { ...mockRepository, id: 'repo-2' },
          { ...mockRepository, id: 'repo-3' }
        ];
        
        mockStateV2.deploymentStates = {
          'repo-1': { 
            repositoryId: 'repo-1', 
            deployedFiles: [
              { path: 'file1.js', hash: 'hash1', deployedAt: '2023-01-01T10:00:00.000Z' },
              { path: 'file2.js', hash: 'hash2', deployedAt: '2023-01-01T10:00:00.000Z' }
            ], 
            installationStatus: 'installed' 
          },
          'repo-2': { 
            repositoryId: 'repo-2', 
            deployedFiles: [], 
            installationStatus: 'uninstalled' 
          },
          'repo-3': { 
            repositoryId: 'repo-3', 
            deployedFiles: [
              { path: 'file3.js', hash: 'hash3', deployedAt: '2023-01-01T10:00:00.000Z' }
            ], 
            installationStatus: 'partial' 
          }
        };
        
        const stats = await enhancedStateManager.getDeploymentStatistics();
        
        expect(stats).toEqual({
          totalRepositories: 3,
          installedRepositories: 1,
          partiallyInstalledRepositories: 1,
          uninstalledRepositories: 1,
          totalDeployedFiles: 3,
          deploymentsByType: {
            commands: 3,
            agents: 0,
            hooks: 0
          }
        });
      });
    });
  });

  describe('bulk operations', () => {
    describe('bulkUpdateDeploymentStates', () => {
      it('should update multiple deployment states', async () => {
        // Reset state to clean state
        const cleanState = {
          version: 2,
          repositories: [],
          deploymentStates: {},
          installationHistory: [],
          metadata: {
            lastUpdated: '2023-01-01T00:00:00.000Z',
            lastMigration: null
          }
        };
        mockStateManager.getState.mockResolvedValueOnce(cleanState);
        
        const updates = [
          { 
            repositoryId: 'repo-1', 
            state: { 
              repositoryId: 'repo-1', 
              deployedFiles: [], 
              installationStatus: 'installed' as const 
            } 
          },
          { 
            repositoryId: 'repo-2', 
            state: { 
              repositoryId: 'repo-2', 
              deployedFiles: [], 
              installationStatus: 'uninstalled' as const 
            } 
          }
        ];
        
        await enhancedStateManager.bulkUpdateDeploymentStates(updates);
        
        expect(mockStateManager.saveState).toHaveBeenCalledWith(
          expect.objectContaining({
            deploymentStates: {
              'repo-1': updates[0].state,
              'repo-2': updates[1].state
            }
          })
        );
      });
    });

    describe('bulkTrackInstallations', () => {
      it('should track multiple installations', async () => {
        // Reset state to clean state
        const cleanState = {
          version: 2,
          repositories: [],
          deploymentStates: {},
          installationHistory: [],
          metadata: {
            lastUpdated: '2023-01-01T00:00:00.000Z',
            lastMigration: null
          }
        };
        mockStateManager.getState.mockResolvedValueOnce(cleanState);
        
        const installations = [
          { 
            repositoryId: 'repo-1', 
            files: [
              { path: 'file1.js', hash: 'hash1', deployedAt: '2023-01-01T10:00:00.000Z' }
            ]
          },
          { 
            repositoryId: 'repo-2', 
            files: [
              { path: 'file2.js', hash: 'hash2', deployedAt: '2023-01-01T10:00:00.000Z' }
            ]
          }
        ];
        
        await enhancedStateManager.bulkTrackInstallations(installations);
        
        const savedState = (mockStateManager.saveState as jest.Mock).mock.calls[0][0];
        expect(savedState.deploymentStates['repo-1'].deployedFiles).toHaveLength(1);
        expect(savedState.deploymentStates['repo-2'].deployedFiles).toHaveLength(1);
        expect(savedState.installationHistory.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('state validation and repair', () => {
    describe('validateState', () => {
      it('should validate correct state', async () => {
        // Ensure the mock state has deployment state for the repository
        const validState = {
          ...mockStateV2,
          deploymentStates: {
            'repo-123': {
              repositoryId: 'repo-123',
              deployedFiles: [],
              installationStatus: 'uninstalled' as const
            }
          }
        };
        mockStateManager.getState.mockResolvedValueOnce(validState);
        
        const result = await enhancedStateManager.validateState();
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should detect missing deployment states', async () => {
        // Set up state with missing deployment state
        const stateWithMissing = {
          ...mockStateV2,
          repositories: [
            mockRepository,
            { ...mockRepository, id: 'repo-without-state' }
          ],
          deploymentStates: {
            'repo-123': {
              repositoryId: 'repo-123',
              deployedFiles: [],
              installationStatus: 'uninstalled' as const
            }
          }
        };
        mockStateManager.getState.mockResolvedValueOnce(stateWithMissing);
        
        const result = await enhancedStateManager.validateState();
        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            type: 'missing_deployment_state'
          })
        );
      });

      it('should detect orphaned deployment states', async () => {
        // Add deployment state without repository
        mockStateV2.deploymentStates['orphaned-repo'] = {
          repositoryId: 'orphaned-repo',
          deployedFiles: [],
          installationStatus: 'uninstalled'
        };
        
        const result = await enhancedStateManager.validateState();
        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            type: 'orphaned_deployment_state'
          })
        );
      });

      it('should detect invalid file paths', async () => {
        mockStateV2.deploymentStates['repo-123'] = {
          repositoryId: 'repo-123',
          deployedFiles: [
            { path: 'invalid/path/without/claude', hash: 'hash', deployedAt: '2023-01-01T10:00:00.000Z' }
          ],
          installationStatus: 'installed'
        };
        
        const result = await enhancedStateManager.validateState();
        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            type: 'invalid_file_path'
          })
        );
      });
    });

    describe('repairState', () => {
      it('should repair state with validation errors', async () => {
        // Setup state with errors
        mockStateV2.repositories.push({ ...mockRepository, id: 'repo-without-state' });
        mockStateV2.deploymentStates['orphaned-repo'] = {
          repositoryId: 'orphaned-repo',
          deployedFiles: [],
          installationStatus: 'uninstalled'
        };
        
        const result = await enhancedStateManager.repairState();
        
        expect(result.repaired).toBe(true);
        expect(result.changes).toContainEqual(
          expect.objectContaining({
            action: 'add_missing_deployment_state'
          })
        );
        expect(result.changes).toContainEqual(
          expect.objectContaining({
            action: 'remove_orphaned_deployment_state'
          })
        );
        expect(mockStateManager.saveState).toHaveBeenCalled();
      });

      it('should not modify valid state', async () => {
        // Ensure the mock state is valid
        const validState = {
          ...mockStateV2,
          deploymentStates: {
            'repo-123': {
              repositoryId: 'repo-123',
              deployedFiles: [],
              installationStatus: 'uninstalled' as const
            }
          }
        };
        mockStateManager.getState.mockResolvedValue(validState);
        
        const result = await enhancedStateManager.repairState();
        
        expect(result.repaired).toBe(false);
        expect(result.changes).toEqual([]);
        expect(mockStateManager.saveState).not.toHaveBeenCalled();
      });
    });
  });

  describe('export and import', () => {
    describe('exportState', () => {
      it('should export full state', async () => {
        const exported = await enhancedStateManager.exportState();
        
        expect(exported).toEqual({
          state: mockStateV2,
          exportedAt: expect.any(String),
          version: 2
        });
      });

      it('should export filtered state', async () => {
        mockStateV2.repositories = [
          { ...mockRepository, id: 'repo-1' },
          { ...mockRepository, id: 'repo-2' }
        ];
        mockStateV2.deploymentStates = {
          'repo-1': { repositoryId: 'repo-1', deployedFiles: [], installationStatus: 'installed' },
          'repo-2': { repositoryId: 'repo-2', deployedFiles: [], installationStatus: 'uninstalled' }
        };
        
        const exported = await enhancedStateManager.exportState({
          repositoryIds: ['repo-1']
        });
        
        expect(exported.state.repositories).toHaveLength(1);
        expect(exported.state.repositories[0].id).toBe('repo-1');
        expect(exported.state.deploymentStates).toHaveProperty('repo-1');
        expect(exported.state.deploymentStates).not.toHaveProperty('repo-2');
      });
    });

    describe('importState', () => {
      it('should import and merge state', async () => {
        // Set up clean initial state with just one repo
        const currentStateForMerge = {
          version: 2,
          repositories: [mockRepository],
          deploymentStates: {
            'repo-123': {
              repositoryId: 'repo-123',
              deployedFiles: [],
              installationStatus: 'uninstalled' as const
            }
          },
          installationHistory: [],
          metadata: {
            lastUpdated: '2023-01-01T00:00:00.000Z',
            lastMigration: null
          }
        };
        mockStateManager.getState.mockResolvedValueOnce(currentStateForMerge);
        
        const importData = {
          state: {
            version: 2,
            repositories: [
              { ...mockRepository, id: 'imported-repo' }
            ],
            deploymentStates: {
              'imported-repo': { 
                repositoryId: 'imported-repo', 
                deployedFiles: [], 
                installationStatus: 'installed' as const 
              }
            },
            installationHistory: [],
            metadata: {
              lastUpdated: '2023-01-02T00:00:00.000Z',
              lastMigration: null
            }
          },
          exportedAt: '2023-01-02T00:00:00.000Z',
          version: 2
        };
        
        await enhancedStateManager.importState(importData, { merge: true });
        
        const savedState = (mockStateManager.saveState as jest.Mock).mock.calls[0][0];
        expect(savedState.repositories).toHaveLength(2); // Original + imported
        expect(savedState.deploymentStates).toHaveProperty('repo-123');
        expect(savedState.deploymentStates).toHaveProperty('imported-repo');
      });

      it('should replace state when merge is false', async () => {
        const importData = {
          state: {
            version: 2,
            repositories: [
              { ...mockRepository, id: 'imported-repo' }
            ],
            deploymentStates: {
              'imported-repo': { 
                repositoryId: 'imported-repo', 
                deployedFiles: [], 
                installationStatus: 'installed' as const 
              }
            },
            installationHistory: [],
            metadata: {
              lastUpdated: '2023-01-02T00:00:00.000Z',
              lastMigration: null
            }
          },
          exportedAt: '2023-01-02T00:00:00.000Z',
          version: 2
        };
        
        await enhancedStateManager.importState(importData, { merge: false });
        
        const savedState = (mockStateManager.saveState as jest.Mock).mock.calls[0][0];
        expect(savedState.repositories).toHaveLength(1);
        expect(savedState.repositories[0].id).toBe('imported-repo');
      });

      it('should validate imported state', async () => {
        const importData = {
          state: {
            version: 1, // Wrong version
            repositories: []
          } as any,
          exportedAt: '2023-01-02T00:00:00.000Z',
          version: 1
        };
        
        await expect(
          enhancedStateManager.importState(importData)
        ).rejects.toThrow('Unsupported state version');
      });
    });
  });

  describe('performance optimizations', () => {
    it('should cache frequently accessed data', async () => {
      // First call should load state
      await enhancedStateManager.getDeploymentState('repo-123');
      expect(mockStateManager.getState).toHaveBeenCalledTimes(1);
      
      // Second call should use cache
      await enhancedStateManager.getDeploymentState('repo-123');
      expect(mockStateManager.getState).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache on updates', async () => {
      // Load and cache
      await enhancedStateManager.getDeploymentState('repo-123');
      
      // Update should invalidate cache
      await enhancedStateManager.updateDeploymentState('repo-123', {
        repositoryId: 'repo-123',
        deployedFiles: [],
        installationStatus: 'installed'
      });
      
      // Next read should reload
      await enhancedStateManager.getDeploymentState('repo-123');
      expect(mockStateManager.getState).toHaveBeenCalledTimes(2);
    });
  });
});