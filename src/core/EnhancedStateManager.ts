/**
 * EnhancedStateManager
 * 
 * Extends the base StateManager with deployment tracking, version migration,
 * installation history, and comprehensive state operations. Provides a robust
 * state management system for the install/uninstall commands feature.
 */

import { StateManager } from './StateManager';
import { ErrorRecoveryService } from './ErrorRecoveryService';
import { stateMigration } from '../utils/state-migration';
import {
  StateFileV2,
  DeploymentState,
  InstallationRecord,
  DeployedFile,
  Repository,
  InstallationOperation
} from '../types/state';
import { StateCorruptionError } from '../utils/errors';
import * as crypto from 'crypto';
import * as path from 'path';

/**
 * Filter options for installation history queries
 */
export interface InstallationHistoryFilter {
  repositoryId?: string;
  operation?: InstallationOperation;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

/**
 * State validation result
 */
export interface StateValidationResult {
  valid: boolean;
  errors: Array<{
    type: 'missing_deployment_state' | 'orphaned_deployment_state' | 'invalid_file_path' | 'corrupted_data';
    repositoryId?: string;
    details: string;
  }>;
}

/**
 * State repair result
 */
export interface StateRepairResult {
  repaired: boolean;
  changes: Array<{
    action: string;
    repositoryId?: string;
    details: string;
  }>;
}

/**
 * Deployment statistics
 */
export interface DeploymentStatistics {
  totalRepositories: number;
  installedRepositories: number;
  partiallyInstalledRepositories: number;
  uninstalledRepositories: number;
  totalDeployedFiles: number;
  deploymentsByType: {
    commands: number;
    agents: number;
    hooks: number;
  };
}

/**
 * State export format
 */
export interface StateExport {
  state: StateFileV2;
  exportedAt: string;
  version: number;
}

/**
 * Enhanced state manager with deployment tracking and advanced features
 */
export class EnhancedStateManager {
  private stateCache: StateFileV2 | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5000; // 5 seconds

  constructor(
    private readonly statePath: string,
    private readonly stateManager: StateManager = new StateManager(statePath),
    private readonly errorRecovery: ErrorRecoveryService = new ErrorRecoveryService()
  ) {}

  /**
   * Load state with migration support
   */
  async loadState(): Promise<StateFileV2> {
    try {
      const migrationResult = await stateMigration.checkAndMigrate(this.statePath);
      
      if (migrationResult.migrated) {
        // Save migrated state
        await this.stateManager.saveState(migrationResult.state);
      }
      
      this.invalidateCache();
      
      // Ensure the state has the correct v2 structure
      const state = migrationResult.state;
      if (!state.deploymentStates) {
        console.log('Creating missing deploymentStates property');
        state.deploymentStates = {};
      }
      if (!state.installationHistory) {
        console.log('Creating missing installationHistory property');
        state.installationHistory = [];
      }
      
      return state as StateFileV2;
    } catch (error) {
      if (error instanceof StateCorruptionError && this.errorRecovery.canRecover(error)) {
        const recovery = await this.errorRecovery.recover(error, { statePath: this.statePath });
        
        if (recovery.success && recovery.data) {
          return recovery.data as StateFileV2;
        }
      }
      
      throw error;
    }
  }

  /**
   * Get current state with caching
   */
  private async getState(): Promise<StateFileV2> {
    const now = Date.now();
    
    if (this.stateCache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.stateCache;
    }
    
    // Use loadState() to ensure we get v2 format with migration
    const state = await this.loadState();
    this.stateCache = state;
    this.cacheTimestamp = now;
    
    return state;
  }

