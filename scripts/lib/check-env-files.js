#!/usr/bin/env node

/**
 * Pre-commit hook: Prevent .env.local files from being committed.
 * Belt-and-suspenders check alongside .gitignore.
 */

const { execSync } = require('child_process');

const CONFIG = {
  blockedPatterns: ['.env.local', '.env.development', '.env.production', '.env.staging'],
  allowedPatterns: ['.env.example', '.env.local.example'],
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

// Main
const files = getStagedFiles();
const violations = [];

for (const file of files) {
  const basename = file.split('/').pop();

  // Allow example files
  if (CONFIG.allowedPatterns.some((p) => basename.endsWith(p))) continue;

  // Block env files
  if (CONFIG.blockedPatterns.some((p) => basename === p || basename.endsWith(p))) {
    violations.push(file);
  }
}

if (violations.length > 0) {
  console.error('\n🔒 ENV FILE CHECK FAILED\n');
  console.error('The following environment files should NOT be committed:\n');
  for (const v of violations) {
    console.error(`  ${v}`);
  }
  console.error('\nUse .env.local.example for templates. Actual env files must stay local.\n');
  process.exit(1);
}

console.log('✓ Env file check passed');
