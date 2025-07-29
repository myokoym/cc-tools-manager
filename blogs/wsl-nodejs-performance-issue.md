# Solving Node.js CLI Tool Performance Issues in WSL2: From 13s to 0.2s

## TL;DR

Encountered an issue where a Node.js CLI tool was abnormally slow (13 seconds) in WSL2. The cause: **developing on Windows filesystem (`/mnt/c/`)**. Moving to Linux filesystem resulted in **65x speedup** (0.2 seconds).

**Lesson learned: Always develop on the Linux side (`/home/` and below) when using WSL2!**

## The Problem: Unexpectedly Slow CLI Tool

I encountered an issue where my TypeScript-based CLI tool (cc-tools-manager) had abnormally slow startup times.

```bash
# Just a simple list command...
% time cc-tools-manager list
# ... output ...
cc-tools-manager list  0.50s user 0.46s system 7% cpu 13.388 total
```

**13 seconds!** That's absurdly long just to display a repository list.

## The Wild Goose Chase

Initially, I suspected the following:

### 1. Heavy imports?
```typescript
// Maybe initializing logger, config manager, and services?
import { logger } from './utils/logger';
import { ConfigurationManager } from './core/ConfigurationManager';
```

→ **Implemented lazy initialization** → No effect

### 2. Log file creation?
```typescript
// Was creating log directory on startup
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}
```

→ **Changed to lazy creation** → No effect

### 3. Dynamic imports
```typescript
// Load commands only when used
.action(async (...args) => {
  const { listCommand } = await import('./commands');
  // ...
});
```

→ **No effect**

## The Real Culprit: Filesystem Location

After extensive debugging, I found that Node.js internal processing time was normal:

```javascript
// Debug code
console.time('Total');
const { RegistryService } = require('./dist/core/RegistryService');
const service = new RegistryService();
await service.list();
console.timeEnd('Total');
// => Total: 212ms
```

Internal processing took 0.2 seconds, but the `time` command reported 13 seconds...

Then I noticed:

```bash
% pwd
/mnt/c/Users/myoko/Documents/dev/claude/cc-tools-manager
```

**I was developing on the Windows filesystem!**

## The Solution: Move to Linux Side

```bash
# Copy project to Linux side
cp -r /mnt/c/Users/myoko/Documents/dev/claude/cc-tools-manager ~/dev/

# Run from Linux side
cd ~/dev/cc-tools-manager
time node dist/index.js list
# => 0.02s user 0.01s system 20% cpu 0.201 total
```

**13s → 0.2s (65x speedup!)**

## Why Is It So Slow?

It's due to WSL2's architecture:

### WSL2 Filesystem Structure
- **Linux side (`/home/`, etc.)**: ext4 filesystem, native speed
- **Windows side (`/mnt/c/`)**: Accessed via 9P protocol, significant overhead

### Particularly Slow Operations
1. **Multiple file accesses**: Node.js `require` reads many files
2. **Directory traversal**: Searching through `node_modules`
3. **Metadata retrieval**: `stat` system calls

## Performance Comparison

| Operation | Windows side (`/mnt/c/`) | Linux side (`/home/`) | Ratio |
|-----------|--------------------------|----------------------|-------|
| CLI tool startup | 13.388s | 0.201s | 66.6x |
| npm install | ~5 min | ~30 sec | 10x |
| git status | ~3 sec | ~0.1 sec | 30x |

## Best Practices

### 1. Develop on Linux Side
```bash
# Recommended development location
~/dev/my-project     # Good ✅
/mnt/c/Users/...     # Bad ❌
```

### 2. When You Need Windows Files
```bash
# Use symbolic links
ln -s /mnt/c/Users/myname/important-file ~/important-file

# Or copy when needed
cp /mnt/c/Users/myname/data.json ~/dev/project/
```

### 3. VSCode Setup
```bash
# Open Linux-side projects
code ~/dev/my-project

# Use Remote-WSL extension
```

### 4. Git Configuration
```bash
# Clone on Linux side
cd ~/dev
git clone git@github.com:user/repo.git

# If you want to use Windows Git GUI
# Commit on Linux side, review on Windows side
```

## Additional Optimization Techniques

### 1. Optimize Project Placement
```bash
# Especially effective for projects with many node_modules
~/dev/project/          # Project itself
~/dev/project/.cache/   # Keep cache on Linux side too
```

### 2. Adjust WSL2 Settings (.wslconfig)
```ini
[wsl2]
memory=8GB
processors=4
```

### 3. Windows Defender Exclusions
```powershell
# Run in PowerShell (Administrator)
Add-MpPreference -ExclusionPath "\\wsl$\Ubuntu\home\username\dev"
```

## Conclusion

WSL2 is an excellent tool, but failing to consider filesystem boundaries can lead to significant performance degradation.

**Remember:**
- Always develop on the Linux side (`/home/` and below)
- Minimize access to `/mnt/c/`
- Node.js projects are particularly affected

I hope this article helps others facing the same issue.

---

## References
- [WSL2 File System Performance](https://docs.microsoft.com/en-us/windows/wsl/compare-versions)
- [WSL2 Best Practices](https://docs.microsoft.com/en-us/windows/wsl/best-practices)

## Environment
- Windows 11
- WSL2 (Ubuntu)
- Node.js v24.1.0
- TypeScript 5.3.3