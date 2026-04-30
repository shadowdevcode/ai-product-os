#!/usr/bin/env node

/**
 * Pre-commit hook: Scan staged files for secrets.
 * Catches API keys, tokens, passwords, and connection strings
 * that .gitignore might miss (e.g., hardcoded in source files).
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  patterns: [
    // Generic secrets
    { regex: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/gi, label: 'API key' },
    { regex: /(?:secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/gi, label: 'Secret/Token' },
    { regex: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/gi, label: 'Password' },

    // Supabase
    { regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+/g, label: 'Supabase JWT' },
    { regex: /sbp_[a-f0-9]{40}/g, label: 'Supabase service key' },

    // PostHog
    { regex: /phc_[A-Za-z0-9]{30,}/g, label: 'PostHog API key' },

    // Google / Gemini
    { regex: /AIza[A-Za-z0-9_\\-]{35}/g, label: 'Google API key' },

    // Neon DB
    { regex: /postgresql:\/\/[^:]+:[^@]+@[^/]+/g, label: 'Database connection string' },

    // Private keys
    { regex: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g, label: 'Private key' },

    // Generic high-entropy strings (base64, 40+ chars assigned to suspect vars)
    { regex: /(?:SUPABASE|POSTHOG|NEON|GEMINI|GOOGLE)[_A-Z]*\s*=\s*['"]?[A-Za-z0-9+/=_\-]{30,}['"]?/g, label: 'Environment variable with secret' },
  ],
  allowlistPaths: [
    '.env.example',
    '.env.local.example',
    'scripts/lib/check-secrets.js', // This file contains regex patterns, not real secrets
  ],
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

function checkFile(filePath) {
  const violations = [];

  if (CONFIG.allowlistPaths.some((allowed) => filePath.endsWith(allowed))) {
    return violations;
  }

  // Skip binary files
  const ext = path.extname(filePath).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
    return violations;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of CONFIG.patterns) {
        if (pattern.regex.test(line)) {
          violations.push({
            file: filePath,
            line: i + 1,
            label: pattern.label,
            snippet: line.trim().substring(0, 80),
          });
          // Reset regex lastIndex for global patterns
          pattern.regex.lastIndex = 0;
        }
      }
    }
  } catch {
    // Skip unreadable files
  }

  return violations;
}

// Main
const files = getStagedFiles();
const allViolations = [];

for (const file of files) {
  allViolations.push(...checkFile(file));
}

if (allViolations.length > 0) {
  console.error('\n🔐 SECRET SCANNING FAILED\n');
  console.error('The following staged files appear to contain secrets:\n');
  for (const v of allViolations) {
    console.error(`  ${v.file}:${v.line} — ${v.label}`);
    console.error(`    ${v.snippet}\n`);
  }
  console.error('Remove the secrets and use environment variables instead.');
  console.error('If this is a false positive, add the file to CONFIG.allowlistPaths in scripts/lib/check-secrets.js\n');
  process.exit(1);
}

console.log('✓ Secret scan passed');
