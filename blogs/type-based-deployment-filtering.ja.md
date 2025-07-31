# ccpmのタイプベースデプロイメントにおけるスマートなファイルフィルタリング

## 課題

ccpm（Claude Code Package Manager）のタイプベースデプロイメント機能を実装する際、興味深い課題に直面しました：標準的な`.claude/`ディレクトリ構造に従わないリポジトリをデプロイする際に、どのようにファイルをインテリジェントにフィルタリングするか、という問題です。

以下のようなリポジトリ構造を考えてみましょう：
```
my-agents-repo/
├── .gitignore
├── README.md
├── LICENSE
├── package.json
├── marketing.md
├── engineering/
│   └── backend.md
└── design/
    ├── ui-patterns.md
    └── components.md
```

ユーザーが`ccpm register https://github.com/user/my-agents-repo --type agents`でこれを登録する際、設定ファイルではなく、関連するエージェントファイルのみを`~/.claude/agents/`にデプロイしたいのです。

## 解決策

`getTypeBasedPatterns`メソッドにスマートなフィルタリングシステムを実装しました：

### 1. ドットファイルの無視
```javascript
ignore: [
  '.*',           // ドットで始まるファイル
  '**/.*',        // サブディレクトリ内のドットファイル
  '**/.*/.**',    // ドットディレクトリ内のファイル
]
```

これにより以下がフィルタリングされます：
- `.gitignore`
- `.env`
- `.github/workflows/`
- その他の設定ファイル

### 2. 大文字で始まるファイルのスキップ
```javascript
if (!isDirectory && basename[0] === basename[0].toUpperCase()) {
  logger.debug(`Skipping uppercase file: ${file}`);
  continue;
}
```

これにより以下がインテリジェントにフィルタリングされます：
- `README.md`
- `LICENSE`
- `CONTRIBUTING.md`
- 通常大文字で始まるその他のドキュメントファイル

### 3. 関連コンテンツのみのデプロイ
```javascript
if (isDirectory || file.endsWith('.md')) {
  // このファイル/ディレクトリを含める
}
```

ディレクトリと`.md`ファイルのみがデプロイされ、以下が保証されます：
- エージェント/コマンド/フック定義が含まれる
- ディレクトリ構造が保持される
- 関連しないファイルが除外される

## 実装の詳細

`DeploymentService.ts`での完全な実装：

```typescript
private async getTypeBasedPatterns(repoPath: string, type: string): Promise<PatternMatch[]> {
  const matches: PatternMatch[] = [];
  
  try {
    const files = await glob('**/*', {
      cwd: repoPath,
      nodir: false,
      ignore: [
        '**/node_modules/**', 
        '**/.git/**', 
        '**/dist/**', 
        '**/build/**',
        '.*',
        '**/.*',
        '**/.*/.**',
      ]
    });
    
    for (const file of files) {
      const basename = path.basename(file);
      const isDirectory = (await fs.stat(path.join(repoPath, file))).isDirectory();
      
      if (isDirectory || file.endsWith('.md')) {
        if (!isDirectory && basename[0] === basename[0].toUpperCase()) {
          logger.debug(`Skipping uppercase file: ${file}`);
          continue;
        }
        
        matches.push({
          file,
          pattern: '**/*',
          targetType: type as 'commands' | 'agents' | 'hooks'
        });
      }
    }
  } catch (error) {
    logger.warn(`Type-based pattern matching failed: ${error}`);
  }
  
  return matches;
}
```

## 利点

このアプローチにはいくつかの利点があります：

1. **設定不要**：ユーザーは`.ccpmignore`ファイルを追加する必要がありません
2. **インテリジェントなデフォルト**：一般的なパターンが自動的に処理されます
3. **クリーンなデプロイメント**：関連ファイルのみが`~/.claude/`に配置されます
4. **構造の保持**：ディレクトリ階層が維持されます

## 処理されたエッジケース

### ディレクトリとファイルの検出
`fs.stat()`を使用してディレクトリを適切に検出し、特殊ファイルの問題を回避します：

```typescript
const stats = await fs.stat(sourcePath);
if (stats.isDirectory()) {
  // ディレクトリを再帰的に処理
} else if (stats.isFile()) {
  // 通常のファイルを処理
}
// 特殊ファイル（ソケット、シンボリックリンク）は暗黙的にスキップ
```

### 入力検証
一般的なタイプミスをキャッチする検証を追加しました：

```typescript
if (options.type === 'agent') {
  console.log(chalk.yellow(`Did you mean 'agents'?`));
}
```

## 今後の改善点

1. **カスタム無視パターン**：ユーザーが追加のパターンを指定できるように
2. **ファイルタイプの拡張**：`.md`以外のファイルもサポート
3. **許可リストモード**：含めるファイルを正確に指定するオプション

## まとめ

スマートなファイルフィルタリングを実装することで、タイプベースのデプロイメントをより直感的でエラーに強いものにしました。ユーザーは設定ファイルがClaude Code環境を汚染することを心配せずに、リポジトリをデプロイできるようになりました。

この機能はccpm v0.2.0以降で利用可能です。ぜひお試しください：

```bash
ccpm register https://github.com/your/agents-repo --type agents
```

Happy deploying! 🚀