  /**
   * Invalidate cache
   */
  private invalidateCache(): void {
    this.stateCache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Save state and invalidate cache
   */
  private async saveState(state: StateFileV2): Promise<void> {
    state.metadata.lastUpdated = new Date().toISOString();
    await this.stateManager.saveState(state);
    this.invalidateCache();
  }

  /**
   * Get deployment state for a repository
   */
  async getDeploymentState(repositoryId: string): Promise<DeploymentState | undefined> {
    const state = await this.getState();
    // Ensure deploymentStates exists
    if (!state.deploymentStates) {
      console.error('Warning: state.deploymentStates is undefined');
      return undefined;
    }
    return state.deploymentStates[repositoryId];
  }

  /**
   * Update deployment state for a repository
   */
  async updateDeploymentState(repositoryId: string, deploymentState: DeploymentState): Promise<void> {
    // Validate deployment state
    if (!this.isValidDeploymentState(deploymentState)) {
      throw new Error('Invalid deployment state: missing required fields');
    }
    
    const state = await this.getState();
    state.deploymentStates[repositoryId] = deploymentState;
    await this.saveState(state);
  }

  /**
   * Remove deployment state for a repository
   */
  async removeDeploymentState(repositoryId: string): Promise<void> {
    const state = await this.getState();
    delete state.deploymentStates[repositoryId];
    await this.saveState(state);
  }

  /**
   * Track installation operation
   */
  async trackInstallation(
    repositoryId: string,
    files: DeployedFile[],
    options?: Record<string, any>
  ): Promise<void> {
    const state = await this.getState();
    const timestamp = new Date().toISOString();
    
    // Update deployment state
    const existingState = state.deploymentStates[repositoryId];
    const deploymentState: DeploymentState = {
      repositoryId,
      lastInstalled: timestamp,
      deployedFiles: existingState ? [...existingState.deployedFiles, ...files] : files,
      installationStatus: 'installed',
      ...(existingState && { lastUninstalled: existingState.lastUninstalled }),
      ...(existingState && { version: existingState.version })
    };
    
    // Remove duplicates
    const uniqueFiles = new Map<string, DeployedFile>();
    deploymentState.deployedFiles.forEach(file => {
      uniqueFiles.set(file.path, file);
    });
    deploymentState.deployedFiles = Array.from(uniqueFiles.values());
    
    state.deploymentStates[repositoryId] = deploymentState;
    
    // Add installation record
    const record: InstallationRecord = {
      id: this.generateRecordId(),
      repositoryId,
      operation: 'install',
      timestamp,
      filesAffected: files.length,
      success: true,
      ...(options && { options })
    };
    
    state.installationHistory.push(record);
    
    await this.saveState(state);
  }

  /**
   * Track uninstallation operation
   */
  async trackUninstallation(
    repositoryId: string,
    removedFiles: string[],
    options?: Record<string, any>
  ): Promise<void> {
    const state = await this.getState();
    const timestamp = new Date().toISOString();
    
    // Update deployment state
    const existingState = state.deploymentStates[repositoryId];
    if (existingState) {
      const remainingFiles = existingState.deployedFiles.filter(
        file => !removedFiles.includes(file.path)
      );
      
      const deploymentState: DeploymentState = {
        ...existingState,
        lastUninstalled: timestamp,
        deployedFiles: remainingFiles,
        installationStatus: remainingFiles.length === 0 ? 'uninstalled' : 'partial'
      };
      
      state.deploymentStates[repositoryId] = deploymentState;
    }
    
    // Add installation record
    const record: InstallationRecord = {
      id: this.generateRecordId(),
      repositoryId,
      operation: 'uninstall',
      timestamp,
      filesAffected: removedFiles.length,
      success: true,
      ...(options && { options })
    };
    
    state.installationHistory.push(record);
    
    await this.saveState(state);
  }

  /**
   * Track unregistration operation
   */
  async trackUnregistration(repositoryId: string): Promise<void> {
    const state = await this.getState();
    const timestamp = new Date().toISOString();
    
    // Remove deployment state
    delete state.deploymentStates[repositoryId];
    
    // Add installation record
    const record: InstallationRecord = {
      id: this.generateRecordId(),
      repositoryId,
      operation: 'unregister',
      timestamp,
      filesAffected: 0,
      success: true
    };
    
    state.installationHistory.push(record);
    
    await this.saveState(state);
  }

  /**
   * Get installation history with filtering
   */
  async getInstallationHistory(filter?: InstallationHistoryFilter): Promise<InstallationRecord[]> {
    const state = await this.getState();
    let history = [...state.installationHistory];
    
    // Apply filters
    if (filter) {
      if (filter.repositoryId) {
        history = history.filter(record => record.repositoryId === filter.repositoryId);
      }
      
      if (filter.operation) {
        history = history.filter(record => record.operation === filter.operation);
      }
      
      if (filter.startDate) {
        history = history.filter(record => 
          new Date(record.timestamp) >= filter.startDate!
        );
      }
      
      if (filter.endDate) {
        history = history.filter(record => 
          new Date(record.timestamp) <= filter.endDate!
        );
      }
      
      // Sort by timestamp descending
      history.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      if (filter.limit) {
        history = history.slice(0, filter.limit);
      }
    }
    
    return history;
  }

  /**
   * Clear installation history
   */
  async clearInstallationHistory(filter?: {
    repositoryId?: string;
    beforeDate?: Date;
  }): Promise<void> {
    const state = await this.getState();
    
    if (!filter) {
      state.installationHistory = [];
    } else {
      state.installationHistory = state.installationHistory.filter(record => {
        if (filter.repositoryId && record.repositoryId === filter.repositoryId) {
          return false;
        }
        
        if (filter.beforeDate && new Date(record.timestamp) < filter.beforeDate) {
          return false;
        }
        
        return true;
      });
    }
    
    await this.saveState(state);
  }

  /**
   * Get deployed files for a repository
   */
  async getDeployedFiles(repositoryId: string): Promise<DeployedFile[]> {
    const deploymentState = await this.getDeploymentState(repositoryId);
    return deploymentState?.deployedFiles || [];
  }

  /**
   * Check if a file is deployed
   */
  async isFileDeployed(repositoryId: string, filePath: string): Promise<boolean> {
    const files = await this.getDeployedFiles(repositoryId);
    return files.some(file => file.path === filePath);
  }

  /**
   * Get repositories by deployment status
   */
  async getRepositoriesByDeploymentStatus(
    status: 'installed' | 'partial' | 'uninstalled'
  ): Promise<Repository[]> {
    const state = await this.getState();
    
    return state.repositories.filter(repo => {
      const deploymentState = state.deploymentStates[repo.id];
      return deploymentState?.installationStatus === status;
    });
  }

  /**
   * Get deployment statistics
   */
  async getDeploymentStatistics(): Promise<DeploymentStatistics> {
    const state = await this.getState();
    
    const stats: DeploymentStatistics = {
      totalRepositories: state.repositories.length,
      installedRepositories: 0,
      partiallyInstalledRepositories: 0,
      uninstalledRepositories: 0,
      totalDeployedFiles: 0,
      deploymentsByType: {
        commands: 0,
        agents: 0,
        hooks: 0
      }
    };
    
    state.repositories.forEach(repo => {
      const deploymentState = state.deploymentStates[repo.id];
      
      if (deploymentState) {
        switch (deploymentState.installationStatus) {
          case 'installed':
            stats.installedRepositories++;
            break;
          case 'partial':
            stats.partiallyInstalledRepositories++;
            break;
          case 'uninstalled':
            stats.uninstalledRepositories++;
            break;
        }
        
        stats.totalDeployedFiles += deploymentState.deployedFiles.length;
        
        // Count files by type
        deploymentState.deployedFiles.forEach(file => {
          // Check for file type in path
          if (file.path.includes('commands/') || file.path.includes('/commands/')) {
            stats.deploymentsByType.commands++;
          } else if (file.path.includes('agents/') || file.path.includes('/agents/')) {
            stats.deploymentsByType.agents++;
          } else if (file.path.includes('hooks/') || file.path.includes('/hooks/')) {
            stats.deploymentsByType.hooks++;
          } else if (file.type) {
            // Use explicit type if available
            switch (file.type) {
              case 'command':
                stats.deploymentsByType.commands++;
                break;
              case 'agent':
                stats.deploymentsByType.agents++;
                break;
              case 'hook':
                stats.deploymentsByType.hooks++;
                break;
            }
          } else {
            // Default to commands if no clear indication
            stats.deploymentsByType.commands++;
          }
        });
      } else {
        stats.uninstalledRepositories++;
      }
    });
    
    return stats;
  }

  /**
   * Bulk update deployment states
   */
  async bulkUpdateDeploymentStates(
    updates: Array<{ repositoryId: string; state: DeploymentState }>
  ): Promise<void> {
    const state = await this.getState();
    
    updates.forEach(update => {
      if (this.isValidDeploymentState(update.state)) {
        state.deploymentStates[update.repositoryId] = update.state;
      }
    });
    
    await this.saveState(state);
  }

  /**
   * Bulk track installations
   */
  async bulkTrackInstallations(
    installations: Array<{ repositoryId: string; files: DeployedFile[] }>
  ): Promise<void> {
    const state = await this.getState();
    const timestamp = new Date().toISOString();
    
    installations.forEach(({ repositoryId, files }) => {
      // Update deployment state
      const existingState = state.deploymentStates[repositoryId];
      const deploymentState: DeploymentState = {
        repositoryId,
        lastInstalled: timestamp,
        deployedFiles: existingState ? [...existingState.deployedFiles, ...files] : files,
        installationStatus: 'installed'
      };
      
      state.deploymentStates[repositoryId] = deploymentState;
      
      // Add installation record
      const record: InstallationRecord = {
        id: this.generateRecordId(),
        repositoryId,
        operation: 'install',
        timestamp,
        filesAffected: files.length,
        success: true
      };
      
      state.installationHistory.push(record);
    });
    
    await this.saveState(state);
  }

  /**
   * Validate state integrity
   */
  async validateState(): Promise<StateValidationResult> {
    const state = await this.getState();
    const errors: StateValidationResult['errors'] = [];
    
    // Check for repositories without deployment states
    state.repositories.forEach(repo => {
      if (!state.deploymentStates[repo.id]) {
        errors.push({
          type: 'missing_deployment_state',
          repositoryId: repo.id,
          details: `Repository ${repo.id} has no deployment state`
        });
      }
    });
    
    // Check for orphaned deployment states
    Object.keys(state.deploymentStates).forEach(repoId => {
      if (!state.repositories.find(repo => repo.id === repoId)) {
        errors.push({
          type: 'orphaned_deployment_state',
          repositoryId: repoId,
          details: `Deployment state for ${repoId} has no corresponding repository`
        });
      }
    });
    
    // Check for invalid file paths
    Object.entries(state.deploymentStates).forEach(([repoId, deploymentState]) => {
      deploymentState.deployedFiles.forEach(file => {
        if (!file.path.includes('.claude/')) {
          errors.push({
            type: 'invalid_file_path',
            repositoryId: repoId,
            details: `Invalid file path: ${file.path}`
          });
        }
      });
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Repair state issues
   */
  async repairState(): Promise<StateRepairResult> {
    const validation = await this.validateState();
    
    if (validation.valid) {
      return { repaired: false, changes: [] };
    }
    
    const state = await this.getState();
    const changes: StateRepairResult['changes'] = [];
    
    validation.errors.forEach(error => {
      switch (error.type) {
        case 'missing_deployment_state':
          if (error.repositoryId) {
            state.deploymentStates[error.repositoryId] = {
              repositoryId: error.repositoryId,
              deployedFiles: [],
              installationStatus: 'uninstalled'
            };
            changes.push({
              action: 'add_missing_deployment_state',
              repositoryId: error.repositoryId,
              details: `Added missing deployment state for ${error.repositoryId}`
            });
          }
          break;
          
        case 'orphaned_deployment_state':
          if (error.repositoryId) {
            delete state.deploymentStates[error.repositoryId];
            changes.push({
              action: 'remove_orphaned_deployment_state',
              repositoryId: error.repositoryId,
              details: `Removed orphaned deployment state for ${error.repositoryId}`
            });
          }
          break;
          
        case 'invalid_file_path':
          // Fix invalid paths by prepending .claude/ if missing
          if (error.repositoryId && state.deploymentStates[error.repositoryId]) {
            const deploymentState = state.deploymentStates[error.repositoryId];
            deploymentState.deployedFiles = deploymentState.deployedFiles.map(file => {
              if (!file.path.includes('.claude/')) {
                return { ...file, path: `.claude/${file.path}` };
              }
              return file;
            });
            changes.push({
              action: 'fix_invalid_file_paths',
              repositoryId: error.repositoryId,
              details: `Fixed invalid file paths for ${error.repositoryId}`
            });
          }
          break;
      }
    });
    
    if (changes.length > 0) {
      await this.saveState(state);
    }
    
    return { repaired: changes.length > 0, changes };
  }

  /**
   * Export state
   */
  async exportState(filter?: { repositoryIds?: string[] }): Promise<StateExport> {
    const state = await this.getState();
    let exportedState = { ...state };
    
    if (filter?.repositoryIds) {
      // Filter repositories
      exportedState.repositories = exportedState.repositories.filter(
        repo => filter.repositoryIds!.includes(repo.id)
      );
      
      // Filter deployment states
      const filteredDeploymentStates: typeof exportedState.deploymentStates = {};
      filter.repositoryIds.forEach(id => {
        if (exportedState.deploymentStates[id]) {
          filteredDeploymentStates[id] = exportedState.deploymentStates[id];
        }
      });
      exportedState.deploymentStates = filteredDeploymentStates;
      
      // Filter installation history
      exportedState.installationHistory = exportedState.installationHistory.filter(
        record => filter.repositoryIds!.includes(record.repositoryId)
      );
    }
    
    return {
      state: exportedState,
      exportedAt: new Date().toISOString(),
      version: 2
    };
  }

  /**
   * Import state
   */
  async importState(
    data: StateExport,
    options?: { merge?: boolean }
  ): Promise<void> {
    if (data.version !== 2) {
      throw new Error('Unsupported state version for import');
    }
    
    const merge = options?.merge ?? true;
    
    if (merge) {
      const currentState = await this.getState();
      
      // Merge repositories
      const existingRepoIds = new Set(currentState.repositories.map(r => r.id));
      data.state.repositories.forEach(repo => {
        if (!existingRepoIds.has(repo.id)) {
          currentState.repositories.push(repo);
        }
      });
      
      // Merge deployment states
      Object.assign(currentState.deploymentStates, data.state.deploymentStates);
      
      // Merge installation history
      currentState.installationHistory.push(...data.state.installationHistory);
      
      await this.saveState(currentState);
    } else {
      // Replace state
      await this.saveState(data.state);
    }
  }

  /**
   * Generate unique record ID
   */
  private generateRecordId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Validate deployment state structure
   */
  private isValidDeploymentState(state: DeploymentState): boolean {
    return !!(
      state.repositoryId &&
      Array.isArray(state.deployedFiles) &&
      state.installationStatus &&
      ['installed', 'partial', 'uninstalled'].includes(state.installationStatus)
    );
  }
}