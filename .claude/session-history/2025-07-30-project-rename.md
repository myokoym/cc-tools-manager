# 2025-07-30: Project Rename to claude-code-package-manager

## セッション概要
cc-tools-managerプロジェクトをclaude-code-package-manager（コマンド名: ccpm）に改名する作業を実施。

## 背景
- `cc-`という略称が曖昧でC++ツールと誤認される可能性
- 名前が長くコマンドとして打ちづらい
- より明確で短く、Claude関連ツールであることが分かりやすい名前が必要

## 実施内容

### 1. 仕様策定（.kiro/specs/project-rename/）
- requirements.md: EARS形式で7つの要件を定義
- design.md: 技術設計書（後方互換性なしのシンプルな実装）
- tasks.md: 実装タスクリスト

### 2. 名前変更の実施
#### パッケージ設定
- package.json: 名前を`claude-code-package-manager`に変更
- bin: `ccpm`コマンドとして設定
- リポジトリURL: 新しい名前に更新

#### ソースコード更新
- 環境変数: `CC_TOOLS_*` → `CCPM_*`
- デフォルトパス: `~/.cc-tools` → `~/.ccpm`
- ログファイル: `cc-tools.log` → `ccpm.log`
- アプリケーション名: すべて`ccpm`に統一

#### ドキュメント更新
- README.md / README.ja.md: 全コマンド例を`ccpm`に変更
- install.sh: 新しいリポジトリ名とパスに対応
- .kiro/steering/: プロジェクト名の参照を更新

#### テスト更新
- 環境変数名の変更
- コマンド出力例の更新

### 3. バグ修正
- registerコマンドの次のステップ案内を修正
  - 存在しない`init`/`deploy`コマンドの代わりに`update`を案内

### 4. ドキュメント更新（2025-07-31）
- docs/commands.md と docs/commands.ja.md の大幅更新
  - list --verboseオプションの詳細説明追加
  - デプロイファイルツリー表示機能の記載
  - リポジトリ選択方法（名前、ID、インデックス番号）の明記
  - 各コマンドの使用例を充実
  - 古いバージョン情報の削除

### 5. npmパッケージ名の検討
- 検討内容: パッケージ名を`ccpm`に変更するか
- 調査結果:
  - `ccpm`はnpmで利用可能（未使用）
  - npm生態系では名前とコマンドが異なるのは一般的
- 決定: **現状維持**
  - パッケージ名: `claude-code-package-manager`（明確性を重視）
  - コマンド名: `ccpm`（短さと使いやすさを重視）
  - 理由: 既存の慣例に従っており、機能が分かりやすい

## コミット履歴
1. `fedb2fe`: spec: Add project rename specification
2. `b878ac6`: spec: Update project-rename design for simplified implementation
3. `5d1f9fb`: spec: Generate implementation tasks for project-rename feature
4. `6c44d33`: feat: Rename project to claude-code-package-manager (ccpm)
5. `f4adb47`: fix: Update register command next steps message
6. `b275440`: docs: Add (ccpm) to README titles for clarity

## 技術的なポイント
- 後方互換性は考慮せず（未リリースのため）
- 環境変数のプレフィックスを統一的に変更
- Git履歴には旧名が残るが、最新ファイルからは完全に削除

## 今後の作業
- GitHubリポジトリ名の変更（手動作業）
- npmへの公開準備
- テストの修正（既存のテストエラーへの対応）