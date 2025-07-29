# Requirements Document

## Introduction

CC Tools Managerは、Claude Code関連のツール（コマンド、エージェント、その他の拡張機能）を一元管理するCLIツールです。GitHubリポジトリからツールを自動的に同期し、ローカルの`.claude/`ディレクトリに適切に配置することで、開発者やチームがClaude Codeツールを効率的に管理・共有できるようにします。

このツールは、複数のリポジトリから提供される様々なツールを統一的に管理し、更新の自動化、競合の解決、ディレクトリ構造の保持など、ツール管理に必要な機能を提供します。

## Requirements

### Requirement 1: リポジトリ登録管理
**User Story:** 開発者として、GitHubのclaude-codeツールリポジトリを登録し、管理したい。これにより、お気に入りのツールを簡単に追跡・更新できる。

#### Acceptance Criteria

1. WHEN ユーザーが有効なGitHub URLを指定してregisterコマンドを実行する THEN システムはリポジトリ情報をrepositories.jsonに保存する
2. WHEN ユーザーが無効なURLを指定する THEN システムはエラーメッセージを表示し、登録を拒否する
3. WHEN 既に登録済みのリポジトリURLを指定する THEN システムは重複エラーを表示する
4. WHEN リポジトリが正常に登録される THEN システムは成功メッセージと登録されたリポジトリ名を表示する
5. IF repositories.jsonファイルが存在しない THEN システムは新規作成してリポジトリ情報を保存する
6. WHEN ユーザーがlistコマンドを実行する THEN システムはすべての登録済みリポジトリを一覧表示する
7. WHEN ユーザーがremoveコマンドでリポジトリ名を指定する THEN システムは該当リポジトリを登録から削除する

### Requirement 2: Git操作とリポジトリ同期
**User Story:** 開発者として、登録したリポジトリから最新のツールを取得したい。これにより、常に最新版のツールを使用できる。

#### Acceptance Criteria

1. WHEN ユーザーがupdateコマンドを実行する THEN システムはすべての登録済みリポジトリをgit pullで更新する
2. WHEN 特定のリポジトリ名を指定してupdateコマンドを実行する THEN システムは指定されたリポジトリのみを更新する
3. IF リポジトリがローカルに存在しない THEN システムはgit cloneを実行してリポジトリを取得する
4. WHILE リポジトリを更新中 THE SYSTEM SHALL プログレスインジケーターを表示する
5. WHEN Git操作が失敗する THEN システムはエラーメッセージと回復方法を提示する
6. IF ネットワーク接続がない THEN システムは適切なエラーメッセージを表示し、オフラインでの制限を説明する
7. WHEN 更新が完了する THEN システムは更新されたファイル数と変更内容のサマリーを表示する

### Requirement 3: ファイルデプロイメント
**User Story:** 開発者として、リポジトリ内のツールファイルを適切な`.claude/`ディレクトリに自動配置したい。これにより、手動でファイルをコピーする必要がなくなる。

#### Acceptance Criteria

1. WHEN リポジトリに`.claude/commands/`ディレクトリが存在する THEN システムはその内容を`~/.claude/commands/`にコピーする
2. WHEN リポジトリに`commands/`ディレクトリが存在する（.claudeプレフィックスなし） THEN システムはその内容を`~/.claude/commands/`にコピーする
3. WHILE ファイルをデプロイする THE SYSTEM SHALL ディレクトリ構造を保持する（例：`commands/kiro/spec-init.md` → `~/.claude/commands/kiro/spec-init.md`）
4. WHEN 同名のファイルが既に存在する AND conflictResolutionが'prompt'に設定されている THEN システムはユーザーに上書きの確認を求める
5. IF conflictResolutionが'skip'に設定されている THEN システムは既存ファイルをスキップする
6. IF conflictResolutionが'overwrite'に設定されている THEN システムは既存ファイルを上書きする
7. WHEN デプロイメントパターン（`**/*.md`など）にマッチするファイルを見つける THEN システムは該当するすべてのファイルをデプロイする
8. WHERE ファイル権限が設定されている THE SYSTEM SHALL 元の権限を保持してコピーする

### Requirement 4: CLI インターフェース
**User Story:** 開発者として、直感的なCLIコマンドでツールを管理したい。これにより、効率的にツール管理タスクを実行できる。

