import * as path from 'path';
import * as os from 'os';

/**
 * パス関連の定数
 */

// 環境変数から読み込み、デフォルト値を設定
export const CC_TOOLS_HOME = process.env.CCPM_HOME || path.join(os.homedir(), '.ccpm');
export const CLAUDE_DIR = process.env.CCPM_CLAUDE_DIR || path.join(os.homedir(), '.claude');

// ツール関連のパス
export const REPOS_DIR = path.join(CC_TOOLS_HOME, 'repos');
export const TOOLS_DIR = path.join(CC_TOOLS_HOME, 'tools');
export const TEMPLATES_DIR = path.join(CC_TOOLS_HOME, 'templates');
export const CONFIG_FILE = path.join(CC_TOOLS_HOME, 'config.json');

// Claude関連のパス
export const CLAUDE_CONFIG_FILE = path.join(CLAUDE_DIR, 'claude_desktop_config.json');
export const CLAUDE_BACKUP_DIR = path.join(CLAUDE_DIR, 'backups');

// その他のパス
export const TEMP_DIR = path.join(CC_TOOLS_HOME, 'temp');
export const LOGS_DIR = path.join(CC_TOOLS_HOME, 'logs');

// ファイル拡張子
export const TOOL_FILE_EXTENSION = '.js';
export const CONFIG_FILE_EXTENSION = '.json';
export const BACKUP_FILE_EXTENSION = '.backup';