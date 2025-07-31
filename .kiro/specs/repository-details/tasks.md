# Implementation Plan

## 概要
`show`コマンドを実装し、リポジトリの詳細情報とファイルのデプロイメントマッピング（from-to）を表示する機能を段階的に構築します。

## 実装タスク

### Phase 1: 基礎構造とインターフェース定義

- [ ] 1. 型定義とインターフェースの作成
  - `src/types/repository-details.ts`に新しい型定義を追加
  - RepositoryDetails、DeploymentMapping、RepositoryStatus、ShowOptionsインターフェースを定義
  - 既存のRepositoryインターフェースとの整合性を確保
  - _要件: 1.1, 1.3_

- [ ] 2. ShowCommandクラスのスケルトン実装
  - `src/commands/show.ts`を作成し、基本的なコマンド構造を実装
  - Commander.jsのコマンド登録を`src/cli.ts`に追加
  - オプション定義（--files-only、--format、--verbose等）を設定
  - エラーハンドリングの基盤を構築
  - _要件: 1.1, 1.2, 4.1, 4.2, 4.3_

### Phase 2: サービス層の実装（テスト駆動）

- [ ] 3. DeploymentMapperサービスのテスト作成と実装
  - [ ] 3.1 `tests/unit/services/deployment-mapper.test.ts`でテストケースを作成
    - パターンマッチングのテストケース（.claude/、commands/、agents/等）
    - エッジケース（空のリポジトリ、無効なパス）のテスト
    - _要件: 2.1, 2.3, 2.4_
  - [ ] 3.2 `src/services/deployment-mapper.ts`でDeploymentMapperクラスを実装
    - scanSourceFiles：リポジトリ内のファイルをスキャン
    - resolveTargetPath：ソースパスからターゲットパスを解決
    - mapDeployments：完全なマッピング情報を生成
    - _要件: 2.1, 2.3, 2.4_

- [ ] 4. RepositoryStatusServiceのテスト作成と実装
  - [ ] 4.1 `tests/unit/services/repository-status.test.ts`でテストケースを作成
    - Git同期状態のチェックテスト
    - 競合検出のテストケース
    - エラー状態のテスト
    - _要件: 3.1, 3.2, 3.3_
  - [ ] 4.2 `src/services/repository-status.ts`でRepositoryStatusServiceクラスを実装
    - checkSyncStatus：Gitの同期状態を確認（simple-git使用）
    - getDeploymentStats：デプロイメント統計を計算
    - detectConflicts：競合ファイルを検出
    - _要件: 3.1, 3.2, 3.3_

### Phase 3: 出力フォーマッターの実装

- [ ] 5. OutputFormatterの実装とテスト
  - [ ] 5.1 `tests/unit/formatters/output-formatter.test.ts`でフォーマットテストを作成
    - テキスト形式の出力テスト
    - JSON形式の出力テスト
    - パス省略表示のテスト
    - カラー出力のテスト
    - _要件: 2.1, 4.2, 5.4_
  - [ ] 5.2 `src/formatters/output-formatter.ts`でOutputFormatterクラスを実装
    - formatText：視覚的に整列されたテキスト出力（chalk使用）
    - formatJson：構造化されたJSON出力
    - truncatePath：長いパスの省略表示
    - ターミナル幅の検出と適応
    - _要件: 2.1, 4.2, 5.4_

### Phase 4: パフォーマンス最適化とキャッシュ実装

- [ ] 6. PerformanceOptimizerの実装
  - [ ] 6.1 キャッシュ層のテスト作成
    - `tests/unit/utils/cache.test.ts`でキャッシュ動作のテスト
    - TTL（Time To Live）の動作確認テスト
    - キャッシュ無効化のテスト
    - _要件: 5.1, 5.2_
  - [ ] 6.2 キャッシュとバッチ処理の実装
    - `src/utils/cache.ts`でメモリキャッシュを実装
    - DeploymentMapperとRepositoryStatusServiceにキャッシュを統合
    - 並列処理の実装（Promise.allを使用）
    - _要件: 5.1, 5.2, 5.3_

### Phase 5: コマンド統合と統合テスト

- [ ] 7. ShowCommandの完全実装
  - [ ] 7.1 ShowCommandクラスの統合実装
    - 各サービスの依存性注入を設定
    - executeメソッドで全体のフローを実装
    - エラーハンドリングとリカバリーロジック
    - プログレスインジケーター（ora使用）の追加
    - _要件: 1.1, 1.3, 5.3_
  - [ ] 7.2 CLIへのコマンド登録と設定
    - `src/cli.ts`にshowコマンドを正式に登録
    - ヘルプメッセージとオプション説明の追加
    - _要件: 1.1, 4.1, 4.3, 4.4_

- [ ] 8. 統合テストとE2Eテストの作成
  - [ ] 8.1 統合テストの実装
    - `tests/integration/show-command.test.ts`で統合テストを作成
    - モックリポジトリを使用した完全なフローテスト
    - 各オプションの組み合わせテスト
    - _要件: 1.1, 1.3, 2.1, 3.1, 4.1-4.4_
  - [ ] 8.2 E2Eテストの実装
    - `tests/e2e/show-command-e2e.test.ts`でCLI実行テストを作成
    - 実際のコマンドライン実行のテスト
    - 出力形式の検証
    - パフォーマンステスト（大規模リポジトリ）
    - _要件: 5.1, 5.2_

### Phase 6: 最終統合とドキュメント更新

- [ ] 9. 最終統合と動作確認
  - すべてのコンポーネントが正しく連携することを確認
  - エッジケースの処理を検証
  - パフォーマンス目標（< 2秒）の達成を確認
  - メモリ使用量の確認（< 100MB）
  - _要件: 5.1, 5.2_

- [ ] 10. ドキュメントとヘルプメッセージの更新
  - `docs/commands.md`にshowコマンドのドキュメントを追加
  - READMEにshowコマンドの使用例を追加
  - コマンドヘルプメッセージの充実
  - _要件: 1.1_

## 実装順序の根拠

1. **型定義から開始**: TypeScriptの型安全性を活用し、後続タスクでの実装を明確化
2. **サービス層のテスト駆動開発**: ビジネスロジックの正確性を保証
3. **出力層の独立実装**: 表示ロジックをビジネスロジックから分離
4. **パフォーマンス最適化**: 基本機能完成後に最適化を実施
5. **統合テスト**: 全コンポーネントの協調動作を確認

各タスクは前のタスクの成果物を活用し、段階的に機能を構築します。