#### Acceptance Criteria

1. WHEN ユーザーがヘルプオプション（--help）を指定する THEN システムは利用可能なコマンドとオプションを表示する
2. WHEN 無効なコマンドが入力される THEN システムはエラーメッセージと正しい使用方法を表示する
3. WHERE ターミナルがカラー出力をサポートする THE SYSTEM SHALL 成功は緑、エラーは赤、警告は黄色で表示する
4. IF CC_TOOLS_NO_COLOR環境変数が設定されている THEN システムはカラー出力を無効にする
5. WHEN --dry-runオプションが指定される THEN システムは実際の変更を行わずに実行内容をプレビューする
6. WHEN interactiveコマンドが実行される THEN システムはインタラクティブモードでユーザーをガイドする
7. WHILE 長時間の操作を実行中 THE SYSTEM SHALL プログレスインジケーター（ora）を表示する

### Requirement 5: 設定管理
**User Story:** 管理者として、ツールの動作を環境変数や設定ファイルでカスタマイズしたい。これにより、チームのニーズに合わせて動作を調整できる。

#### Acceptance Criteria

1. WHEN CC_TOOLS_HOME環境変数が設定されている THEN システムはその値をツール保存のベースディレクトリとして使用する
2. IF CC_TOOLS_HOME環境変数が未設定 THEN システムは`~/.cc-tools`をデフォルトとして使用する
3. WHEN CC_TOOLS_CLAUDE_DIR環境変数が設定されている THEN システムはその値をデプロイメント先として使用する
4. IF CC_TOOLS_CLAUDE_DIR環境変数が未設定 THEN システムは`~/.claude`をデフォルトとして使用する
5. WHEN CC_TOOLS_LOG_LEVEL環境変数が設定されている THEN システムは指定されたレベル（DEBUG, INFO, WARN, ERROR）でログを出力する
6. WHERE 設定ファイル（~/.cc-tools/config/settings.json）が存在する THE SYSTEM SHALL その設定を読み込んで適用する
7. WHEN CC_TOOLS_FORCE環境変数が設定されている THEN システムは確認プロンプトをスキップして操作を実行する

### Requirement 6: エラー処理とログ
**User Story:** 開発者として、問題が発生した時に明確なエラーメッセージとログを確認したい。これにより、問題を素早く解決できる。

#### Acceptance Criteria

1. WHEN エラーが発生する THEN システムは人間が理解できる明確なエラーメッセージを表示する
2. WHEN エラーが発生する THEN システムは可能な回復方法や次のステップを提案する
3. WHERE ログファイル（~/.cc-tools/logs/cc-tools.log）が設定されている THE SYSTEM SHALL すべての操作をタイムスタンプ付きで記録する
4. IF Git認証が失敗する THEN システムはSSHキーまたはトークンの設定方法を案内する
5. WHEN ファイルシステムのアクセス権限エラーが発生する THEN システムは必要な権限と修正方法を説明する
6. WHILE 操作を実行中にエラーが発生する THE SYSTEM SHALL 部分的な変更をロールバックして一貫性を保つ
7. WHEN デバッグモードが有効な場合 THEN システムは詳細なスタックトレースを表示する

### Requirement 7: 状態管理とキャッシュ
**User Story:** 開発者として、ツールの状態と更新履歴を確認したい。これにより、どのツールがいつ更新されたかを把握できる。

#### Acceptance Criteria

1. WHEN statusコマンドが実行される THEN システムはすべてのリポジトリの現在の状態を表示する
2. WHERE state.jsonファイルが存在する THE SYSTEM SHALL 各リポジトリの最終更新日時とバージョン情報を保持する
3. WHEN checkコマンドが実行される THEN システムは更新可能なリポジトリを確認して表示する（実際の更新は行わない）
4. IF キャッシュされたメタデータが破損している THEN システムは自動的に再生成する
5. WHEN cleanコマンドが実行される THEN システムは孤立したファイルや不要なキャッシュを削除する
6. WHILE リポジトリ情報を更新する THE SYSTEM SHALL state.jsonをアトミックに更新して一貫性を保つ
7. WHEN 増分更新が有効な場合 THEN システムはファイルハッシュを比較して変更されたファイルのみを更新する