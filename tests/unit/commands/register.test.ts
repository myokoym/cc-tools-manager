/**
 * Register Command Tests
 * registerコマンドのユニットテスト
 */

import { Command } from 'commander';
import { createRegisterCommand } from '../../../src/commands/register';
import { RegistryService } from '../../../src/core/RegistryService';
import { ValidationError, ConflictError } from '../../../src/utils/errors';
import { Repository } from '../../../src/types';
import * as path from 'path';

// モックの設定
jest.mock('../../../src/core/RegistryService');
jest.mock('../../../src/utils/logger');

// コンソール出力のモック
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(((code?: string | number | null | undefined) => {
  throw new Error(`Process exited with code ${code}`);
}) as any);

// oraのモック
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
  }));
});

describe('Register Command', () => {
  let command: Command;
  let mockRegistryService: jest.Mocked<RegistryService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // RegistryServiceのモックインスタンスを作成
    mockRegistryService = new RegistryService() as jest.Mocked<RegistryService>;
    (RegistryService as jest.MockedClass<typeof RegistryService>).mockImplementation(() => mockRegistryService);
    
    // コマンドを作成
    command = createRegisterCommand();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Command Structure', () => {
    it('should have correct command name and alias', () => {
      expect(command.name()).toBe('register');
      expect(command.aliases).toContain('reg');
    });

    it('should have correct description', () => {
      expect(command.description()).toBe('Register a GitHub repository to the tools registry');
    });

    it('should require URL argument', () => {
      const args = command.args;
      expect(args).toHaveLength(1);
      expect(args[0]).toBe('url');
    });

    it('should have data-dir option', () => {
      const option = command.options.find(opt => opt.long === '--data-dir');
      expect(option).toBeDefined();
      expect(option?.short).toBe('-d');
      expect(option?.defaultValue).toBe(path.join(process.cwd(), '.cc-tools'));
    });
  });

  describe('Successful Registration', () => {
    const mockRepository: Repository = {
      id: '1234567890ab',
      name: 'owner/repo',
      url: 'https://github.com/owner/repo',
      registeredAt: new Date().toISOString(),
      deployments: {
        commands: [],
        agents: [],
        hooks: []
      },
      status: 'uninitialized'
    };

    beforeEach(() => {
      mockRegistryService.validateUrl.mockReturnValue(true);
      mockRegistryService.register.mockResolvedValue(mockRepository);
    });

    it('should successfully register a valid repository', async () => {
      const url = 'https://github.com/owner/repo';
      
      try {
        await command.parseAsync(['node', 'test', url]);
      } catch (error) {
        // Process.exit(0) is expected for successful execution
        expect(error).not.toBeDefined();
      }

      expect(mockRegistryService.validateUrl).toHaveBeenCalledWith(url);
      expect(mockRegistryService.register).toHaveBeenCalledWith(url);
      
      // 成功メッセージの確認
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Repository URL:'), url);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✅ Registration Complete'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('ID:'), mockRepository.id);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Name:'), mockRepository.name);
    });

    it('should display next steps after registration', async () => {
      const url = 'https://github.com/owner/repo';
      
      try {
        await command.parseAsync(['node', 'test', url]);
      } catch (error) {
        // Expected
      }

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📋 Next Steps:'));
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('cc-tools-manager init owner/repo')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('cc-tools-manager deploy owner/repo')
      );
    });

    it('should use custom data directory when specified', async () => {
      const url = 'https://github.com/owner/repo';
      const customDir = '/custom/data/dir';
      
      try {
        await command.parseAsync(['node', 'test', url, '-d', customDir]);
      } catch (error) {
        // Expected
      }

      expect(RegistryService).toHaveBeenCalledWith(customDir);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid URL format', async () => {
      const invalidUrl = 'not-a-valid-url';
      mockRegistryService.validateUrl.mockReturnValue(false);

      try {
        await command.parseAsync(['node', 'test', invalidUrl]);
      } catch (error: any) {
        expect(error.message).toContain('Process exited with code 1');
      }

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Invalid GitHub repository URL format')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Expected format: https://github.com/owner/repository')
      );
    });

    it('should handle validation errors', async () => {
      const url = 'https://github.com/owner/repo';
      const validationError = new ValidationError('Invalid repository format', 'url', url);
      
      mockRegistryService.validateUrl.mockReturnValue(true);
      mockRegistryService.register.mockRejectedValue(validationError);

      try {
        await command.parseAsync(['node', 'test', url]);
      } catch (error: any) {
        expect(error.message).toContain('Process exited with code 1');
      }

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('❌ Validation Error:'),
        validationError.message
      );
    });

    it('should handle conflict errors (duplicate registration)', async () => {
      const url = 'https://github.com/owner/repo';
      const conflictError = new ConflictError('Repository already registered', 'repository');
      
      mockRegistryService.validateUrl.mockReturnValue(true);
      mockRegistryService.register.mockRejectedValue(conflictError);

      try {
        await command.parseAsync(['node', 'test', url]);
      } catch (error: any) {
        expect(error.message).toContain('Process exited with code 1');
      }

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('❌ Conflict:'),
        conflictError.message
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('This repository is already registered')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('cc-tools-manager list')
      );
    });

    it('should handle unexpected errors', async () => {
      const url = 'https://github.com/owner/repo';
      const unexpectedError = new Error('Unexpected error');
      
      mockRegistryService.validateUrl.mockReturnValue(true);
      mockRegistryService.register.mockRejectedValue(unexpectedError);

      try {
        await command.parseAsync(['node', 'test', url]);
      } catch (error: any) {
        expect(error.message).toContain('Process exited with code 1');
      }

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error:'),
        unexpectedError.message
      );
    });

    it('should handle non-Error objects', async () => {
      const url = 'https://github.com/owner/repo';
      const nonError = 'string error';
      
      mockRegistryService.validateUrl.mockReturnValue(true);
      mockRegistryService.register.mockRejectedValue(nonError);

      try {
        await command.parseAsync(['node', 'test', url]);
      } catch (error: any) {
        expect(error.message).toContain('Process exited with code 1');
      }

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('❌ Unknown error occurred')
      );
    });
  });

  describe('URL Normalization', () => {
    it('should handle various GitHub URL formats', async () => {
      const urls = [
        'https://github.com/owner/repo',
        'https://github.com/owner/repo.git',
        'https://github.com/owner/repo/',
        'http://github.com/owner/repo',
      ];

      mockRegistryService.validateUrl.mockReturnValue(true);
      mockRegistryService.register.mockResolvedValue({
        id: 'test-id',
        name: 'owner/repo',
        url: 'https://github.com/owner/repo',
        registeredAt: new Date().toISOString(),
        deployments: { commands: [], agents: [], hooks: [] },
        status: 'uninitialized'
      });

      for (const url of urls) {
        jest.clearAllMocks();
        
        try {
          await command.parseAsync(['node', 'test', url]);
        } catch (error) {
          // Expected
        }

        expect(mockRegistryService.validateUrl).toHaveBeenCalledWith(url);
        expect(mockRegistryService.register).toHaveBeenCalledWith(url);
      }
    });
  });
});