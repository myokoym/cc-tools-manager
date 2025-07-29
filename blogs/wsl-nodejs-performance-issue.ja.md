---
title: "WSL2でNode.js CLIツールが異常に遅い！13秒→0.2秒に改善した話"
date: 2025-07-30
author: myokoym
tags: [wsl2, nodejs, performance, cli, typescript]
category: performance
lang: ja
---

# WSL2でNode.js CLIツールが異常に遅い！13秒→0.2秒に改善した話

## TL;DR

WSL2で開発したNode.js CLIツールが異常に遅い（13秒）問題に遭遇。原因は**Windowsファイルシステム（`/mnt/c/`）での開発**だった。Linuxファイルシステムに移動したら**65倍高速化**（0.2秒）した。

**教訓: WSL2での開発は必ずLinux側（`/home/`以下）で行うべし！**

## 問題：なぜか遅すぎるCLIツール

TypeScriptで開発したCLIツール（cc-tools-manager）の起動が異常に遅い問題に遭遇しました。

```bash
# 簡単なlistコマンドなのに...
% time cc-tools-manager list
# ... 出力 ...
cc-tools-manager list  0.50s user 0.46s system 7% cpu 13.388 total
```

**13秒！** たかがリポジトリ一覧を表示するだけで13秒は異常です。

## 原因究明の迷走

最初は以下を疑いました：

### 1. 重いインポート？
```typescript
// logger、設定マネージャー、各種サービスの初期化が原因？
import { logger } from './utils/logger';
import { ConfigurationManager } from './core/ConfigurationManager';
```

→ **遅延初期化を実装** → 効果なし

### 2. ログファイルの作成？
```typescript
// 起動時にログディレクトリを作成していた
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}
```

→ **遅延作成に変更** → 効果なし

### 3. 動的インポート化
```typescript
// コマンドを使うときだけロード
.action(async (...args) => {
  const { listCommand } = await import('./commands');
  // ...
});
```

→ **効果なし**

## 真の原因：ファイルシステムの場所

デバッグを重ねた結果、Node.js内部の処理時間は正常でした：

```javascript
// デバッグコード
console.time('Total');
const { RegistryService } = require('./dist/core/RegistryService');
const service = new RegistryService();
await service.list();
console.timeEnd('Total');
// => Total: 212ms
```

内部処理は0.2秒なのに、`time`コマンドは13秒を報告...

そして気づきました：

```bash
% pwd
/mnt/c/Users/myoko/Documents/dev/claude/cc-tools-manager
```

**Windowsファイルシステム上で開発していた！**

## 解決策：Linux側への移動

```bash
# プロジェクトをLinux側にコピー
cp -r /mnt/c/Users/myoko/Documents/dev/claude/cc-tools-manager ~/dev/

# Linux側で実行
cd ~/dev/cc-tools-manager
time node dist/index.js list
# => 0.02s user 0.01s system 20% cpu 0.201 total
```

**13秒 → 0.2秒（65倍高速化！）**

## なぜこんなに遅いのか？

WSL2のアーキテクチャが原因です：

### WSL2のファイルシステム構造
- **Linux側（`/home/`など）**: ext4ファイルシステム、ネイティブ速度
- **Windows側（`/mnt/c/`）**: 9Pプロトコル経由でアクセス、大幅なオーバーヘッド

### 特に遅い操作
1. **多数のファイルアクセス**: Node.jsの`require`は大量のファイルを読む
2. **ディレクトリ走査**: `node_modules`の探索
3. **メタデータ取得**: `stat`システムコール

## パフォーマンス比較

| 操作 | Windows側 (`/mnt/c/`) | Linux側 (`/home/`) | 倍率 |
|------|----------------------|-------------------|------|
| CLIツール起動 | 13.388s | 0.201s | 66.6x |
| npm install | 〜5分 | 〜30秒 | 10x |
| git status | 〜3秒 | 〜0.1秒 | 30x |

## ベストプラクティス

### 1. 開発はLinux側で
```bash
# 推奨される開発場所
~/dev/my-project     # Good ✅
/mnt/c/Users/...     # Bad ❌
```

### 2. Windows側のファイルが必要な場合
```bash
# シンボリックリンクを使う
ln -s /mnt/c/Users/myname/important-file ~/important-file

# または必要な時だけコピー
cp /mnt/c/Users/myname/data.json ~/dev/project/
```

### 3. VSCodeの設定
```bash
# Linux側のプロジェクトを開く
code ~/dev/my-project

# Remote-WSL拡張機能を使用
```

### 4. Git設定
```bash
# Linux側でクローン
cd ~/dev
git clone git@github.com:user/repo.git

# Windows側のGit GUIを使いたい場合
# Linux側でコミット後、Windows側で確認
```

## その他の高速化テクニック

### 1. プロジェクト配置の最適化
```bash
# node_modulesが多いプロジェクトは特に効果大
~/dev/project/          # プロジェクト本体
~/dev/project/.cache/   # キャッシュもLinux側に
```

### 2. WSL2の設定調整（.wslconfig）
```ini
[wsl2]
memory=8GB
processors=4
```

### 3. Windows Defenderの除外設定
```powershell
# PowerShell（管理者）で実行
Add-MpPreference -ExclusionPath "\\wsl$\Ubuntu\home\username\dev"
```

## まとめ

WSL2は素晴らしいツールですが、ファイルシステムの境界を意識しないと大幅なパフォーマンス低下を招きます。

**覚えておくべきこと：**
- 開発は必ずLinux側（`/home/`以下）で行う
- `/mnt/c/`へのアクセスは最小限に
- 特にNode.jsプロジェクトは影響が大きい

この記事が同じ問題で悩んでいる方の助けになれば幸いです。

---

## 参考リンク
- [WSL2 File System Performance](https://docs.microsoft.com/en-us/windows/wsl/compare-versions)
- [WSL2 Best Practices](https://docs.microsoft.com/en-us/windows/wsl/best-practices)

## 環境
- Windows 11
- WSL2 (Ubuntu)
- Node.js v24.1.0
- TypeScript 5.3.3