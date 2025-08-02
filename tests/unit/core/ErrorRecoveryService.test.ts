import { ErrorRecoveryService } from '../../../src/core/ErrorRecoveryService';
import { InstallationError, StateCorruptionError } from '../../../src/utils/errors';
import { RecoveryStrategy, RecoveryOptions } from '../../../src/core/interfaces/IErrorRecoveryService';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock logger
const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

describe('ErrorRecoveryService', () => {
  let service: ErrorRecoveryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ErrorRecoveryService(mockLogger as any);
  });

  describe('handleInstallError', () => {
    it('should handle CLONE_FAILED with retry strategy', async () => {
      const error = new InstallationError(
        'CLONE_FAILED',
        'Failed to clone repository',
        'test-repo',
        true
      );

      const result = await service.handleInstallError(error, { maxRetries: 2 });

      expect(result.strategy).toBe(RecoveryStrategy.RETRY);
      expect(result.success).toBe(false); // Mock scenario - would normally attempt recovery
      expect(result.message).toContain('clone_failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle PERMISSION_DENIED with manual intervention', async () => {
      const error = new InstallationError(
        'PERMISSION_DENIED',
        'Access denied',
        'private-repo',
        false
      );

      const result = await service.handleInstallError(error);

      expect(result.strategy).toBe(RecoveryStrategy.MANUAL_INTERVENTION);
      expect(result.success).toBe(false);
      expect(result.message).toContain('PERMISSION_DENIED');
    });

    it('should handle NETWORK_ERROR with retry strategy', async () => {
      const error = new InstallationError(
        'NETWORK_ERROR',
        'Network timeout',
        'remote-repo',
        true
      );

      const result = await service.handleInstallError(error, { maxRetries: 3 });

      expect(result.strategy).toBe(RecoveryStrategy.RETRY);
      expect(result.message).toContain('network_error');
    });

    it('should handle VALIDATION_FAILED with skip strategy', async () => {
      const error = new InstallationError(
        'VALIDATION_FAILED',
        'Invalid repository format',
        'invalid-repo',
        false
      );

      const result = await service.handleInstallError(error, { skipOnFailure: true });

      expect(result.strategy).toBe(RecoveryStrategy.SKIP);
      expect(result.message).toContain('validation');
    });

    it('should respect maxRetries option', async () => {
      const error = new InstallationError(
        'CLONE_FAILED',
        'Clone failed',
        'test-repo',
        true
      );

      const result = await service.handleInstallError(error, { maxRetries: 5 });

      expect(result.retryCount).toBeLessThanOrEqual(5);
    });
  });

  describe('handleStateError', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readFileSync.mockReturnValue('{}');
      mockFs.writeFileSync.mockImplementation(() => {});
    });

    it('should handle state corruption with backup restoration', async () => {
      const error = new StateCorruptionError(
        'JSON parse error',
        '/app/state.json',
        '/app/state.backup.json'
      );

      mockFs.existsSync.mockImplementation((filePath) => {
        return filePath === '/app/state.backup.json';
      });

      const result = await service.handleStateError(error);

      expect(result.strategy).toBe(RecoveryStrategy.RESTORE_BACKUP);
      expect(result.success).toBe(true);
      expect(result.backupUsed).toBe('/app/state.backup.json');
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/app/state.backup.json', 'utf8');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith('/app/state.json', '{}');
    });

    it('should handle state corruption without backup by recreating state', async () => {
      const error = new StateCorruptionError(
        'File corrupted',
        '/app/state.json'
      );

      mockFs.existsSync.mockReturnValue(false);

      const result = await service.handleStateError(error);

      expect(result.strategy).toBe(RecoveryStrategy.RECREATE_STATE);
      expect(result.success).toBe(true);
      expect(result.message).toContain('recreated');
    });

    it('should handle state error with createBackup option', async () => {
      const error = new StateCorruptionError(
        'State corrupted',
        '/app/state.json'
      );

      // Mock that the state file exists for backup creation
      mockFs.existsSync.mockImplementation((path) => {
        return path === '/app/state.json';
      });
      mockFs.readFileSync.mockReturnValue('corrupted data');

      const result = await service.handleStateError(error, { createBackup: true });

      expect(result.success).toBe(true);
      
      // Check that backup was created - look for .backup. pattern
      const backupCalls = mockFs.writeFileSync.mock.calls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('.backup.')
      );
      expect(backupCalls.length).toBeGreaterThan(0);
      expect(backupCalls[0][1]).toBe('corrupted data');
    });

    it('should handle missing state file', async () => {
      const error = new StateCorruptionError('State file missing');

      const result = await service.handleStateError(error);

      expect(result.strategy).toBe(RecoveryStrategy.RECREATE_STATE);
      expect(result.success).toBe(true);
    });
  });

  describe('getRecoveryStrategy', () => {
    it('should return correct strategy for error codes', () => {
      const strategies = [
        { code: 'CLONE_FAILED', expected: RecoveryStrategy.RETRY },
        { code: 'NETWORK_ERROR', expected: RecoveryStrategy.RETRY },
        { code: 'PERMISSION_DENIED', expected: RecoveryStrategy.MANUAL_INTERVENTION },
        { code: 'VALIDATION_FAILED', expected: RecoveryStrategy.SKIP },
        { code: 'UNKNOWN_ERROR', expected: RecoveryStrategy.MANUAL_INTERVENTION },
      ];

      strategies.forEach(({ code, expected }) => {
        expect(service.getRecoveryStrategy(code)).toBe(expected);
      });
    });
  });

  describe('isRecoverable', () => {
    it('should return true for recoverable installation errors', () => {
      const error = new InstallationError(
        'CLONE_FAILED',
        'Clone failed',
        'repo',
        true
      );

      expect(service.isRecoverable(error)).toBe(true);
    });

    it('should return false for non-recoverable installation errors', () => {
      const error = new InstallationError(
        'PERMISSION_DENIED',
        'Access denied',
        'repo',
        false
      );

      expect(service.isRecoverable(error)).toBe(false);
    });

    it('should return true for state corruption errors', () => {
      const error = new StateCorruptionError('State corrupted');

      expect(service.isRecoverable(error)).toBe(true);
    });
  });

  describe('formatUserMessage', () => {
    it('should format installation error message', () => {
      const error = new InstallationError(
        'CLONE_FAILED',
        'Git clone failed',
        'test-repo',
        true
      );

      const message = service.formatUserMessage(error);

      expect(message).toContain('Installation failed');
      expect(message).toContain('test-repo');
      expect(message).toContain('Git clone failed');
      expect(message).toContain('CLONE_FAILED');
    });

    it('should format state corruption error message', () => {
      const error = new StateCorruptionError(
        'JSON parse error',
        '/app/state.json',
        '/app/backup.json'
      );

      const message = service.formatUserMessage(error);

      expect(message).toContain('State corruption detected');
      expect(message).toContain('/app/state.json');
      expect(message).toContain('Backup available');
    });

    it('should format state error without backup', () => {
      const error = new StateCorruptionError(
        'File corrupted',
        '/app/state.json'
      );

      const message = service.formatUserMessage(error);

      expect(message).toContain('State corruption detected');
      expect(message).not.toContain('backup available');
    });
  });

  describe('logError', () => {
    it('should log installation error with context', () => {
      const error = new InstallationError(
        'CLONE_FAILED',
        'Clone failed',
        'test-repo'
      );

      const context = { userId: '123', action: 'install' };

      service.logError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Installation error occurred',
        expect.objectContaining({
          errorCode: 'CLONE_FAILED',
          repository: 'test-repo',
          recoverable: false,
          context,
        })
      );
    });

    it('should log state corruption error', () => {
      const error = new StateCorruptionError(
        'Parse error',
        '/app/state.json'
      );

      service.logError(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'State corruption error occurred',
        expect.objectContaining({
          stateFile: '/app/state.json',
          message: 'Parse error',
        })
      );
    });
  });
});