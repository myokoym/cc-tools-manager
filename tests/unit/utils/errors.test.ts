import {
  BaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  NetworkError,
  TimeoutError,
  FileSystemError,
  ConfigurationError,
  ExternalServiceError,
  AggregateError,
  InstallationError,
  StateCorruptionError,
  isOperationalError,
  toBaseError,
} from '../../../src/utils/errors';

describe('Custom Errors', () => {
  describe('BaseError', () => {
    it('基本的なエラーを作成', () => {
      const error = new BaseError('Test error', 500, true);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe('BaseError');
      expect(error.stack).toBeDefined();
    });

    it('デフォルト値を使用', () => {
      const error = new BaseError('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('検証エラーを作成', () => {
      const error = new ValidationError('Invalid email', 'email', 'invalid@');
      expect(error.message).toBe('Invalid email');
      expect(error.statusCode).toBe(400);
      expect(error.field).toBe('email');
      expect(error.value).toBe('invalid@');
      expect(error.name).toBe('ValidationError');
    });

    it('フィールド情報なしでも作成可能', () => {
      const error = new ValidationError('Invalid input');
      expect(error.field).toBeUndefined();
      expect(error.value).toBeUndefined();
    });
  });

  describe('AuthenticationError', () => {
    it('認証エラーを作成', () => {
      const error = new AuthenticationError();
      expect(error.message).toBe('Authentication failed');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthenticationError');
    });

    it('カスタムメッセージで作成', () => {
      const error = new AuthenticationError('Invalid token');
      expect(error.message).toBe('Invalid token');
    });
  });

  describe('AuthorizationError', () => {
    it('権限エラーを作成', () => {
      const error = new AuthorizationError();
      expect(error.message).toBe('Permission denied');
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe('AuthorizationError');
    });

    it('カスタムメッセージで作成', () => {
      const error = new AuthorizationError('Admin access required');
      expect(error.message).toBe('Admin access required');
    });
  });

  describe('NotFoundError', () => {
    it('リソースとIDで作成', () => {
      const error = new NotFoundError('User', 123);
      expect(error.message).toBe('User with id 123 not found');
      expect(error.statusCode).toBe(404);
      expect(error.resource).toBe('User');
      expect(error.id).toBe(123);
    });

    it('リソースのみで作成', () => {
      const error = new NotFoundError('Configuration');
      expect(error.message).toBe('Configuration not found');
      expect(error.resource).toBe('Configuration');
      expect(error.id).toBeUndefined();
    });

    it('情報なしで作成', () => {
      const error = new NotFoundError();
      expect(error.message).toBe('Resource not found');
      expect(error.resource).toBeUndefined();
      expect(error.id).toBeUndefined();
    });
  });

  describe('ConflictError', () => {
    it('競合エラーを作成', () => {
      const error = new ConflictError('Email already exists', 'email');
      expect(error.message).toBe('Email already exists');
      expect(error.statusCode).toBe(409);
      expect(error.conflictingResource).toBe('email');
    });
  });

  describe('NetworkError', () => {
    it('ネットワークエラーを作成', () => {
      const error = new NetworkError('Connection timeout', 'https://api.example.com', 'GET');
      expect(error.message).toBe('Connection timeout');
      expect(error.statusCode).toBe(503);
      expect(error.url).toBe('https://api.example.com');
      expect(error.method).toBe('GET');
    });
  });

  describe('TimeoutError', () => {
    it('タイムアウトエラーを作成', () => {
      const error = new TimeoutError('Request timeout', 30000);
      expect(error.message).toBe('Request timeout');
      expect(error.statusCode).toBe(408);
      expect(error.timeout).toBe(30000);
    });
  });

  describe('FileSystemError', () => {
    it('ファイルシステムエラーを作成', () => {
      const error = new FileSystemError('File not found', '/path/to/file', 'read');
      expect(error.message).toBe('File not found');
      expect(error.statusCode).toBe(500);
      expect(error.path).toBe('/path/to/file');
      expect(error.operation).toBe('read');
    });
  });

  describe('ConfigurationError', () => {
    it('設定エラーを作成', () => {
      const error = new ConfigurationError('Missing API key', 'API_KEY');
      expect(error.message).toBe('Missing API key');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
      expect(error.configKey).toBe('API_KEY');
    });
  });

  describe('ExternalServiceError', () => {
    it('外部サービスエラーを作成', () => {
      const originalError = new Error('Connection failed');
      const error = new ExternalServiceError('GitHub API', 'Rate limit exceeded', originalError);
      expect(error.message).toBe('GitHub API: Rate limit exceeded');
      expect(error.statusCode).toBe(502);
      expect(error.service).toBe('GitHub API');
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('AggregateError', () => {
    it('複数のエラーを集約', () => {
      const errors = [
        new Error('Error 1'),
        new Error('Error 2'),
        new Error('Error 3'),
      ];
      const error = new AggregateError(errors);
      expect(error.message).toBe('Multiple errors occurred: Error 1; Error 2; Error 3');
      expect(error.errors).toEqual(errors);
    });

    it('カスタムメッセージで作成', () => {
      const errors = [new Error('Error 1'), new Error('Error 2')];
      const error = new AggregateError(errors, 'Validation failed');
      expect(error.message).toBe('Validation failed');
    });
  });

  describe('Helper Functions', () => {
    describe('isOperationalError', () => {
      it('BaseErrorの操作的エラーを判定', () => {
        const operationalError = new BaseError('Error', 500, true);
        const nonOperationalError = new BaseError('Error', 500, false);
        
        expect(isOperationalError(operationalError)).toBe(true);
        expect(isOperationalError(nonOperationalError)).toBe(false);
      });

      it('通常のErrorはfalseを返す', () => {
        const error = new Error('Standard error');
        expect(isOperationalError(error)).toBe(false);
      });
    });

    describe('toBaseError', () => {
      it('BaseErrorはそのまま返す', () => {
        const error = new ValidationError('Invalid');
        expect(toBaseError(error)).toBe(error);
      });

      it('通常のErrorをBaseErrorに変換', () => {
        const error = new Error('Standard error');
        const baseError = toBaseError(error);
        expect(baseError).toBeInstanceOf(BaseError);
        expect(baseError.message).toBe('Standard error');
        expect(baseError.isOperational).toBe(false);
      });

      it('文字列をBaseErrorに変換', () => {
        const baseError = toBaseError('String error');
        expect(baseError).toBeInstanceOf(BaseError);
        expect(baseError.message).toBe('String error');
      });

      it('その他の値をBaseErrorに変換', () => {
        const baseError = toBaseError(123);
        expect(baseError).toBeInstanceOf(BaseError);
        expect(baseError.message).toBe('123');
      });
    });
  });

  describe('InstallationError', () => {
    it('should create installation error with code and repository', () => {
      const error = new InstallationError(
        'INSTALL_FAILED',
        'Failed to install package',
        'test-repo',
        true
      );
      
      expect(error.message).toBe('Failed to install package');
      expect(error.code).toBe('INSTALL_FAILED');
      expect(error.repository).toBe('test-repo');
      expect(error.recoverable).toBe(true);
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('InstallationError');
    });

    it('should create installation error with defaults', () => {
      const error = new InstallationError('UNKNOWN_ERROR', 'Unknown installation error');
      
      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.repository).toBeUndefined();
      expect(error.recoverable).toBe(false);
    });

    it('should format error message with code', () => {
      const error = new InstallationError('CLONE_FAILED', 'Git clone failed', 'my-repo');
      
      expect(error.message).toBe('Git clone failed');
      expect(error.toString()).toContain('CLONE_FAILED');
      expect(error.toString()).toContain('Git clone failed');
    });

    it('should handle different error codes', () => {
      const codes = ['CLONE_FAILED', 'PERMISSION_DENIED', 'NETWORK_ERROR', 'VALIDATION_FAILED'];
      
      codes.forEach(code => {
        const error = new InstallationError(code, `Error: ${code}`);
        expect(error.code).toBe(code);
        expect(error.message).toBe(`Error: ${code}`);
      });
    });

    it('should have proper stack trace', () => {
      const error = new InstallationError('TEST_ERROR', 'Test message');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('InstallationError');
      expect(error.stack).toContain('Test message');
    });
  });

  describe('StateCorruptionError', () => {
    it('should create state corruption error with state file and backup', () => {
      const error = new StateCorruptionError(
        'State file is corrupted',
        '/path/to/state.json',
        '/path/to/backup.json'
      );
      
      expect(error.message).toBe('State file is corrupted');
      expect(error.stateFile).toBe('/path/to/state.json');
      expect(error.backup).toBe('/path/to/backup.json');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('StateCorruptionError');
    });

    it('should create state corruption error without backup', () => {
      const error = new StateCorruptionError(
        'JSON parse error',
        '/path/to/state.json'
      );
      
      expect(error.stateFile).toBe('/path/to/state.json');
      expect(error.backup).toBeUndefined();
    });

    it('should create state corruption error with minimal info', () => {
      const error = new StateCorruptionError('State corrupted');
      
      expect(error.message).toBe('State corrupted');
      expect(error.stateFile).toBeUndefined();
      expect(error.backup).toBeUndefined();
    });

    it('should format error message with file information', () => {
      const error = new StateCorruptionError(
        'Invalid JSON format',
        '/app/state.json',
        '/app/state.backup.json'
      );
      
      expect(error.message).toBe('Invalid JSON format');
      expect(error.toString()).toContain('StateCorruptionError');
      expect(error.toString()).toContain('Invalid JSON format');
    });

    it('should have proper stack trace', () => {
      const error = new StateCorruptionError('Test corruption', '/test/path');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('StateCorruptionError');
      expect(error.stack).toContain('Test corruption');
    });

    it('should handle different state file scenarios', () => {
      const scenarios = [
        { file: '/state.json', backup: '/backup.json' },
        { file: '/state.json', backup: undefined },
        { file: undefined, backup: undefined },
      ];
      
      scenarios.forEach(({ file, backup }) => {
        const error = new StateCorruptionError('Test message', file, backup);
        expect(error.stateFile).toBe(file);
        expect(error.backup).toBe(backup);
      });
    });
  });
});