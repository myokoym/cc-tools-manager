---
title: "CC Tools Managerのインストール・アンインストールコマンドの実装"
date: 2025-08-02
author: myokoym
tags: [cli, tooling, command-implementation, simplification]
category: development
lang: ja
description: "install/uninstallコマンドの実装と、複雑さよりシンプルさの価値を学んだ話"
---

# CC Tools Managerのインストール・アンインストールコマンドの実装

## TL;DR

CC Tools Managerにinstall/uninstall/unregisterコマンドを実装しました。最初は過度に複雑な解決策を作ってしまいましたが、ユーザーフィードバックにより既存パターンに従うシンプルな実装に改善しました。過剰設計を避ける貴重な教訓となりました。

## はじめに

CC Tools Managerでは、リポジトリ登録とファイルデプロイメントをより良く分離する必要がありました。この記事では、実装の過程とシンプルさの重要性について学んだ教訓を記録します。

## 本文

### セクション1：要件分析

最初の要件は2つの関心事を分離することでした：
- リポジトリ登録（利用可能なリポジトリの追跡）
- ファイルデプロイメント（`.claude`ディレクトリへのファイルコピー）

これにより新しいコマンド構造が生まれました：
- `register`/`unregister` - リポジトリレジストリの管理
- `install`/`uninstall` - ファイルのデプロイ/削除
- `update` - 変更の取得（`--install`フラグで拡張）

```bash
# リポジトリを登録（ファイルはデプロイしない）
ccpm register myrepo https://github.com/user/repo

# 登録済みリポジトリからファイルをデプロイ
ccpm install myrepo

# デプロイされたファイルを削除（登録は維持）
ccpm uninstall myrepo

# レジストリからリポジトリを削除
ccpm unregister myrepo
```

### セクション2：過剰設計の罠

最初は複雑なアーキテクチャを作成してしまいました：

```typescript
// v2フォーマットでの複雑な状態管理
export interface StateFileV2 {
  version: number;
  repositories: Repository[];
  deploymentStates: { [repositoryId: string]: DeploymentState };
  installationHistory: InstallationRecord[];
  metadata: {
    lastUpdated: string;
    lastMigration: string | null;
  };
}

// キャッシング、マイグレーションなどを含む拡張状態マネージャー
class EnhancedStateManager extends StateManager {
  private stateCache: StateFileV2 | null = null;
  private cacheTimestamp: number = 0;
  // ... 400行以上の複雑なロジック
}
```

これには以下が含まれていました：
- 状態フォーマットのマイグレーション（v1からv2へ）
- 複雑なエラーリカバリー戦略
- 履歴付きデプロイメント追跡
- 多層キャッシング
- 45以上のユニットテスト

### セクション3：シンプル化

ユーザーフィードバックは直接的で価値がありました：
> うーん、なんか無駄に複雑なことやってない？updateとおなじことをすればいいだけのはずなんだけど

これが完全な書き直しにつながりました：

```typescript
// 既存パターンに従うシンプルな実装
export class InstallCommand {
  async execute(query?: string, options: InstallOptions = {}): Promise<void> {
    const state = await this.stateManager.loadState();
    const repo = this.findRepository(state, query);
    
    // 既存のDeploymentServiceを使用するだけ
    await this.deploymentService.deployFiles(repo, targetDir);
    
    console.log('✓ Installation complete');
  }
}
```

最終的な実装：
- 4,835行の複雑なコードを削除
- 既存パターンに従う253行のみを追加
- すべての機能を維持
- 理解とメンテナンスがはるかに容易

## 結果/発見

シンプル化された解決策は完璧に動作します：
- コマンドは既存パターンと一貫性がある
- コードは保守可能で明確
- 複雑な状態マイグレーションは不要
- テストは簡潔
- ユーザー体験は変わらない

車輪の再発明ではなく、実証済みの既存コンポーネントを使用しているため、パフォーマンスと信頼性は優れています。

## まとめ

この実装は貴重な教訓を教えてくれました：**シンプルに始め、既存パターンに従い、必要性が証明された時のみ複雑さを追加する**。ユーザーのフィードバックにより、メンテナンスが困難な過剰設計のソリューションを出荷することを防げました。

主要なポイント：
1. 既存のコードが問題を解決できるか常に検討する
2. ユーザーフィードバックは非常に貴重 - 注意深く聞く
3. 複雑な解決策が常により良い解決策とは限らない
4. 確立されたパターンに従うことで保守性が向上する

最終的な実装はクリーンでシンプルで効果的です - まさに良いソフトウェアがあるべき姿です。

## 参考資料

- [CC Tools Managerリポジトリ](https://github.com/myokoym/cc-tools-manager)
- [Kiro仕様駆動開発](../.kiro/specs/install-uninstall-commands/)
- [元の実装PR](https://github.com/myokoym/cc-tools-manager/pull/X)