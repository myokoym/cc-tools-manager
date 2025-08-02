---
title: "Differences Between sh and bash Commands in WSL2"
date: 2025-08-02
author: myokoym
tags: [wsl2, shell, bash, linux]
category: technical
description: "Understanding the differences between sh and bash commands in WSL2 environments"
---

# Differences Between sh and bash Commands in WSL2

## TL;DR

- `sh` in WSL2 is often linked to `dash`, not `bash`
- `bash` supports more features like `&>` redirection
- Always use `bash` explicitly for bash scripts
- Check with `ls -la /bin/sh` to see what sh points to

## Introduction

When using WSL2, you might encounter unexpected behavior when running shell scripts with `sh` versus `bash`. This article explains the key differences and why they matter.

## Main Content

### What is sh in WSL2?

In WSL2 (Ubuntu-based distributions), `sh` is typically a symbolic link to `dash` (Debian Almquist Shell), not `bash`:

```bash
$ ls -la /bin/sh
lrwxrwxrwx 1 root root 4 Jan 1 2023 /bin/sh -> dash
```

### Key Differences

1. **Redirection operators**: `bash` supports `&>` while `dash` does not
2. **Arrays**: `bash` has full array support, `dash` has none
3. **String manipulation**: `bash` has extensive built-in string operations
4. **Command substitution**: Both support `$(...)`, but `bash` also supports `<(...)`

### Common Issues

The error you encountered with `install.sh`:

```bash
# This works in bash but not in dash:
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed"
fi
```

## Results/Findings

Always use `bash` explicitly when running bash scripts to avoid compatibility issues.

## Conclusion

In WSL2, never assume `sh` is `bash`. Always use the appropriate shell for your scripts.

### Recommended execution methods:

1. **Direct execution with shebang** (requires execute permission):
   ```bash
   chmod +x install.sh
   ./install.sh
   ```

2. **Explicit bash execution** (no permission change needed):
   ```bash
   bash install.sh
   ```

3. **Never use sh**:
   ```bash
   sh install.sh  # ❌ This will fail with dash-incompatible scripts
   ```

## References

- [Dash Shell Documentation](https://wiki.ubuntu.com/DashAsBinSh)
- [Bash Reference Manual](https://www.gnu.org/software/bash/manual/)