/**
 * ConfigurationManager のユニットテスト
 */

import { ConfigurationManager } from '../../../src/core/ConfigurationManager';
import { 
  Configuration, 
  PartialConfiguration,
  GlobalCLIOptions,
  ConflictStrategy,
  LogLevel
} from '../../../src/types';
import { promises as fs } from 'fs';
import * as path from 'path';
import { homedir } from 'os';

// モックの設定
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  }
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const originalEnv = process.env;

  beforeEach(() => {
    // シングルトンをリセット
    (ConfigurationManager as any).instance = undefined;
    configManager = ConfigurationManager.getInstance();
    
    // 環境変数をリセット
    process.env = { ...originalEnv };
    
    // モックをリセット
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getInstance', () => {
    it('シングルトンインスタンスを返す', () => {
      const instance1 = ConfigurationManager.getInstance();
      const instance2 = ConfigurationManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('デフォルト設定で初期化される', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

      await configManager.initialize();
      const config = configManager.getConfiguration();

      expect(config.paths.home).toBe(path.join(homedir(), '.ccpm'));
      expect(config.paths.claudeDir).toBe(path.join(homedir(), '.claude'));
      expect(config.behavior.autoUpdate).toBe(false);
      expect(config.behavior.parallelOperations).toBe(false);
      expect(config.behavior.conflictResolution).toBe('prompt');
      expect(config.logging.level).toBe('INFO');
    });

    it('環境変数を適用する', async () => {
      process.env.CCPM_HOME = '/custom/home';
      process.env.CCPM_CLAUDE_DIR = '/custom/claude';
      process.env.CCPM_PARALLEL = 'true';
      process.env.CCPM_LOG_LEVEL = 'DEBUG';
      process.env.CCPM_CONFLICT = 'overwrite';
      
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

      await configManager.initialize();
      const config = configManager.getConfiguration();

      expect(config.paths.home).toBe('/custom/home');
      expect(config.paths.claudeDir).toBe('/custom/claude');
      expect(config.behavior.parallelOperations).toBe(true);
      expect(config.logging.level).toBe('DEBUG');
      expect(config.behavior.conflictResolution).toBe('overwrite');
    });

    it('設定ファイルをロードする', async () => {
      const fileConfig: PartialConfiguration = {
        behavior: {
          autoUpdate: true,
          conflictResolution: 'skip'
        },
        logging: {
          level: 'WARN'
        }
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(fileConfig));

      await configManager.initialize();
      const config = configManager.getConfiguration();

      expect(config.behavior.autoUpdate).toBe(true);
      expect(config.behavior.conflictResolution).toBe('skip');
      expect(config.logging.level).toBe('WARN');
    });

    it('CLIオプションを適用する', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

      const options: GlobalCLIOptions = {
        home: '/cli/home',
        claudeDir: '/cli/claude',
        dryRun: true,
        force: true,
        parallel: true,
        verbose: true
      };

      await configManager.initialize(options);
      const config = configManager.getConfiguration();

      expect(config.paths.home).toBe('/cli/home');
      expect(config.paths.claudeDir).toBe('/cli/claude');
      expect(config.behavior.dryRun).toBe(true);
      expect(config.behavior.forceYes).toBe(true);
      expect(config.behavior.parallelOperations).toBe(true);
      expect(config.logging.level).toBe('DEBUG');
    });

    it('優先度が正しく適用される（CLI > 環境変数 > 設定ファイル）', async () => {
      // 設定ファイル
      const fileConfig: PartialConfiguration = {
        logging: { level: 'WARN' },
        behavior: { parallelOperations: false }
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(fileConfig));

      // 環境変数
      process.env.CCPM_LOG_LEVEL = 'INFO';
      process.env.CCPM_PARALLEL = 'true';

      // CLIオプション
      const options: GlobalCLIOptions = {
        verbose: true // これは LOG_LEVEL を DEBUG に設定する
      };

      await configManager.initialize(options);
      const config = configManager.getConfiguration();

      // CLIオプションが最優先
      expect(config.logging.level).toBe('DEBUG');
      // 環境変数が設定ファイルより優先
      expect(config.behavior.parallelOperations).toBe(true);
    });

    it('無効な設定でエラーを投げる', async () => {
      // パスを空にして検証エラーを発生させる
      const fileConfig: PartialConfiguration = {
        paths: { home: '' }
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(fileConfig));

      await expect(configManager.initialize()).rejects.toThrow('設定の検証に失敗しました');
    });

    it('JSONパースエラーを処理する', async () => {
      mockFs.readFile.mockResolvedValue('{ invalid json }');

      await configManager.initialize();
      const config = configManager.getConfiguration();

      // デフォルト設定が使用される
      expect(config.behavior.conflictResolution).toBe('prompt');
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      await configManager.initialize();
    });

    it('トップレベルのキーを取得する', () => {
      const paths = configManager.get('paths');
      expect(paths).toHaveProperty('home');
      expect(paths).toHaveProperty('claudeDir');
    });

    it('ネストされたパスで値を取得する', () => {
      const level = configManager.get('logging.level');
      expect(level).toBe('INFO');

      const conflict = configManager.get('behavior.conflictResolution');
      expect(conflict).toBe('prompt');
    });

    it('存在しないパスでundefinedを返す', () => {
      expect(configManager.get('nonexistent')).toBeUndefined();
      expect(configManager.get('paths.nonexistent')).toBeUndefined();
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      await configManager.initialize();
    });

    it('部分的な設定を更新する', async () => {
      const partial: PartialConfiguration = {
        behavior: {
          autoUpdate: true,
          parallelOperations: true
        }
      };

      await configManager.update(partial);
      const config = configManager.getConfiguration();

      expect(config.behavior.autoUpdate).toBe(true);
      expect(config.behavior.parallelOperations).toBe(true);
      // 他の設定は変更されない
      expect(config.behavior.conflictResolution).toBe('prompt');
    });

    it('更新後に設定ファイルを保存する', async () => {
      await configManager.update({ behavior: { autoUpdate: true } });

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('.cc-tools'),
        { recursive: true }
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        expect.stringContaining('"autoUpdate": true'),
        'utf8'
      );
    });

    it('無効な更新でエラーを投げる', async () => {
      const invalidUpdate: PartialConfiguration = {
        logging: { level: 'INVALID' as LogLevel }
      };

      await expect(configManager.update(invalidUpdate)).rejects.toThrow('設定の検証に失敗しました');
    });
  });

  describe('reset', () => {
    it('設定をデフォルトにリセットする', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      
      // まず設定を変更
      process.env.CCPM_LOG_LEVEL = 'DEBUG';
      await configManager.initialize();
      expect(configManager.get('logging.level')).toBe('DEBUG');

      // リセット
      await configManager.reset();
      const config = configManager.getConfiguration();

      expect(config.logging.level).toBe('INFO');
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('force モードで警告を出力する', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

      const options: GlobalCLIOptions = {
        force: true
      };

      await configManager.initialize(options);
      
      const { logger } = require('../../../src/utils/logger');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('force モードが有効です')
      );
    });

    it('並列処理モードで警告を出力する', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      process.env.CCPM_PARALLEL = 'true';

      await configManager.initialize();
      
      const { logger } = require('../../../src/utils/logger');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('並列処理が有効です')
      );
    });
  });

  describe('環境変数の詳細な処理', () => {
    it('ブール値の環境変数を正しく処理する', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

      // true/false の文字列を正しく処理
      process.env.CCPM_PARALLEL = 'false';
      process.env.CCPM_AUTO_UPDATE = 'false';
      process.env.CCPM_DRY_RUN = 'true';
      process.env.CCPM_FORCE = 'yes';

      await configManager.initialize();
      const config = configManager.getConfiguration();

      expect(config.behavior.parallelOperations).toBe(false);
      expect(config.behavior.autoUpdate).toBe(false);
      expect(config.behavior.dryRun).toBe(true);
      expect(config.behavior.forceYes).toBe(true);
    });

    it('無効な環境変数値を無視する', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

      process.env.CCPM_LOG_LEVEL = 'invalid';
      process.env.CCPM_CONFLICT = 'invalid';

      await configManager.initialize();
      const config = configManager.getConfiguration();

      // デフォルト値が使用される
      expect(config.logging.level).toBe('INFO');
      expect(config.behavior.conflictResolution).toBe('prompt');
    });
  });

  describe('設定ファイルの保存', () => {
    it('機密情報を除外して保存する', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      await configManager.initialize();

      await configManager.update({
        behavior: { dryRun: true, forceYes: true }
      });

      const savedContent = mockFs.writeFile.mock.calls[0][1] as string;
      const savedConfig = JSON.parse(savedContent);

      // 一時的な設定（dryRun, forceYes）は保存されない
      expect(savedConfig.behavior.dryRun).toBeUndefined();
      expect(savedConfig.behavior.forceYes).toBeUndefined();
      // 永続的な設定は保存される
      expect(savedConfig.behavior.autoUpdate).toBeDefined();
      expect(savedConfig.behavior.conflictResolution).toBeDefined();
    });
  });
});