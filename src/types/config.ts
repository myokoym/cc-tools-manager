/**
 * 設定関連の型定義
 * 
 * CC Tools Managerの設定構造と
 * 環境変数、設定ファイルの型を定義します。
 */

import type { ConflictStrategy, LogLevel } from './index';

// パス設定
export interface ConfigurationPaths {
  home: string;        // CC_TOOLS_HOME - ツールのホームディレクトリ
  claudeDir: string;   // CC_TOOLS_CLAUDE_DIR - Claudeディレクトリ
}

// 動作設定
export interface ConfigurationBehavior {
  autoUpdate: boolean;                      // 自動更新を有効にするか
  parallelOperations: boolean;              // 並列処理を有効にするか
  conflictResolution: ConflictStrategy;     // ファイル競合時の解決方法
  dryRun: boolean;                         // ドライランモード
  forceYes: boolean;                       // 確認プロンプトをスキップ
}

// ログ設定
export interface ConfigurationLogging {
  level: LogLevel;     // ログレベル
  file: string;        // ログファイルパス
}

// メインの設定型
export interface Configuration {
  version: string;
  paths: ConfigurationPaths;
  behavior: ConfigurationBehavior;
  logging: ConfigurationLogging;
}

// 部分的な設定（更新時などに使用）
export interface PartialConfiguration {
  version?: string;
  paths?: Partial<ConfigurationPaths>;
  behavior?: Partial<ConfigurationBehavior>;
  logging?: Partial<ConfigurationLogging>;
}

// 環境変数の型定義
export interface EnvironmentVariables {
  CC_TOOLS_HOME?: string;
  CC_TOOLS_CLAUDE_DIR?: string;
  CC_TOOLS_PARALLEL?: string;
  CC_TOOLS_DRY_RUN?: string;
  CC_TOOLS_FORCE?: string;
  CC_TOOLS_LOG_LEVEL?: string;
  CC_TOOLS_AUTO_UPDATE?: string;
  CC_TOOLS_CONFLICT?: string;
  GITHUB_TOKEN?: string;
  NO_COLOR?: string;
}

// CLIオプションの型定義
export interface CLIOptions {
  dryRun?: boolean;
  force?: boolean;
  yes?: boolean;
  noColor?: boolean;
  quiet?: boolean;
  verbose?: boolean;
  parallel?: boolean;
  config?: string;
}

// グローバルCLIオプション
export interface GlobalCLIOptions extends CLIOptions {
  home?: string;
  claudeDir?: string;
}

// コマンド固有のオプション
export interface RegisterOptions extends CLIOptions {
  noClone?: boolean;
  deployCommands?: boolean;
  deployAgents?: boolean;
  deployHooks?: boolean;
}

export interface UpdateOptions extends CLIOptions {
  all?: boolean;
  noDeploy?: boolean;
  cleanOrphaned?: boolean;
}

export interface ListOptions extends CLIOptions {
  json?: boolean;
  detailed?: boolean;
  sort?: string;
  filter?: string;
}

export interface StatusOptions extends CLIOptions {
  check?: boolean;
  json?: boolean;
}

export interface RemoveOptions extends CLIOptions {
  keepLocal?: boolean;
  cleanDeployed?: boolean;
}

// 設定検証結果
export interface ConfigurationValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// デフォルト設定
export const DEFAULT_CONFIGURATION: Configuration = {
  version: '1.0.0',
  paths: {
    home: '',        // 実行時に設定
    claudeDir: ''    // 実行時に設定
  },
  behavior: {
    autoUpdate: false,
    parallelOperations: false,
    conflictResolution: 'prompt',
    dryRun: false,
    forceYes: false
  },
  logging: {
    level: 'INFO',
    file: ''         // 実行時に設定
  }
};