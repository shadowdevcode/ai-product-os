#!/usr/bin/env node

/**
 * Pre-commit hook: Scan staged TypeScript files for known anti-patterns.
 * Patterns are extracted from engineering-lessons.md postmortems.
 * Add new patterns as postmortems surface them (Boris: "3-4 repetitive review comments → lint rule").
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  include: ['apps/', 'src/'],
  extensions: ['.ts', '.tsx'],
  exclude: ['node_modules/', '.next/', 'dist/', 'build/', '.test.', '.spec.'],
};

const PATTERNS = [
  {
    // Fire-and-forget: async function call without await in route handler
    regex: /(?:sendNotification|fetch|posthog\.capture|supabase\.\w+)\s*\(/,
    antiPattern: (line, lines, idx) => {
      // Check if the line is inside an async function and lacks await
      const trimmed = line.trim();
      if (trimmed.startsWith('await ') || trimmed.startsWith('return ')) return false;
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return false;
      // Check if it's a fire-and-forget (no await on same line)
      return !line.includes('await') && !line.includes('Promise.');
    },
    label: 'Possible fire-and-forget async call (missing await)',
    severity: 'warning',
  },
  {
    // Missing .limit() on Supabase/Neon query chains
    regex: /\.from\s*\(['"][^'"]+['"]\)\s*\.select\s*\(/,
    antiPattern: (line, lines, idx) => {
      // Look ahead up to 5 lines for .limit()
      for (let i = idx; i < Math.min(idx + 5, lines.length); i++) {
        if (lines[i].includes('.limit(')) return false;
        if (lines[i].includes('.single(')) return false;
        if (lines[i].includes('.maybeSingle(')) return false;
        if (lines[i].includes('.eq(') && lines[i].includes('.single')) return false;
      }
      return true;
    },
    label: 'Database query missing .limit() — unbounded result set',
    severity: 'warning',
  },
  {
    // Naked JSON.parse without try/catch
    regex: /JSON\.parse\s*\(/,
    antiPattern: (line, lines, idx) => {
      // Check if we're inside a try block (look back up to 10 lines)
      for (let i = Math.max(0, idx - 10); i < idx; i++) {
        if (lines[i].includes('try {') || lines[i].includes('try{')) return false;
      }
      return true;
    },
    label: 'JSON.parse() without try/catch — will throw on malformed input',
    severity: 'warning',
  },
];

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
  if (CONFIG.exclude.some((pattern) => filePath.includes(pattern))) return false;
  return true;
}

function checkFile(filePath) {
  const warnings = [];

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of PATTERNS) {
        if (pattern.regex.test(line) && pattern.antiPattern(line, lines, i)) {
          warnings.push({
            file: filePath,
            line: i + 1,
            label: pattern.label,
            snippet: line.trim().substring(0, 80),
          });
        }
        // Reset regex lastIndex for global patterns
        pattern.regex.lastIndex = 0;
      }
    }
  } catch {
    // Skip unreadable files
  }

  return warnings;
}

// Main
const files = getStagedFiles().filter(isIncluded);
const allWarnings = [];

for (const file of files) {
  allWarnings.push(...checkFile(file));
}

if (allWarnings.length > 0) {
  console.warn('\n⚠️  ANTI-PATTERN CHECK — Review these warnings:\n');
  for (const w of allWarnings) {
    console.warn(`  ${w.file}:${w.line} — ${w.label}`);
    console.warn(`    ${w.snippet}\n`);
  }
  console.warn('These are warnings from production postmortems. Review before committing.');
  console.warn('See knowledge/engineering-lessons.md for context.\n');
  // Exit 0 (warning only, not blocking) — change to exit(1) to make blocking
  process.exit(0);
}

console.log('✓ Anti-pattern check passed');
