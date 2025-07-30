# 実装計画

- [ ] 1. package.jsonの更新とプロジェクトメタデータの変更
  - package.jsonのnameフィールドを"claude-code-package-manager"に変更
  - binフィールドを{ "ccpm": "./dist/index.js" }に更新
  - repositoryのURLを"https://github.com/myokoym/claude-code-package-manager.git"に変更
  - bugs.urlとhomepageのURLも新しいリポジトリ名に更新
  - _要件: 2.1_

- [ ] 2. 環境変数定数の更新
- [ ] 2.1 src/constants/paths.tsの環境変数プレフィックス変更
  - CC_TOOLS_HOMEをCCPM_HOMEに変更し、デフォルト値を~/.ccpmに更新
  - CC_TOOLS_CLAUDE_DIRをCCPM_CLAUDE_DIRに変更
  - CC_TOOLS_LOG_LEVELをCCPM_LOG_LEVELに変更
  - その他のCC_TOOLS_*プレフィックスをCCPM_*に一括変更
  - _要件: 3.2_

- [ ] 2.2 環境変数を使用している全ファイルの更新
  - src/utils/logger.tsの環境変数参照を新しい名前に更新
  - src/core/ConfigurationManager.tsの環境変数参照を更新
  - その他環境変数を参照している箇所をgrepで検索して更新
  - _要件: 3.2_

- [ ] 3. CLIとアプリケーション名の更新
- [ ] 3.1 src/cli.tsのプログラム名変更
  - program.name()を'ccpm'に変更
  - program.description()に"Claude Code Package Manager"を設定
  - バージョン表示時のアプリケーション名を更新
  - _要件: 3.1_

- [ ] 3.2 src/utils/logger.tsのアプリケーション名更新
  - Winstonロガーのdefaultメタデータでアプリケーション名を'ccpm'に変更
  - ログファイル名をcc-tools.logからccpm.logに変更
  - コンソール出力のプレフィックスを更新
  - _要件: 3.1_

- [ ] 3.3 src/constants/messages.tsのメッセージ更新
  - エラーメッセージ内の"CC Tools Manager"を"Claude Code Package Manager"に変更
  - ヘルプメッセージ内のツール名を更新
  - 成功メッセージ内の名前参照を更新
  - _要件: 3.1_

- [ ] 4. ドキュメントの全面更新
- [ ] 4.1 README.mdの更新
  - タイトルを"# Claude Code Package Manager"に変更
  - インストールコマンドをnpx ccpmやnpm install -g claude-code-package-managerに更新
  - 使用例のコマンドをすべてccpmに変更
  - 環境変数の説明をCCPM_*に更新
  - GitHubリポジトリURLを新しいものに変更
  - _要件: 4.1_

- [ ] 4.2 README.ja.mdの更新（日本語版）
  - README.mdと同様の変更を日本語版にも適用
  - 翻訳の一貫性を保ちながら更新
  - _要件: 4.3_

- [ ] 4.3 CONTRIBUTING.mdとその他のドキュメント更新
  - CONTRIBUTING.mdのプロジェクト名と開発手順を更新
  - docs/commands.mdのコマンド例をccpmに変更
  - docs/配下の全ファイルで名前参照を更新
  - install.shスクリプトのリポジトリURLを更新
  - _要件: 4.2, 6.2_

- [ ] 5. テストファイルの更新
- [ ] 5.1 テスト内の環境変数名更新
  - tests/unit/core/ConfigurationManager.test.tsの環境変数名を更新
  - tests/unit/commands/*.test.tsの環境変数設定を更新
  - モック環境変数の名前をCCPM_*に変更
  - _要件: 7.1_

- [ ] 5.2 テスト内のアプリケーション名とコマンド名更新
  - CLIテストでcc-tools-managerの代わりにccpmを使用
  - 期待値のメッセージ内の名前を更新
  - ログ出力の検証で新しい名前を期待
  - _要件: 7.1_

- [ ] 6. ビルドとリリース準備
- [ ] 6.1 ビルドスクリプトの実行と検証
  - npm run buildを実行して正常にビルドされることを確認
  - dist/index.jsが正しく生成されることを確認
  - npm run testですべてのテストがパスすることを確認
  - _要件: 7.2_

- [ ] 6.2 ローカルでのインストールと動作確認
  - npm linkでローカルインストール
  - ccpmコマンドが正常に動作することを確認
  - 各サブコマンド（register, update, list等）の動作確認
  - 環境変数が正しく読み込まれることを確認
  - _要件: 1.3, 7.2_

- [ ] 7. .kiro/steering/ファイルの更新
  - structure.mdのプロジェクト名とパス参照を更新
  - tech.mdの環境変数説明とコマンド例を更新
  - product.mdの製品名と説明を更新
  - _要件: 4.2_