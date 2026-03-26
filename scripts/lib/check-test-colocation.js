#!/usr/bin/env node

/**
 * check-test-colocation.js
 *
 * Checks that NEW .ts/.tsx files (staged but not yet tracked) under
 * apps/*/src/lib/ and apps/*/src/app/api/ have a corresponding .test.ts file.
 *
 * - Existing (already-tracked) files are grandfathered in.
 * - Only warns (exit 0) — does not block commits.
 *
 * Usage:
 *   node scripts/lib/check-test-colocation.js
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const WATCHED_PATTERNS = [
  /^apps\/[^/]+\/src\/lib\//,
  /^apps\/[^/]+\/src\/app\/api\//,
];

const SOURCE_EXT = /\.(ts|tsx)$/;
const EXCLUDED = /\.(test|spec|d)\.(ts|tsx)$/;

function main() {
  // Get staged files that are newly added (not previously tracked)
  let stagedNew = "";
  try {
    // "A" status = added (new file, not previously in index)
    stagedNew = execSync(
      'git diff --cached --name-only --diff-filter=A',
      { encoding: "utf-8" }
    ).trim();
  } catch {
    // Not in a git repo or no staged files — nothing to check
    process.exit(0);
  }

  if (!stagedNew) {
    process.exit(0);
  }

  const newFiles = stagedNew.split("\n").filter(Boolean);

  const missing = [];

  for (const file of newFiles) {
    // Must match a watched directory pattern
    if (!WATCHED_PATTERNS.some((p) => p.test(file))) continue;

    // Must be a source file
    if (!SOURCE_EXT.test(file)) continue;

    // Skip test/spec/declaration files themselves
    if (EXCLUDED.test(file)) continue;

    // Determine expected test file path
    const ext = path.extname(file); // .ts or .tsx
    const testFile = file.replace(new RegExp(`\\${ext}$`), `.test${ext}`);

    // Check if test file exists on disk OR is also staged
    const testExistsOnDisk = fs.existsSync(testFile);
    const testIsStaged = newFiles.includes(testFile);

    if (!testExistsOnDisk && !testIsStaged) {
      missing.push({ source: file, expected: testFile });
    }
  }

  if (missing.length > 0) {
    console.warn("\n⚠  Test colocation warning — new files missing tests:\n");
    for (const { source, expected } of missing) {
      console.warn(`   ${source}`);
      console.warn(`   → expected: ${expected}\n`);
    }
    console.warn(
      "   Tip: colocate a .test.ts file next to each new source file.\n"
    );
  }

  // Always exit 0 — this is advisory only
  process.exit(0);
}

main();
