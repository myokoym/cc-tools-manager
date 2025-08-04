#!/bin/bash

echo "📋 ドキュメント同期チェック中..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if all commands in src/commands have documentation
echo "1. コマンドファイルとドキュメントの対応をチェック..."

# Get all command files (excluding index.ts)
commands=$(ls src/commands/*.ts 2>/dev/null | grep -v index.ts | sed 's/src\/commands\///g' | sed 's/\.ts$//g' | sort)

# Check each command has a section in docs/commands.md
missing_docs=""
for cmd in $commands; do
  if ! grep -q "^### $cmd$" docs/commands.md; then
    missing_docs="$missing_docs $cmd"
  fi
done

if [ -n "$missing_docs" ]; then
  echo -e "${RED}❌ 以下のコマンドのドキュメントがありません:${NC}"
  echo "$missing_docs"
else
  echo -e "${GREEN}✅ すべてのコマンドがドキュメント化されています${NC}"
fi

echo ""
echo "2. README.md とdocs/commands.md の整合性をチェック..."

# Check if command tables are different
readme_table=$(grep -A 10 "^| Command |" README.md | grep "^|" | sort)
docs_table=$(grep -A 10 "^| Command |" docs/commands.md | grep "^|" | sort)

if [ "$readme_table" != "$docs_table" ]; then
  echo -e "${YELLOW}⚠️  コマンド比較テーブルが異なります${NC}"
  echo "   README.md と docs/commands.md で内容が一致していません"
else
  echo -e "${GREEN}✅ コマンド比較テーブルが一致しています${NC}"
fi

echo ""
echo "3. README.md と README.ja.md の整合性をチェック..."

# Check if command tables in README.md and README.ja.md match (structure-wise)
# README.md のテーブル行数をカウント (Command ヘッダー)
readme_en_table=$(grep -A 10 "^| Command |" README.md | grep "^|" | grep -v "^|--" | wc -l | tr -d ' ')
# README.ja.md のテーブル行数をカウント (コマンド ヘッダー)
readme_ja_table=$(grep -A 10 "^| コマンド |" README.ja.md | grep "^|" | grep -v "^|--" | wc -l | tr -d ' ')

if [ "$readme_en_table" != "$readme_ja_table" ]; then
  echo -e "${YELLOW}⚠️  README.md と README.ja.md のコマンド比較テーブルの行数が異なります${NC}"
  echo "   README.md: $readme_en_table 行, README.ja.md: $readme_ja_table 行"
else
  echo -e "${GREEN}✅ README.md と README.ja.md のコマンド比較テーブルの行数が一致しています${NC}"
fi

echo ""
echo "4. 最近の更新をチェック..."

# Show recent modifications
echo "最近更新されたコマンドファイル:"
git log --oneline -n 5 --name-only -- src/commands/ | grep "src/commands/" | sort | uniq

echo ""
echo "最近更新されたドキュメント:"
git log --oneline -n 5 --name-only -- docs/commands.md README.md README.ja.md | grep -E "(docs/commands.md|README.md|README.ja.md)" | sort | uniq

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "チェック完了！"