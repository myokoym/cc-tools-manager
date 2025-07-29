# ブログ執筆ガイドライン

[English](README.md) | [日本語](README.ja.md)

このディレクトリにはcc-tools-managerプロジェクトに関連するブログ記事が含まれています。

## ブログ記事のフォーマット

すべてのブログ記事は、ファイルの先頭に以下の必須フィールドを含むYAMLフロントマターを記載する必要があります：

```yaml
---
title: "ブログ記事のタイトル"
date: YYYY-MM-DD
author: username
tags: [tag1, tag2, tag3]
category: category-name
lang: ja
---
```

### フロントマターフィールド

#### 必須フィールド
- **title**: ブログ記事のタイトル（文字列、特殊文字が含まれる場合は引用符を使用）
- **date**: 公開日（ISO形式：YYYY-MM-DD）
- **author**: 著者のユーザー名または名前
- **tags**: 関連タグの配列（小文字、ハイフン区切り）
- **category**: 記事のカテゴリー（単一）

#### オプションフィールド
- **lang**: 言語コード（日本語記事の場合は`ja`）
- **description**: 記事の簡潔な説明（SEO/プレビュー用）
- **updated**: 公開日と異なる場合の最終更新日

## ファイル命名規則

- 英語記事: `descriptive-slug.md`
- 日本語翻訳: `descriptive-slug.ja.md`
- 小文字、数字、ハイフンのみを使用

## カテゴリー

このプロジェクトの標準カテゴリー：
- `performance`: パフォーマンス最適化とベンチマーク
- `feature`: 新機能
- `tutorial`: ハウツーガイドとチュートリアル
- `development`: 開発のヒントとワークフロー
- `announcement`: プロジェクトのお知らせと更新

## タグ

このプロジェクトでよく使用されるタグ：
- `wsl2`: Windows Subsystem for Linux 2
- `nodejs`: Node.js関連
- `typescript`: TypeScript固有
- `performance`: パフォーマンス改善
- `cli`: コマンドラインインターフェース
- `installation`: セットアップとインストール
- `configuration`: 設定関連

## 言語サポート

- 主要言語: 英語（`.md`ファイル）
- 翻訳: `.md`の前に言語コードを追加（例：日本語の場合`.ja.md`）
- 両バージョンは同一のフロントマターを持つべき（`lang`フィールドを除く）

## ブログ記事の例

```markdown
---
title: "WSL2でのNode.jsパフォーマンス最適化"
date: 2025-07-30
author: myokoym
tags: [wsl2, nodejs, performance, optimization]
category: performance
lang: ja
description: "WSL2環境でNode.jsのパフォーマンスを改善する方法"
---

# WSL2でのNode.jsパフォーマンス最適化

ここに内容を記述...
```

## 執筆のヒント

1. 実用的な例とコードスニペットを含める
2. 関連する場合はパフォーマンスメトリクスとベンチマークを追加
3. 明確な見出しと小見出しを使用
4. 長い記事にはTL;DRセクションを含める
5. 関連リソースへの参照とリンクを追加
6. 技術的な正確性を保ちながら読みやすさを維持