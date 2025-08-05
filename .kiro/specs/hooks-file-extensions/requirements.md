# Requirements Document

## イントロダクション

Claude Code Package Managerは現在、コマンドやエージェントと同様にhooksディレクトリのファイルをデプロイする機能を持っています。現在のシステムでは、hooks用に`.js`、`.ts`、`.mjs`、`.md`ファイルがサポートされていますが、Claude Code自体のhooksシステムはJSON設定ファイルを使用してシェルコマンドを実行します。実際の使用では、Python（`.py`）、Ruby（`.rb`）、シェルスクリプト（`.sh`）、設定ファイル（`.json`、`.yaml`）など、様々な拡張子のファイルが必要になる可能性があります。本機能は、hooksディレクトリにおけるファイル拡張子のサポートを調査し、実用的なhook管理のために必要に応じてサポートを拡張します。

## Requirements

### Requirement 1: 現在のファイル拡張子サポート状況の調査
**ユーザーストーリー:** 開発者として、hooksディレクトリで現在サポートされているファイル拡張子を把握したい。これにより、どのようなファイルがデプロイ可能かを理解できる。

#### 受け入れ基準

1. WHEN システムがhooksディレクトリをスキャンする THEN システムは現在サポートされている .js、.ts、.mjs、.md ファイルを検出して処理できること SHALL BE VERIFIED
2. WHEN システムがhooksディレクトリをスキャンする THEN システムは .json、.yaml、.yml 設定ファイルの現在の処理状況（未サポート）を報告すること SHALL BE PROVIDED
3. WHEN システムがhooksディレクトリをスキャンする THEN システムは .py、.rb、.sh などのスクリプトファイルの現在の処理状況（未サポート）を報告すること SHALL BE PROVIDED
4. WHEN 調査結果が生成される THEN システムは各ファイル拡張子の現在のサポート状況（サポート済み/未サポート/部分的サポート）を一覧表示すること SHALL BE PROVIDED
5. IF 特定の拡張子がフィルタリングされている THEN システムはその理由（現在のパターンマッチング制限、セキュリティ考慮事項など）を明示すること SHALL BE DOCUMENTED

### Requirement 2: Hook設定ファイルのサポート
**ユーザーストーリー:** Claude Codeユーザーとして、JSONやYAML形式のhook設定ファイルをデプロイしたい。これにより、hookの動作を柔軟に設定できる。

#### 受け入れ基準

1. WHEN ユーザーがhooks/*.json ファイルを含むリポジトリを登録する THEN システムはこれらのファイルを~/.claude/hooks/にデプロイすること SHALL BE SUPPORTED
2. WHEN ユーザーがhooks/*.yaml または hooks/*.yml ファイルを含むリポジトリを登録する THEN システムはこれらのファイルを~/.claude/hooks/にデプロイすること SHALL BE SUPPORTED
3. WHEN 設定ファイルがデプロイされる THEN システムは基本的なJSON/YAML構文検証を実行すること SHALL BE PERFORMED
4. IF 設定ファイルの構文エラーが検出された THEN システムはエラーの詳細と行番号を報告すること SHALL BE PROVIDED
5. WHEN 設定ファイルがデプロイされる THEN システムは元のファイル権限を保持すること SHALL BE PRESERVED

### Requirement 3: Hookスクリプトファイルのサポート
**ユーザーストーリー:** 開発者として、Python、Ruby、シェルスクリプトなど様々な言語で書かれた実行可能なhookファイルをデプロイしたい。これにより、任意の言語でカスタムhookロジックを実装できる。

#### 受け入れ基準

1. WHEN ユーザーがhooks/*.py（Python）ファイルを含むリポジトリを登録する THEN システムはこれらのファイルをデプロイすること SHALL BE SUPPORTED
2. WHEN ユーザーがhooks/*.rb（Ruby）ファイルを含むリポジトリを登録する THEN システムはこれらのファイルをデプロイすること SHALL BE SUPPORTED
3. WHEN ユーザーがhooks/*.sh（シェルスクリプト）ファイルを含むリポジトリを登録する THEN システムはこれらのファイルをデプロイすること SHALL BE SUPPORTED
4. IF スクリプトファイルがデプロイされる THEN システムは実行権限を適切に設定すること（例：chmod +x）SHALL BE CONFIGURED
5. WHEN スクリプトファイルがデプロイされる THEN システムはセキュリティ警告とファイルタイプを表示すること SHALL BE DISPLAYED

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

### Requirement 7: ファイル拡張子の柔軟な設定
**ユーザーストーリー:** 開発者として、プロジェクトのニーズに応じてサポートするファイル拡張子をカスタマイズしたい。これにより、特定のプロジェクトで必要な任意のファイルタイプをサポートできる。

#### 受け入れ基準

1. WHEN ユーザーが設定ファイルでhooksのサポート拡張子を定義する THEN システムはその設定に従ってファイルをデプロイすること SHALL BE CONFIGURABLE
2. IF ユーザーが拡張子を明示的に指定しない THEN システムはデフォルトの安全な拡張子セット（.md、.js、.ts、.mjs、.json、.yaml、.yml）を使用すること SHALL BE DEFAULT
3. WHEN カスタム拡張子が設定される THEN システムは各拡張子に対する処理方法（実行権限の付与など）を指定できること SHALL BE SUPPORTED
4. IF セキュリティ上危険な拡張子（.exe、.dll など）が設定される THEN システムは警告を表示してユーザーに確認を求めること SHALL BE REQUIRED
5. WHEN 拡張子設定が変更される THEN システムは既存のデプロイ済みファイルへの影響を表示すること SHALL BE PROVIDED

### Requirement 8: 拡張子に基づく適切な処理
**ユーザーストーリー:** システムとして、ファイル拡張子に基づいて適切な処理（権限設定、検証など）を自動的に実行したい。これにより、各ファイルタイプが正しく機能する。

#### 受け入れ基準

1. WHEN .sh、.py、.rb などのスクリプトファイルがデプロイされる THEN システムは実行権限（chmod +x）を自動的に設定すること SHALL BE PERFORMED
2. WHEN .json、.yaml、.yml ファイルがデプロイされる THEN システムは基本的な構文検証を実行すること SHALL BE VALIDATED
3. WHEN .md ファイルがデプロイされる THEN システムは現在の処理を継続すること（後方互換性）SHALL BE MAINTAINED
4. IF ファイルの拡張子が認識できない THEN システムはデフォルトで読み取り専用権限でデプロイすること SHALL BE DEFAULT
5. WHEN 処理エラーが発生する THEN システムは拡張子とエラーの詳細を含むログを記録すること SHALL BE LOGGED