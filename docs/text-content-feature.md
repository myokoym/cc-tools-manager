# Text Content Feature

CCPMに、リポジトリではない単一のテキストファイル（コマンド、エージェント、フック）を管理する機能を追加しました。

## 使い方

### 1. テキストコンテンツの登録

```bash
ccpm register text
```

インタラクティブに以下を入力：
- 名前（例：my-command）
- タイプ（commands/agents/hooks から選択）

エディタが開くので、コンテンツを入力して保存します。

### 2. テキストコンテンツの編集

```bash
ccpm edit my-command
```

エディタでコンテンツを編集できます。

### 3. デプロイ

```bash
ccpm update my-command
```

`~/.claude/commands/my-command.md` にデプロイされます。

### 4. 一覧表示

```bash
ccpm list
```

リポジトリとテキストコンテンツの両方が表示されます。

### 5. 削除

```bash
ccpm remove my-command
```

## 実装の特徴

- **最小限の変更**: 既存のリポジトリ管理システムを活用
- **text://プロトコル**: テキストコンテンツは `text://name` として内部的に管理
- **既存コマンドの再利用**: list、show、remove、updateコマンドがそのまま使える
- **新規依存なし**: 追加のnpmパッケージは不要

## データ保存場所

- テキストコンテンツ: `~/.ccpm/text-contents/`
- レジストリ: `~/.ccpm/repositories.json` （既存と統合）