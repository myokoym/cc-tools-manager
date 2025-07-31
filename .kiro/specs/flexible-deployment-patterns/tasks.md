# 実装計画

## タスク一覧

- [ ] 1. TypeScript型定義の拡張とテスト環境の準備
  - src/types/repository.tsにRepositoryType型を追加
  - src/types/deployment.tsに新規型定義を作成
  - テストフレームワークの設定確認とモックデータ準備
  - _要件: 1.1, 1.2_

- [ ] 2. リポジトリ検証モジュールの実装
- [ ] 2.1 RepositoryValidatorクラスの基本実装とテスト作成
  - tests/unit/core/repository-validator.test.tsでテストを作成
  - src/core/RepositoryValidator.tsでクラス実装
  - 構造検出メソッド（hasClaudeStructure、hasTypeDirectories）の実装
  - _要件: 3.1, 3.2, 3.3, 3.4_

- [ ] 2.2 バリデーションロジックの実装
  - validateStructureメソッドのテスト作成
  - タイプ指定時の構造競合検出ロジック実装
  - エラーメッセージとサジェスチョンの実装
  - _要件: 3.3, 3.4, 3.5_

- [ ] 3. RegistryServiceの拡張
- [ ] 3.1 registerWithTypeメソッドの実装
  - tests/unit/core/registry-service.test.tsにタイプ指定テストを追加
  - src/core/RegistryService.tsにregisterWithTypeメソッドを実装
  - タイプ検証とリポジトリ保存ロジックの統合
  - _要件: 1.1, 1.2, 1.3, 1.5_

- [ ] 3.2 リポジトリデータの永続化更新
  - repositories.jsonへのtypeフィールド追加のテスト作成
  - 保存・読み込みロジックの更新
  - マイグレーション処理の実装（既存データの互換性維持）
  - _要件: 4.3, 5.1, 5.2_

- [ ] 4. CLIコマンドの拡張
- [ ] 4.1 registerコマンドへの--typeオプション追加
  - tests/unit/commands/register.test.tsにタイプオプションテストを追加
  - src/commands/register.tsに--typeオプションを実装
  - オプション値の検証とエラーハンドリング
  - _要件: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 4.2 listコマンドの拡張
  - tests/unit/commands/list.test.tsにタイプ表示テストを追加
  - src/commands/list.tsでタイプ情報の表示を実装
  - --verboseオプションでの詳細表示機能追加
  - _要件: 4.1, 4.2_

- [ ] 5. DeploymentServiceのタイプベースデプロイメント実装
- [ ] 5.1 タイプベースデプロイメントエンジンの基本実装
  - tests/unit/core/deployment-service.test.tsにタイプモードテストを追加
  - src/core/DeploymentService.tsにdeployTypeModeメソッドを実装
  - getTypeBasedPatternsとmapRootToTypeメソッドの実装
  - _要件: 2.1, 2.2, 2.3_

- [ ] 5.2 ファイルデプロイメントロジックの実装
  - リポジトリ直下のファイル検出テストを作成
  - README.md除外ロジックの実装とテスト
  - ディレクトリ構造保持のテスト作成と実装
  - _要件: 2.4, 2.5_

- [ ] 6. 統合テストとE2Eテスト
- [ ] 6.1 タイプ指定フローの統合テスト作成
  - tests/integration/type-based-deployment.test.tsを作成
  - 登録→クローン→デプロイの完全フローテスト
  - 構造競合エラーケースのテスト
  - _要件: 全要件の統合検証_

- [ ] 6.2 E2Eテストの実装
  - tests/e2e/cli-type-mode.test.tsを作成
  - 実際のCLIコマンド実行によるテスト
  - エラーメッセージと出力フォーマットの検証
  - 既存機能との互換性確認
  - _要件: 5.3, 5.4, 5.5_

## タスク詳細

### タスク1: TypeScript型定義の拡張
このタスクでは、新機能に必要な型定義を作成します。既存のrepository.tsファイルを拡張し、新しいdeployment.tsファイルを作成して、タイプ指定機能の基盤となる型を定義します。

### タスク2: リポジトリ検証モジュール
RepositoryValidatorクラスは、リポジトリ構造の検証を担当します。タイプ指定時の.claude/構造検出や、適切なファイルの存在確認を行います。テスト駆動開発により、まずテストを作成してから実装を進めます。

### タスク3: RegistryServiceの拡張
既存のregisterメソッドと並行して、registerWithTypeメソッドを実装します。これにより、タイプ指定での登録が可能になります。後方互換性を保ちながら、新機能を追加します。

### タスク4: CLIコマンドの拡張
Commander.jsを使用して、--typeオプションを追加します。また、listコマンドではタイプ情報を表示できるようにします。ユーザーフレンドリーなエラーメッセージも実装します。

### タスク5: デプロイメントロジック
タイプベースのデプロイメントでは、リポジトリ直下のコンテンツを指定されたディレクトリにマッピングします。既存のパターンマッチングロジックと共存させながら、新しいデプロイメント方式を実装します。

### タスク6: 統合テスト
個別のコンポーネントテストに加えて、全体的なフローをテストします。特に、タイプ指定モードと自動検出モードの両方が正しく動作することを確認します。

### タスク7: updateコマンドへの--typeオプション追加
- [ ] 7.1 updateコマンドに--typeオプションを追加
  - src/commands/update.tsに--typeオプションを実装
  - リポジトリタイプの変更ロジックを実装
  - _要件: register後のタイプ変更機能_

- [ ] 7.2 タイプ変更時のクリーンアップ処理
  - 既存のデプロイメントファイルを削除する処理を実装
  - 旧タイプディレクトリからのファイル削除
  - _要件: タイプ変更時の整合性維持_

- [ ] 7.3 新タイプでの再デプロイメント
  - 新しいタイプに基づいて再デプロイする処理を実装
  - DeploymentServiceと連携した再配置ロジック
  - _要件: タイプ変更後の正しい配置_