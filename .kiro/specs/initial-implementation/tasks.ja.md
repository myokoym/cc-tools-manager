# Implementation Plan

## プロジェクトセットアップとコア構造

- [x] 1. TypeScriptプロジェクトの初期セットアップ
  - package.jsonの作成（名前、バージョン、依存関係、スクリプト）
  - tsconfig.jsonの設定（ES2020、strict mode、Node.js向け設定）
  - ESLintとPrettierの設定ファイルを作成
  - Jest設定の作成（TypeScript対応、カバレッジ設定）
  - .gitignoreファイルの作成
  - NPXサポートのためのbinエントリーを設定
  - _Requirements: 4.1_

- [x] 2. 基本的なディレクトリ構造とインターフェース定義
  - src/ディレクトリ構造の作成（commands/, core/, utils/, types/, constants/）
  - TypeScript型定義ファイルの作成（Repository, Configuration, State型）
  - コアサービスインターフェースの定義（IRegistryService, IGitManager, IDeploymentService）
  - 定数ファイルの作成（paths.ts, messages.ts）
  - 基本的なテストディレクトリ構造の作成
  - _Requirements: 1.1, 2.1, 3.1_

## データモデルとコア機能の実装

- [x] 3. 設定管理システムの実装
  - ConfigurationManagerクラスのテスト作成（環境変数、デフォルト値、設定ファイル読み込み）
  - ConfigurationManagerクラスの実装（環境変数の読み込み、デフォルト値の適用）
  - 設定ファイルの読み込みとマージ機能の実装
  - 設定値の検証とエラーハンドリング
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 4. エラーハンドリングフレームワークの構築
  - カスタムエラークラスのテスト作成（CCToolsError, GitAuthenticationError等）
  - カスタムエラークラスの実装（エラーコード、回復方法の提案を含む）
  - グローバルエラーハンドラーの実装
  - ロガー（Winston）の設定と実装
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 5. レジストリサービスの実装
  - RegistryServiceのユニットテスト作成（登録、削除、一覧、検証）
  - RegistryServiceクラスの実装（URL検証、重複チェック、リポジトリ情報の保存）
  - repositories.jsonファイルの読み書き機能
  - リポジトリ名の抽出とID生成ロジック
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

## Git操作とデプロイメント機能

- [x] 6. Git Managerの実装
  - GitManagerのテスト作成（clone, pull, status取得）
  - GitManagerクラスの実装（simple-git使用）
  - プログレスインジケーター（ora）の統合
  - Git認証エラーのハンドリング
  - 更新結果のサマリー生成機能
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 7. デプロイメントサービスの実装
  - DeploymentServiceのテスト作成（パターンマッチング、ファイルコピー、競合処理）
  - パターンマッチングエンジンの実装（glob使用）
  - ディレクトリ構造を保持したファイルコピー機能
  - 競合解決戦略の実装（skip, overwrite, prompt）
  - ファイル権限の保持機能
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 8. 状態管理システムの実装
  - StateManagerのテスト作成（状態の保存、読み込み、更新）
  - StateManagerクラスの実装（state.jsonの管理）
  - アトミックなファイル更新機能の実装
  - 増分更新のためのファイルハッシュ計算
  - 孤立ファイルの検出とクリーンアップ機能
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

## CLIコマンドの実装

- [x] 9. CLIフレームワークとエントリーポイント
  - Commander.jsを使用したCLI構造のセットアップ
  - index.tsエントリーポイントの作成（#!/usr/bin/env node）
  - グローバルオプションの実装（--dry-run, --no-color）
  - ヘルプメッセージのカスタマイズ
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_

- [x] 10. registerコマンドの実装
  - registerコマンドのテスト作成（URL検証、重複チェック、成功/失敗ケース）
  - registerコマンドハンドラーの実装
  - URL検証とエラーメッセージの表示
  - 成功時のフィードバック表示（カラー出力対応）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 11. updateコマンドの実装
  - updateコマンドのテスト作成（全体更新、個別更新、エラーケース）
  - updateコマンドハンドラーの実装（並列処理対応）
  - Git操作とデプロイメントの統合
  - 更新結果のサマリー表示
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7_

- [x] 12. list, status, removeコマンドの実装
  - 各コマンドのテスト作成
  - listコマンド：登録済みリポジトリの一覧表示（テーブル形式）
  - statusコマンド：各リポジトリの状態表示（最終更新、デプロイ状況）
  - removeコマンド：リポジトリの削除と関連ファイルのクリーンアップ
  - _Requirements: 1.6, 1.7, 7.1_

- [ ] 13. check, clean, interactiveコマンドの実装
  - checkコマンド：更新可能なリポジトリの確認（実際の更新なし）
  - cleanコマンド：孤立ファイルと不要なキャッシュの削除
  - interactiveコマンド：inquirerを使用したインタラクティブモード
  - 各コマンドの適切なフィードバック表示
  - _Requirements: 4.6, 7.3, 7.5_

## 統合とE2Eテスト

- [ ] 14. 統合テストの実装
  - 完全なリポジトリライフサイクルテスト（登録→更新→デプロイ→削除）
  - 複数リポジトリの並列処理テスト
  - 競合解決シナリオのテスト
  - エラー回復シナリオのテスト
  - _Requirements: 全般_

- [ ] 15. E2Eテストとドキュメント整備
  - NPX経由での実行テスト
  - すべてのコマンドのE2Eテスト
  - README.mdの作成（インストール方法、使用例、設定オプション）
  - コマンドリファレンスドキュメントの作成
  - パフォーマンステストと最適化
  - _Requirements: 全般_