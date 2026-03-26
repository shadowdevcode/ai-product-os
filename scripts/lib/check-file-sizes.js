#!/usr/bin/env node

/**
 * Pre-commit hook: Enforce file size limits on TypeScript files.
 * Only applies to .ts/.tsx files in apps/ and src/.
 * Markdown files (agents, commands, knowledge) are excluded.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  maxLines: 300,
  include: ['apps/', 'src/'],
  extensions: ['.ts', '.tsx'],
  exclude: ['node_modules/', '.next/', 'dist/', 'build/'],
};

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      encoding: 'utf8',
    });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function isIncluded(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!CONFIG.extensions.includes(ext)) return false;
  if (!CONFIG.include.some((dir) => filePath.startsWith(dir))) return false;
  if (CONFIG.exclude.some((dir) => filePath.includes(dir))) return false;
  return true;
}

function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

// Main
const files = getStagedFiles().filter(isIncluded);
const violations = [];

for (const file of files) {
  const lineCount = countLines(file);
  if (lineCount > CONFIG.maxLines) {
    violations.push({ file, lineCount });
  }
}

if (violations.length > 0) {
  console.error('\n📏 FILE SIZE CHECK FAILED\n');
  console.error(`The following files exceed the ${CONFIG.maxLines}-line limit:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}: ${v.lineCount} lines (limit: ${CONFIG.maxLines})`);
  }
  console.error('\nBreak large files into smaller, focused modules.');
  console.error('See .claude/rules/code-quality.md for guidance.\n');
  process.exit(1);
}

console.log('✓ File size check passed');
