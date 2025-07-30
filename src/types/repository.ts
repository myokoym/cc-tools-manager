/**
 * リポジトリ関連の型定義
 * 
 * Claude Code Package Managerで管理するリポジトリの構造と
 * 関連する型を定義します。
 */

// リポジトリのステータス
export type RepositoryStatus = 'active' | 'error' | 'uninitialized';

// デプロイメント設定
export interface RepositoryDeployments {
  commands?: string[];   // デプロイするコマンドパターン
  agents?: string[];     // デプロイするエージェントパターン
  hooks?: string[];      // デプロイするフックパターン
}

// メインのリポジトリ型
export interface Repository {
  // 基本情報
  id: string;              // 一意識別子（URLのハッシュ）
  name: string;            // リポジトリ名
  url: string;             // GitHub URL
  
  // タイムスタンプ
  registeredAt: string;    // ISO 8601 登録日時
  lastUpdatedAt?: string;  // ISO 8601 最終更新日時
  lastChecked?: string;    // ISO 8601 最終確認日時
  
  // デプロイメント設定
  deployments: RepositoryDeployments;
  
  // ステータス情報
  status: RepositoryStatus;
  localPath?: string;      // ローカルクローンパス
  version?: string;        // バージョン情報
}

// リポジトリ作成時の入力型
export interface CreateRepositoryInput {
  url: string;
  deployments?: RepositoryDeployments;
}

// リポジトリ更新時の入力型
export interface UpdateRepositoryInput {
  lastUpdatedAt?: string;
  deployments?: Partial<RepositoryDeployments>;
  status?: RepositoryStatus;
  localPath?: string;
}

// リポジトリリスト表示用の型
export interface RepositoryListItem extends Repository {
  hasLocalClone: boolean;
  needsUpdate?: boolean;
  deployedFileCount?: number;
}

// リポジトリ詳細情報
export interface RepositoryDetail extends Repository {
  localInfo?: {
    exists: boolean;
    currentBranch?: string;
    lastCommit?: string;
    isDirty?: boolean;
    diskSize?: number;
  };
  deploymentInfo?: {
    totalFiles: number;
    lastDeployment?: string;
    deployedPaths?: string[];
  };
}

// リポジトリフィルター条件
export interface RepositoryFilter {
  status?: RepositoryStatus;
  hasDeployments?: boolean;
  hasLocalClone?: boolean;
  namePattern?: string;
}

// リポジトリソート条件
export type RepositorySortField = 'name' | 'registeredAt' | 'lastUpdatedAt' | 'status';

export interface RepositorySort {
  field: RepositorySortField;
  direction: 'asc' | 'desc';
}

// リポジトリ検証結果
export interface RepositoryValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}