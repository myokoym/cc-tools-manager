# Bulk Translation of Git Commit Messages Using git filter-branch

## The Problem

While working on an open-source project, I realized that several of my commit messages were in Japanese. For better international collaboration, all commit messages should be in English. I had about 10 commits that needed translation:

```bash
$ git log --oneline -10
55e6ceb fix: ディレクトリを含むタイプベースリポジトリのデプロイエラーを修正
c4f9724 fix: タイプベースリポジトリのデプロイメント問題を修正
622f580 docs: flexible-deployment-patternsのタスク完了状態を更新
...
```

## The Solution: git filter-branch with Python

Instead of manually rebasing and editing each commit, I used `git filter-branch` with a Python script to automate the translation process.

### Step 1: Create a Translation Script

First, I created a Python script that maps Japanese messages to English:

```python
#!/usr/bin/env python3
import sys

# Mapping of Japanese messages to English
translations = {
    "docs: セッション履歴に2025-07-31の作業内容を追加": 
        "docs: add session history for 2025-07-31 work",
    "feat: タイプ指定によるリポジトリ登録とデプロイメント機能の実装": 
        "feat: implement repository registration and deployment with type specification",
    "fix: ディレクトリを含むタイプベースリポジトリのデプロイエラーを修正": 
        "fix: fix deployment errors for type-based repositories with directories",
    # ... more translations
}

# Read the commit message from stdin
message = sys.stdin.read()

# Split into subject and body
lines = message.split('\n')
subject = lines[0] if lines else ""
body = '\n'.join(lines[1:]) if len(lines) > 1 else ""

# Translate the subject if it's in Japanese
if subject in translations:
    subject = translations[subject]

# Reconstruct the message
if body.strip():
    print(subject + '\n' + body)
else:
    print(subject)
```

### Step 2: Apply the Filter

Then, I used `git filter-branch` to apply this script to all commits:

```bash
# Save the script
cat > /tmp/translate_commits.py << 'EOF'
# ... script content ...
EOF

# Make it executable
chmod +x /tmp/translate_commits.py

# Apply to all commits since origin/main
git filter-branch -f --msg-filter 'python3 /tmp/translate_commits.py' origin/main..HEAD
```

### Step 3: Verify Results

After running the command:

```bash
$ git log --oneline -10
65b9862 feat: improve file filtering for type-based deployment
edf6924 fix: fix deployment errors for type-based repositories with directories
a9771d8 fix: fix type-based repository deployment issues
0a8b387 docs: update task completion status for flexible-deployment-patterns
...
```

Success! All Japanese commit messages were translated to English.

## Why git filter-branch?

### Advantages:
1. **Batch Processing**: Translates all commits in one command
2. **Preserves History**: Maintains commit dates, authors, and structure
3. **Scriptable**: Can handle complex transformations
4. **No Manual Interaction**: Unlike `git rebase -i`, doesn't require manual editing

### Alternatives Considered:

**git rebase -i**:
- Requires manual editing of each commit
- Interactive process can't be easily automated
- Time-consuming for many commits

**git commit --amend**:
- Only works for the most recent commit
- Would require checking out each commit individually

## Important Considerations

### 1. History Rewriting
This changes commit hashes, so:
- Don't do this on shared branches
- Force push will be required: `git push --force`
- Collaborators need to be notified

### 2. Create Backups
Always create a backup branch before rewriting history:
```bash
git branch backup-before-translation
```

### 3. git filter-repo Alternative
Git now recommends `git filter-repo` over `filter-branch`:
```bash
# Install git-filter-repo
pip install git-filter-repo

# Use with a similar approach
git filter-repo --message-callback '
    # Translation logic here
'
```

## Complete Workflow

Here's the complete workflow I used:

```bash
# 1. Check current state
git log --oneline origin/main..HEAD

# 2. Create backup
git branch backup-japanese-commits

# 3. Create translation script
cat > /tmp/translate_commits.py << 'EOF'
#!/usr/bin/env python3
import sys

translations = {
    # Add your translations here
}

message = sys.stdin.read()
lines = message.split('\n')
subject = lines[0] if lines else ""
body = '\n'.join(lines[1:]) if len(lines) > 1 else ""

if subject in translations:
    subject = translations[subject]

if body.strip():
    print(subject + '\n' + body)
else:
    print(subject)
EOF

# 4. Make executable
chmod +x /tmp/translate_commits.py

# 5. Apply filter
git filter-branch -f --msg-filter 'python3 /tmp/translate_commits.py' origin/main..HEAD

# 6. Verify results
git log --oneline origin/main..HEAD

# 7. Clean up
rm /tmp/translate_commits.py
```

## Lessons Learned

1. **Commit in English**: Always use English for open-source projects
2. **Automate Repetitive Tasks**: Scripts save time and reduce errors
3. **Git is Powerful**: Tools like filter-branch enable complex history modifications
4. **Test First**: Always test on a backup branch before applying to main

## Bonus: Preventing Future Issues

Add a commit-msg hook to enforce English:

```bash
#!/bin/bash
# .git/hooks/commit-msg

# Simple check for common Japanese characters
if grep -qE '[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]' "$1"; then
    echo "Error: Commit message contains Japanese characters."
    echo "Please use English for commit messages."
    exit 1
fi
```

## Conclusion

Using `git filter-branch` with a custom script, I successfully translated all Japanese commit messages to English in one operation. This approach is much more efficient than manual editing and can be adapted for various commit message transformations.

Remember: with great power comes great responsibility. Always backup your work before rewriting git history!