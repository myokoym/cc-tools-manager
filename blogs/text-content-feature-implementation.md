# CCPMにテキストコンテンツ管理機能を実装した話

## はじめに

Claude Code Package Manager (CCPM) は、Claude Code用のツール（コマンド、エージェント、フック）をGitHubリポジトリから管理するツールです。しかし、「ちょっとしたコマンドのためにわざわざGitHubリポジトリを作るのは面倒」という要望がありました。

そこで、リポジトリではない単一のテキストファイルを直接管理できる機能を追加することにしました。

## 最初のアプローチ：過度に複雑な設計

最初は、Kiro仕様駆動開発のプロセスに従って、詳細な設計を行いました：

```
- TextContentManager（登録・インポート）
- TextContentEditor（編集・削除）  
- TextContentDeployer（デプロイ）
- StorageService（confパッケージでのデータ永続化）
- 他多数のクラス...
```

設計書は立派でしたが、実装を始める前にユーザーから重要なフィードバックをいただきました：

> 「なんかすごく複雑に見えるんだけど、ビルドが肥大化したり他の機能に影響ない？あくまでメインはregister urlだけど」

この一言で、私は立ち止まって考え直しました。

## 発想の転換：既存システムの活用

そこで、全く異なるアプローチを取ることにしました：

**テキストコンテンツを「特殊なリポジトリ」として扱えばいいのでは？**

### 実装方針

1. テキストコンテンツを`text://`プロトコルの仮想リポジトリとして登録
2. 既存のレジストリシステムをそのまま使用
3. 新しい依存関係は追加しない

### 実際のコード変更

#### 1. URL検証の拡張

```typescript
// RegistryService.ts
validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // text://プロトコルの場合は特別な処理
    if (urlObj.protocol === 'text:') {
      return /^text:\/\/[\w.-]+$/.test(url);
    }
    
    // 既存のGitHub URL検証...
```

#### 2. ダミーGitリポジトリの作成

最初は特別な処理を多数追加していましたが、最終的にシンプルな解決策に辿り着きました：

```typescript
// GitManager.ts - cloneメソッド内
if (repo.url.startsWith('text://')) {
  await fs.mkdir(repoPath, { recursive: true });
  
  // git initを実行してダミーのGitリポジトリにする
  const gitForInit = simpleGit(repoPath);
  await gitForInit.init();
  
  // プレースホルダーファイルを作成してコミット
  const placeholderPath = path.join(repoPath, '.text-content');
  await fs.writeFile(placeholderPath, `This is a text content repository: ${repo.name}`);
  
  await gitForInit.add('.text-content');
  await gitForInit.commit('Initial commit for text content');
  
  return;
}
```

これにより、既存のGit操作がすべて正常に動作するようになりました。

#### 3. テキストコンテンツのデプロイ

```typescript
// DeploymentService.ts
private async deployTextContent(repo: Repository, options?: { interactive?: boolean }): Promise<DeploymentResult> {
  // テキストコンテンツファイルを読み込んで
  // ~/.claude/[type]/にコピーするだけ
  const contentFile = path.join(textContentDir, `${repo.name}.md`);
  const targetPath = path.join(CLAUDE_DIR, repo.type || 'commands', `${repo.name}.md`);
  
  await copyFile(contentFile, targetPath);
  // ...
}
```

## 使い方

実装後の使い方は非常にシンプルです：

```bash
# 1. テキストコンテンツを登録
$ ccpm register text
? Enter the name for this text content (.md will be added): my-awesome-command
? Select the content type: commands
📝 Opening editor...
✅ Registration Complete

# 2. 編集したいとき
$ ccpm edit my-awesome-command

# 3. デプロイ
$ ccpm update my-awesome-command

# 4. 一覧表示（リポジトリと一緒に表示される）
$ ccpm list

# 5. 削除
$ ccpm remove my-awesome-command
```

## 学んだ教訓

### 1. シンプルさは正義

最初の設計では、完全に独立したサブシステムを作ろうとしていました。しかし、既存のシステムを少し拡張するだけで同じ目的を達成できました。

### 2. ユーザーフィードバックの重要性

「複雑すぎる」という一言が、より良い設計への転換点となりました。実装前にフィードバックをもらえたのは幸運でした。

### 3. 制約を活かす

「リポジトリ管理システム」という既存の制約を、逆に活用することで、統一的なインターフェースを提供できました。

## おわりに

この実装を通じて、「新機能 = 新しいコードをたくさん書く」という考えが必ずしも正しくないことを学びました。既存のコードを賢く再利用することで、より保守しやすく、一貫性のあるシステムを作ることができます。

最終的な実装は、以下の特徴を持っています：

- **追加コード**: 約400行
- **新規依存関係**: 0
- **既存機能への影響**: 最小限
- **ユーザー体験**: 既存コマンドと統一的

時には立ち止まって、「もっとシンプルな方法はないか？」と問いかけることの大切さを実感しました。

## 関連リンク

- [Claude Code Package Manager (GitHub)](https://github.com/myokoym/claude-code-package-manager)
- [実装のPR/コミット履歴]（※実際のリンクに置き換えてください）