#!/usr/bin/env node

/**
 * Claude Code hook (PreToolUse): Block writes to apps/ when pipeline is blocked.
 * Reads project-state.md and checks if status is 'blocked'.
 * Prevents accidental work when a quality gate has failed.
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.resolve(__dirname, '../../project-state.md');

function getStatus() {
  try {
    const content = fs.readFileSync(STATE_FILE, 'utf8');
    const statusMatch = content.match(/status:\s*(\S+)/);
    const stageMatch = content.match(/stage:\s*(\S+)/);
    return {
      status: statusMatch ? statusMatch[1] : 'unknown',
      stage: stageMatch ? stageMatch[1] : 'unknown',
    };
  } catch {
    return { status: 'unknown', stage: 'unknown' };
  }
}

// Read the file path from stdin (Claude Code passes tool input via stdin)
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const toolInput = JSON.parse(input);
    const filePath = toolInput.file_path || '';

    // Only block writes to apps/ directory
    if (!filePath.includes('/apps/')) {
      process.exit(0);
    }

    const { status, stage } = getStatus();

    if (status === 'blocked') {
      console.error(`\n🚫 QUALITY GATE BLOCKED\n`);
      console.error(`Pipeline status is "blocked" at stage: ${stage}`);
      console.error(`Cannot write to apps/ until the blocker is resolved.`);
      console.error(`Check project-state.md for details and re-run the failed command.\n`);
      process.exit(1);
    }

    process.exit(0);
  } catch {
    // If we can't parse input, allow the write (don't block on hook errors)
    process.exit(0);
  }
});
