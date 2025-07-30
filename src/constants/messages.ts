/**
 * メッセージ関連の定数
 */

// 成功メッセージ
export const SUCCESS_MESSAGES = {
  TOOL_INSTALLED: (name: string) => `ツール '${name}' が正常にインストールされました`,
  TOOL_REMOVED: (name: string) => `ツール '${name}' が削除されました`,
  TOOL_UPDATED: (name: string) => `ツール '${name}' が更新されました`,
  CONFIG_UPDATED: 'Claudeの設定が更新されました',
  BACKUP_CREATED: (path: string) => `バックアップが作成されました: ${path}`,
  TEMPLATE_CREATED: (name: string) => `テンプレート '${name}' が作成されました`,
  INIT_COMPLETE: 'Claude Code Package Managerの初期化が完了しました',
} as const;

// エラーメッセージ
export const ERROR_MESSAGES = {
  TOOL_NOT_FOUND: (name: string) => `ツール '${name}' が見つかりません`,
  TOOL_ALREADY_EXISTS: (name: string) => `ツール '${name}' は既に存在します`,
  INVALID_TOOL_FORMAT: '無効なツール形式です',
  CONFIG_NOT_FOUND: 'Claudeの設定ファイルが見つかりません',
  CONFIG_PARSE_ERROR: '設定ファイルの解析に失敗しました',
  PERMISSION_DENIED: 'ファイルアクセス権限がありません',
  NETWORK_ERROR: 'ネットワークエラーが発生しました',
  INVALID_URL: (url: string) => `無効なURLです: ${url}`,
  DOWNLOAD_FAILED: (url: string) => `ダウンロードに失敗しました: ${url}`,
  BACKUP_FAILED: 'バックアップの作成に失敗しました',
  TEMPLATE_NOT_FOUND: (name: string) => `テンプレート '${name}' が見つかりません`,
  INVALID_COMMAND: (cmd: string) => `無効なコマンドです: ${cmd}`,
  MISSING_REQUIRED_FIELD: (field: string) => `必須フィールドがありません: ${field}`,
  GENERIC_ERROR: '予期しないエラーが発生しました',
} as const;

// 警告メッセージ
export const WARNING_MESSAGES = {
  CONFIG_BACKUP_EXISTS: '設定ファイルのバックアップが既に存在します',
  TOOL_UPDATE_AVAILABLE: (name: string) => `ツール '${name}' の更新が利用可能です`,
  DEPRECATED_FEATURE: (feature: string) => `機能 '${feature}' は非推奨です`,
  EXPERIMENTAL_FEATURE: (feature: string) => `機能 '${feature}' は実験的です`,
} as const;

// 情報メッセージ
export const INFO_MESSAGES = {
  CHECKING_TOOL: (name: string) => `ツール '${name}' を確認中...`,
  DOWNLOADING_TOOL: (name: string) => `ツール '${name}' をダウンロード中...`,
  INSTALLING_TOOL: (name: string) => `ツール '${name}' をインストール中...`,
  UPDATING_CONFIG: 'Claudeの設定を更新中...',
  CREATING_BACKUP: 'バックアップを作成中...',
  LOADING_TEMPLATE: (name: string) => `テンプレート '${name}' を読み込み中...`,
  SCANNING_TOOLS: 'ツールをスキャン中...',
  NO_TOOLS_INSTALLED: 'インストールされたツールはありません',
} as const;

// プロンプトメッセージ
export const PROMPT_MESSAGES = {
  CONFIRM_INSTALL: (name: string) => `ツール '${name}' をインストールしますか？`,
  CONFIRM_REMOVE: (name: string) => `ツール '${name}' を削除しますか？`,
  CONFIRM_UPDATE: (name: string) => `ツール '${name}' を更新しますか？`,
  CONFIRM_OVERWRITE: 'ファイルを上書きしますか？',
  ENTER_TOOL_NAME: 'ツール名を入力してください: ',
  ENTER_TOOL_URL: 'ツールURLを入力してください: ',
} as const;

// CLIヘルプメッセージ
export const HELP_MESSAGES = {
  USAGE: '使用法: ccpm [command] [options]',
  COMMANDS_HEADER: '利用可能なコマンド:',
  OPTIONS_HEADER: 'オプション:',
  EXAMPLES_HEADER: '例:',
  SEE_MORE: '詳細は ccpm [command] --help を参照してください',
} as const;