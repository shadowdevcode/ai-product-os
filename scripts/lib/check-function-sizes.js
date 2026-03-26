#!/usr/bin/env node

/**
 * Pre-push hook: Enforce function size limits on TypeScript files.
 * Uses simple heuristic to detect function boundaries.
 * Only applies to .ts/.tsx files in apps/ and src/.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  maxLines: 50,
  include: ['apps/', 'src/'],
  extensions: ['.ts', '.tsx'],
  exclude: ['node_modules/', '.next/', 'dist/', 'build/', '.test.', '.spec.'],
};

// Patterns that start a function definition
const FUNCTION_START = /(?:export\s+)?(?:async\s+)?(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_$]\w*)\s*=>)/;

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      encoding: 'utf8',
    });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    // Fallback: check all tracked files in included dirs
    try {
      const output = execSync('git ls-files -- apps/ src/', { encoding: 'utf8' });
      return output.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }
}

function isIncluded(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!CONFIG.extensions.includes(ext)) return false;
  if (!CONFIG.include.some((dir) => filePath.startsWith(dir))) return false;
  if (CONFIG.exclude.some((pattern) => filePath.includes(pattern))) return false;
  return true;
}

function checkFunctions(filePath) {
  const violations = [];

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    let inFunction = false;
    let functionName = '';
    let functionStart = 0;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!inFunction) {
        const match = line.match(FUNCTION_START);
        if (match) {
          inFunction = true;
          functionName = match[0].substring(0, 60);
          functionStart = i + 1;
          braceDepth = 0;
        }
      }

      if (inFunction) {
        for (const ch of line) {
          if (ch === '{') braceDepth++;
          if (ch === '}') braceDepth--;
        }

        if (braceDepth <= 0 && i > functionStart - 1) {
          const length = i - functionStart + 1;
          if (length > CONFIG.maxLines) {
            violations.push({
              file: filePath,
              line: functionStart,
              name: functionName.trim(),
              length,
            });
          }
          inFunction = false;
        }
      }
    }
  } catch {
    // Skip unreadable files
  }

  return violations;
}

// Main
const files = getStagedFiles().filter(isIncluded);
const allViolations = [];

for (const file of files) {
  allViolations.push(...checkFunctions(file));
}

if (allViolations.length > 0) {
  console.error('\n📐 FUNCTION SIZE CHECK FAILED\n');
  console.error(`The following functions exceed the ${CONFIG.maxLines}-line limit:\n`);
  for (const v of allViolations) {
    console.error(`  ${v.file}:${v.line} — ${v.length} lines`);
    console.error(`    ${v.name}\n`);
  }
  console.error('Break large functions into smaller, single-concern functions.\n');
  process.exit(1);
}

console.log('✓ Function size check passed');
