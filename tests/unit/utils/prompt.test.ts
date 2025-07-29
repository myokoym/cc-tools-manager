/**
 * Tests for prompt utilities
 */

import { promptYesNo, promptChoice } from '../../../src/utils/prompt';
import * as readline from 'readline';

// Readlineモジュールのモック
jest.mock('readline');

describe('Prompt Utilities', () => {
  let mockInterface: any;
  let originalIsTTY: boolean | undefined;
  let originalCI: string | undefined;

  beforeEach(() => {
    // 環境変数を保存
    originalIsTTY = process.stdin.isTTY;
    originalCI = process.env.CI;
    
    // TTYモードを有効化
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      configurable: true
    });
    
    // モックインターフェースのセットアップ
    mockInterface = {
      question: jest.fn(),
      close: jest.fn(),
      on: jest.fn()
    };
    
    (readline.createInterface as jest.Mock).mockReturnValue(mockInterface);
    
    // stdin.pauseのモック
    process.stdin.pause = jest.fn();
  });

  afterEach(() => {
    // 環境変数を復元
    Object.defineProperty(process.stdin, 'isTTY', {
      value: originalIsTTY,
      configurable: true
    });
    if (originalCI !== undefined) {
      process.env.CI = originalCI;
    } else {
      delete process.env.CI;
    }
    
    jest.clearAllMocks();
  });

  describe('promptYesNo', () => {
    it('should return true for "y" answer', async () => {
      mockInterface.question.mockImplementation((question: string, callback: Function) => {
        callback('y');
      });

      const result = await promptYesNo('Test question?');
      
      expect(result).toBe(true);
      expect(mockInterface.close).toHaveBeenCalled();
      expect(process.stdin.pause).toHaveBeenCalled();
    });

    it('should return true for "yes" answer', async () => {
      mockInterface.question.mockImplementation((question: string, callback: Function) => {
        callback('yes');
      });

      const result = await promptYesNo('Test question?');
      
      expect(result).toBe(true);
    });

    it('should return false for "n" answer', async () => {
      mockInterface.question.mockImplementation((question: string, callback: Function) => {
        callback('n');
      });

      const result = await promptYesNo('Test question?');
      
      expect(result).toBe(false);
    });

    it('should return false for empty answer', async () => {
      mockInterface.question.mockImplementation((question: string, callback: Function) => {
        callback('');
      });

      const result = await promptYesNo('Test question?');
      
      expect(result).toBe(false);
    });

    it('should return default value on timeout', async () => {
      jest.useFakeTimers();
      
      mockInterface.question.mockImplementation(() => {
        // 何もしない（タイムアウトを待つ）
      });

      const promise = promptYesNo('Test question?', true, 1000);
      
      jest.advanceTimersByTime(1001);
      
      const result = await promise;
      expect(result).toBe(true);
      
      jest.useRealTimers();
    });

    it('should return default value in CI environment', async () => {
      process.env.CI = 'true';
      
      const result = await promptYesNo('Test question?', true);
      
      expect(result).toBe(true);
      expect(readline.createInterface).not.toHaveBeenCalled();
    });

    it('should return default value when not TTY', async () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        configurable: true
      });
      
      const result = await promptYesNo('Test question?', false);
      
      expect(result).toBe(false);
      expect(readline.createInterface).not.toHaveBeenCalled();
    });

    it('should handle SIGINT signal', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      mockInterface.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'SIGINT') {
          // SIGINTハンドラーを即座に実行
          handler();
        }
      });

      try {
        await promptYesNo('Test question?');
      } catch (error: any) {
        expect(error.message).toBe('Process exit');
      }

      expect(mockExit).toHaveBeenCalledWith(130);
      mockExit.mockRestore();
    });

    it('should handle readline errors', async () => {
      mockInterface.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'error') {
          handler(new Error('Readline error'));
        }
      });

      const result = await promptYesNo('Test question?', true);
      
      expect(result).toBe(true); // デフォルト値を返す
    });
  });

  describe('promptChoice', () => {
    it('should return selected choice index', async () => {
      mockInterface.question.mockImplementation((question: string, callback: Function) => {
        callback('2');
      });

      const result = await promptChoice('Select:', ['Option 1', 'Option 2', 'Option 3']);
      
      expect(result).toBe(1); // 0-indexed
    });

    it('should return default choice for invalid input', async () => {
      mockInterface.question.mockImplementation((question: string, callback: Function) => {
        callback('invalid');
      });

      const result = await promptChoice('Select:', ['Option 1', 'Option 2'], 1);
      
      expect(result).toBe(1);
    });

    it('should return default choice for out of range input', async () => {
      mockInterface.question.mockImplementation((question: string, callback: Function) => {
        callback('5');
      });

      const result = await promptChoice('Select:', ['Option 1', 'Option 2'], 0);
      
      expect(result).toBe(0);
    });

    it('should return default choice in CI environment', async () => {
      process.env.CI = 'true';
      
      const result = await promptChoice('Select:', ['Option 1', 'Option 2'], 1);
      
      expect(result).toBe(1);
      expect(readline.createInterface).not.toHaveBeenCalled();
    });
  });
});