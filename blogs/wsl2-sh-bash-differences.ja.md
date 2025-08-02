---
title: "WSL2におけるshとbashコマンドの違い"
date: 2025-08-02
author: myokoym
tags: [wsl2, shell, bash, linux]
category: technical
lang: ja
description: "WSL2環境でのshとbashコマンドの違いを理解する"
---

# WSL2におけるshとbashコマンドの違い

## TL;DR

- WSL2の`sh`は多くの場合`bash`ではなく`dash`にリンクされている
- `bash`は`&>`リダイレクトなどより多くの機能をサポート
- bashスクリプトには常に明示的に`bash`を使用する
- `ls -la /bin/sh`でshが何を指しているか確認できる

## はじめに

WSL2を使用していると、`sh`と`bash`でシェルスクリプトを実行した際に予期しない動作に遭遇することがあります。この記事では、その主な違いとなぜそれが重要なのかを説明します。

## 本文

### WSL2でのshとは？

WSL2（Ubuntuベースのディストリビューション）では、`sh`は通常`bash`ではなく`dash`（Debian Almquist Shell）へのシンボリックリンクです：

```bash
$ ls -la /bin/sh
lrwxrwxrwx 1 root root 4 Jan 1 2023 /bin/sh -> dash
```

### 主な違い

1. **リダイレクト演算子**: `bash`は`&>`をサポートするが、`dash`はサポートしない
2. **配列**: `bash`は完全な配列サポートがあるが、`dash`にはない
3. **文字列操作**: `bash`には豊富な組み込み文字列操作機能がある
4. **コマンド置換**: 両方とも`$(...)`をサポートするが、`bash`は`<(...)`もサポート

### よくある問題

`install.sh`で遭遇したエラー：

```bash
# これはbashでは動作するがdashでは動作しない：
if ! command -v node &> /dev/null; then
    echo "Node.jsがインストールされていません"
fi
```

## 結果/発見

互換性の問題を避けるため、bashスクリプトを実行する際は常に明示的に`bash`を使用してください。

## まとめ

WSL2では、`sh`が`bash`であると仮定してはいけません。スクリプトには常に適切なシェルを使用してください。

## 参考資料

- [Dashシェルドキュメント](https://wiki.ubuntu.com/DashAsBinSh)
- [Bashリファレンスマニュアル](https://www.gnu.org/software/bash/manual/)