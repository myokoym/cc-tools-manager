#!/usr/bin/env node
/**
 * ccpm - Claude Code Package Manager
 * Main entry point for the application
 */

// 即座に進捗表示（最小限のインポート前に）
if (!process.argv.includes('--version') && !process.argv.includes('-V')) {
  process.stdout.write('Starting ccpm...\r');
}

import { cli } from './cli';

// Clear the progress message
if (!process.argv.includes('--version') && !process.argv.includes('-V')) {
  process.stdout.write('\x1b[2K\r'); // Clear line
}

// Parse CLI arguments and execute
cli.parse(process.argv);