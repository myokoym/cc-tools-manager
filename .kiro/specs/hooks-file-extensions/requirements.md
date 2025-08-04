# Requirements Document

## イントロダクション

Claude Code Package Managerは現在、コマンドやエージェントと同様にhooksディレクトリのファイルをデプロイする機能を持っています。しかし、hooksには設定ファイルやスクリプトなど、.md以外の拡張子のファイルが含まれる可能性があります。本機能は、hooksディレクトリにおける.md以外のファイル拡張子のサポート状況を調査し、必要に応じてサポートを拡張することで、より柔軟なhook管理を実現します。

## Requirements

### Requirement 1: 現在のファイル拡張子サポート状況の調査
**ユーザーストーリー:** 開発者として、hooksディレクトリで現在サポートされているファイル拡張子を把握したい。これにより、どのようなファイルがデプロイ可能かを理解できる。

#### 受け入れ基準

1. WHEN システムがhooksディレクトリをスキャンする THEN システムは .md ファイルを検出して処理できること SHALL BE VERIFIED
2. WHEN システムがhooksディレクトリをスキャンする THEN システムは .json、.yaml、.yml ファイルの処理状況を報告すること SHALL BE PROVIDED
3. WHEN システムがhooksディレクトリをスキャンする THEN システムは .js、.ts、.sh などのスクリプトファイルの処理状況を報告すること SHALL BE PROVIDED
4. WHEN 調査結果が生成される THEN システムは各ファイル拡張子の現在のサポート状況（サポート済み/未サポート/部分的サポート）を一覧表示すること SHALL BE PROVIDED
5. IF 特定の拡張子がフィルタリングされている THEN システムはその理由（セキュリティ、技術的制限など）を明示すること SHALL BE DOCUMENTED

### Requirement 2: Hook設定ファイルのサポート
**ユーザーストーリー:** Claude Codeユーザーとして、JSONやYAML形式のhook設定ファイルをデプロイしたい。これにより、hookの動作を柔軟に設定できる。

#### 受け入れ基準

1. WHEN ユーザーがhooks/*.json ファイルを含むリポジトリを登録する THEN システムはこれらのファイルを~/.claude/hooks/にデプロイすること SHALL BE SUPPORTED
2. WHEN ユーザーがhooks/*.yaml または hooks/*.yml ファイルを含むリポジトリを登録する THEN システムはこれらのファイルを~/.claude/hooks/にデプロイすること SHALL BE SUPPORTED
3. WHEN 設定ファイルがデプロイされる THEN システムは基本的なJSON/YAML構文検証を実行すること SHALL BE PERFORMED
4. IF 設定ファイルの構文エラーが検出された THEN システムはエラーの詳細と行番号を報告すること SHALL BE PROVIDED
5. WHEN 設定ファイルがデプロイされる THEN システムは元のファイル権限を保持すること SHALL BE PRESERVED

### Requirement 3: Hookスクリプトファイルのサポート
**ユーザーストーリー:** 開発者として、JavaScriptやシェルスクリプトなどの実行可能なhookファイルをデプロイしたい。これにより、カスタムhookロジックを実装できる。

#### 受け入れ基準

1. WHEN ユーザーがhooks/*.js または hooks/*.ts ファイルを含むリポジトリを登録する THEN システムはこれらのファイルのデプロイ可否を判断すること SHALL BE EVALUATED
2. WHEN ユーザーがhooks/*.sh ファイルを含むリポジトリを登録する THEN システムはこれらのファイルのデプロイ可否を判断すること SHALL BE EVALUATED
3. IF スクリプトファイルのデプロイが許可される THEN システムは実行権限を適切に設定すること SHALL BE CONFIGURED
4. WHEN スクリプトファイルがデプロイされる THEN システムはセキュリティ警告を表示すること SHALL BE DISPLAYED
5. IF セキュリティリスクが検出された（例：危険なコマンド、外部へのアクセス） THEN システムはデプロイを中断してユーザーに確認を求めること SHALL BE REQUIRED

### Requirement 4: ファイル拡張子フィルタリングルール
**ユーザーストーリー:** システム管理者として、安全でないファイル拡張子をフィルタリングしたい。これにより、システムのセキュリティを維持できる。

#### 受け入れ基準

1. WHEN システムがファイルをスキャンする THEN システムは実行可能バイナリ（.exe、.dll、.so など）を除外すること SHALL BE FILTERED
2. WHEN システムがファイルをスキャンする THEN システムは一時ファイル（.tmp、.swp、.bak など）を除外すること SHALL BE FILTERED
3. WHEN システムがファイルをスキャンする THEN システムは隠しファイル（.で始まるファイル）の処理ポリシーに従うこと SHALL BE APPLIED
4. IF ユーザーが除外されたファイルをデプロイしようとする THEN システムは明確な理由とともに拒否メッセージを表示すること SHALL BE PROVIDED
5. WHEN フィルタリングルールが適用される THEN システムはカスタマイズ可能な許可リスト/拒否リストをサポートすること SHALL BE CONFIGURABLE

### Requirement 5: 後方互換性とマイグレーション
**ユーザーストーリー:** 既存ユーザーとして、新しいファイル拡張子サポートが既存の.mdファイルの処理に影響しないことを確認したい。

#### 受け入れ基準

1. WHEN 新しいファイル拡張子サポートが有効になる THEN システムは既存の.mdファイルの処理を継続すること SHALL BE MAINTAINED
2. WHEN システムがアップグレードされる THEN 既存のデプロイ済みファイルは影響を受けないこと SHALL BE PRESERVED
3. IF 新しい拡張子サポートがオプトイン機能として実装される THEN システムはデフォルトで既存の動作を維持すること SHALL BE DEFAULT
4. WHEN ユーザーが新機能を有効にする THEN システムは変更の影響を事前に表示すること SHALL BE PREVIEWED
5. IF 既存ファイルとの競合が発生する可能性がある THEN システムは警告とマイグレーションガイドを提供すること SHALL BE PROVIDED

### Requirement 6: ドキュメントとユーザーガイダンス
**ユーザーストーリー:** Claude Codeユーザーとして、サポートされるhookファイルタイプとその使用方法を理解したい。

#### 受け入れ基準

1. WHEN ドキュメントが更新される THEN システムはサポートされる全ファイル拡張子のリストを提供すること SHALL BE DOCUMENTED
2. WHEN ドキュメントが更新される THEN システムは各ファイルタイプの使用例を提供すること SHALL BE PROVIDED
3. WHEN ユーザーがhelpコマンドを実行する THEN システムはhook関連のファイル拡張子情報を含めること SHALL BE DISPLAYED
4. IF 特定の拡張子に制限がある THEN システムはその制限と回避策を文書化すること SHALL BE DOCUMENTED
5. WHEN エラーが発生する THEN システムは関連するドキュメントへのリンクを提供すること SHALL BE REFERENCED