/**
 * 設定管理クラス
 * 
 * 環境変数、設定ファイル、CLIオプションを統合して
 * アプリケーションの設定を管理します。
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import {
  Configuration,
  PartialConfiguration,
  EnvironmentVariables,
  GlobalCLIOptions,
  ConfigurationValidation,
  DEFAULT_CONFIGURATION,
  ConflictStrategy,
  LogLevel
} from '../types';
import { logger } from '../utils/logger';
import { validatePath } from '../utils/validators';

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private configuration: Configuration;
  private configFilePath: string;

  private constructor() {
    this.configuration = { ...DEFAULT_CONFIGURATION };
    this.configFilePath = '';
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * 設定を初期化
   * 優先度: CLIオプション > 環境変数 > 設定ファイル > デフォルト値
   */
  async initialize(options?: GlobalCLIOptions): Promise<void> {
    try {
      // 1. デフォルト設定をロード
      this.configuration = this.loadDefaults();

      // 2. 環境変数を適用
      this.applyEnvironmentVariables();

      // 3. 設定ファイルをロード
      await this.loadConfigurationFile();

      // 4. CLIオプションを適用
      if (options) {
        this.applyCLIOptions(options);
      }

      // 5. 設定を検証
      const validation = this.validate();
      if (!validation.isValid) {
        throw new Error(`設定の検証に失敗しました: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => logger.warn(warning));
      }

      logger.debug('設定を初期化しました', this.configuration);
    } catch (error) {
      logger.error('設定の初期化に失敗しました', error);
      throw error;
    }
  }

  /**
   * 現在の設定を取得
   */
  getConfiguration(): Configuration {
    return { ...this.configuration };
  }

  /**
   * 特定の設定値を取得
   */
  get<K extends keyof Configuration>(key: K): Configuration[K];
  get(path: string): any;
  get(keyOrPath: string): any {
    const parts = keyOrPath.split('.');
    let value: any = this.configuration;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * 設定を更新
   */
  async update(partial: PartialConfiguration): Promise<void> {
    this.configuration = this.mergeConfiguration(this.configuration, partial);
    
    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`設定の検証に失敗しました: ${validation.errors.join(', ')}`);
    }

    await this.saveConfigurationFile();
  }

  /**
   * デフォルト設定をロード
   */
  private loadDefaults(): Configuration {
    const home = path.join(homedir(), '.cc-tools');
    const claudeDir = path.join(homedir(), '.claude');

    return {
      ...DEFAULT_CONFIGURATION,
      paths: {
        home,
        claudeDir
      },
      logging: {
        ...DEFAULT_CONFIGURATION.logging,
        file: path.join(home, 'cc-tools.log')
      }
    };
  }

  /**
   * 環境変数を適用
   */
  private applyEnvironmentVariables(): void {
    const env = process.env as EnvironmentVariables;

    if (env.CC_TOOLS_HOME) {
      this.configuration.paths.home = env.CC_TOOLS_HOME;
      this.configuration.logging.file = path.join(env.CC_TOOLS_HOME, 'cc-tools.log');
    }

    if (env.CC_TOOLS_CLAUDE_DIR) {
      this.configuration.paths.claudeDir = env.CC_TOOLS_CLAUDE_DIR;
    }

    if (env.CC_TOOLS_PARALLEL === 'true') {
      this.configuration.behavior.parallelOperations = true;
    } else if (env.CC_TOOLS_PARALLEL === 'false') {
      this.configuration.behavior.parallelOperations = false;
    }

    if (env.CC_TOOLS_DRY_RUN === 'true') {
      this.configuration.behavior.dryRun = true;
    }

    if (env.CC_TOOLS_FORCE === 'true' || env.CC_TOOLS_FORCE === 'yes') {
      this.configuration.behavior.forceYes = true;
    }

    if (env.CC_TOOLS_AUTO_UPDATE === 'true') {
      this.configuration.behavior.autoUpdate = true;
    } else if (env.CC_TOOLS_AUTO_UPDATE === 'false') {
      this.configuration.behavior.autoUpdate = false;
    }

    if (env.CC_TOOLS_CONFLICT) {
      const strategy = env.CC_TOOLS_CONFLICT as ConflictStrategy;
      if (['skip', 'overwrite', 'prompt'].includes(strategy)) {
        this.configuration.behavior.conflictResolution = strategy;
      }
    }

    if (env.CC_TOOLS_LOG_LEVEL) {
      const level = env.CC_TOOLS_LOG_LEVEL.toUpperCase() as LogLevel;
      if (['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(level)) {
        this.configuration.logging.level = level;
      }
    }
  }

  /**
   * 設定ファイルをロード
   */
  private async loadConfigurationFile(): Promise<void> {
    this.configFilePath = path.join(this.configuration.paths.home, 'config.json');

    try {
      const content = await fs.readFile(this.configFilePath, 'utf8');
      const fileConfig = JSON.parse(content) as PartialConfiguration;
      
      this.configuration = this.mergeConfiguration(this.configuration, fileConfig);
      logger.debug('設定ファイルをロードしました', this.configFilePath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logger.debug('設定ファイルが見つかりません。デフォルト設定を使用します。');
      } else if (error instanceof SyntaxError) {
        logger.warn('設定ファイルのJSONが無効です。デフォルト設定を使用します。', error);
      } else {
        logger.warn('設定ファイルの読み込みに失敗しました', error);
      }
    }
  }

  /**
   * CLIオプションを適用
   */
  private applyCLIOptions(options: GlobalCLIOptions): void {
    if (options.home) {
      this.configuration.paths.home = options.home;
      this.configuration.logging.file = path.join(options.home, 'cc-tools.log');
    }

    if (options.claudeDir) {
      this.configuration.paths.claudeDir = options.claudeDir;
    }

    if (options.dryRun !== undefined) {
      this.configuration.behavior.dryRun = options.dryRun;
    }

    if (options.force !== undefined || options.yes !== undefined) {
      this.configuration.behavior.forceYes = options.force || options.yes || false;
    }

    if (options.parallel !== undefined) {
      this.configuration.behavior.parallelOperations = options.parallel;
    }

    if (options.verbose) {
      this.configuration.logging.level = 'DEBUG';
    } else if (options.quiet) {
      this.configuration.logging.level = 'ERROR';
    }
  }

  /**
   * 設定をマージ
   */
  private mergeConfiguration(
    base: Configuration,
    partial: PartialConfiguration
  ): Configuration {
    const merged = { ...base };

    if (partial.version) {
      merged.version = partial.version;
    }

    if (partial.paths) {
      merged.paths = { ...base.paths, ...partial.paths };
    }

    if (partial.behavior) {
      merged.behavior = { ...base.behavior, ...partial.behavior };
    }

    if (partial.logging) {
      merged.logging = { ...base.logging, ...partial.logging };
    }

    return merged;
  }

  /**
   * 設定を検証
   */
  private validate(): ConfigurationValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // パスの検証
    if (!this.configuration.paths.home) {
      errors.push('ホームディレクトリが設定されていません');
    } else if (!path.isAbsolute(this.configuration.paths.home)) {
      errors.push(`ホームディレクトリパスは絶対パスである必要があります: ${this.configuration.paths.home}`);
    }

    if (!this.configuration.paths.claudeDir) {
      errors.push('Claudeディレクトリが設定されていません');
    } else if (!path.isAbsolute(this.configuration.paths.claudeDir)) {
      errors.push(`Claudeディレクトリパスは絶対パスである必要があります: ${this.configuration.paths.claudeDir}`);
    }

    // ログレベルの検証
    const validLogLevels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    if (!validLogLevels.includes(this.configuration.logging.level)) {
      errors.push(`無効なログレベル: ${this.configuration.logging.level}`);
    }

    // 競合解決戦略の検証
    const validStrategies: ConflictStrategy[] = ['skip', 'overwrite', 'prompt'];
    if (!validStrategies.includes(this.configuration.behavior.conflictResolution)) {
      errors.push(`無効な競合解決戦略: ${this.configuration.behavior.conflictResolution}`);
    }

    // 警告
    if (this.configuration.behavior.forceYes && !this.configuration.behavior.dryRun) {
      warnings.push('force モードが有効です。確認プロンプトがスキップされます。');
    }

    if (this.configuration.behavior.parallelOperations) {
      warnings.push('並列処理が有効です。予期しない動作が発生する可能性があります。');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 設定ファイルを保存
   */
  private async saveConfigurationFile(): Promise<void> {
    try {
      // ホームディレクトリが存在しない場合は作成
      await fs.mkdir(this.configuration.paths.home, { recursive: true });

      // 設定を保存（パスワードなどの機密情報は除外）
      const configToSave: PartialConfiguration = {
        version: this.configuration.version,
        paths: {
          home: this.configuration.paths.home,
          claudeDir: this.configuration.paths.claudeDir
        },
        behavior: {
          autoUpdate: this.configuration.behavior.autoUpdate,
          parallelOperations: this.configuration.behavior.parallelOperations,
          conflictResolution: this.configuration.behavior.conflictResolution
        },
        logging: {
          level: this.configuration.logging.level
        }
      };

      await fs.writeFile(
        this.configFilePath,
        JSON.stringify(configToSave, null, 2),
        'utf8'
      );

      logger.debug('設定ファイルを保存しました', this.configFilePath);
    } catch (error) {
      logger.error('設定ファイルの保存に失敗しました', error);
      throw error;
    }
  }

  /**
   * 設定をリセット
   */
  async reset(): Promise<void> {
    this.configuration = this.loadDefaults();
    await this.saveConfigurationFile();
    logger.info('設定をデフォルトにリセットしました');
  }
}