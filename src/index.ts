#!/usr/bin/env node
/**
 * cc-tools-manager - Claude Code Tools Manager
 * Main entry point for the application
 */

import { cli } from './cli';

// Parse CLI arguments and execute
cli.parse(process.argv);