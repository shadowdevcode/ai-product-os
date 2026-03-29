#!/usr/bin/env node

/**
 * Pre-commit hook: Auto-generate the anti-patterns section in CLAUDE.md
 * from knowledge/engineering-lessons.md.
 *
 * Looks for <!-- AUTO: anti-patterns --> markers in CLAUDE.md and replaces
 * the content between them with the 10 most recent lessons extracted
 * from engineering-lessons.md.
 *
 * Source: Harness Engineering auto-markers pattern.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const CLAUDE_MD = path.join(ROOT, 'CLAUDE.md');
const LESSONS_FILE = path.join(ROOT, 'knowledge/engineering-lessons.md');

function extractRules(content) {
  const rules = [];
  const ruleRegex = /rule:\s*(.+)/gi;
  let match;

  while ((match = ruleRegex.exec(content)) !== null) {
    const rule = match[1].trim();
    if (rule && rule.length > 10) {
      rules.push(rule);
    }
  }

  // Return the 10 most recent (last 10 in the file, which are newest)
  return rules.slice(-10).reverse();
}

function generateAntiPatterns(rules) {
  if (rules.length === 0) return null;

  const lines = ['## Key Anti-Patterns (From Production Postmortems)', ''];
  rules.forEach((rule, i) => {
    lines.push(`${i + 1}. ${rule}`);
  });

  return lines.join('\n');
}

// Main
try {
  const claudeMd = fs.readFileSync(CLAUDE_MD, 'utf8');
  const lessons = fs.readFileSync(LESSONS_FILE, 'utf8');

  const rules = extractRules(lessons);
  if (rules.length === 0) {
    console.log('✓ Auto-markers: No rules extracted, skipping');
    process.exit(0);
  }

  const newSection = generateAntiPatterns(rules);
  const markerStart = '<!-- AUTO: anti-patterns -->';
  const markerEnd = '<!-- /AUTO: anti-patterns -->';

  if (!claudeMd.includes(markerStart) || !claudeMd.includes(markerEnd)) {
    console.log('✓ Auto-markers: No markers found in CLAUDE.md, skipping');
    process.exit(0);
  }

  const startIdx = claudeMd.indexOf(markerStart);
  const endIdx = claudeMd.indexOf(markerEnd) + markerEnd.length;

  const updated =
    claudeMd.substring(0, startIdx) +
    markerStart +
    '\n' +
    newSection +
    '\n' +
    markerEnd +
    claudeMd.substring(endIdx);

  if (updated !== claudeMd) {
    fs.writeFileSync(CLAUDE_MD, updated, 'utf8');
    console.log('✓ Auto-markers: Updated anti-patterns section in CLAUDE.md');
  } else {
    console.log('✓ Auto-markers: No changes needed');
  }
} catch (err) {
  // Don't block commits on auto-marker failures
  console.warn(`⚠ Auto-markers: ${err.message}`);
  process.exit(0);
}
