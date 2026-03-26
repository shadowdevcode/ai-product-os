#!/usr/bin/env node

/**
 * Pre-push hook: Validate that AGENTS.md references all agent files
 * and CLAUDE.md repository structure is not stale.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function getFilesInDir(dir) {
  try {
    return fs
      .readdirSync(path.join(ROOT, dir))
      .filter((f) => f.endsWith('.md'))
      .sort();
  } catch {
    return [];
  }
}

function checkAgentsIndex() {
  const agentFiles = getFilesInDir('agents');
  const agentsmdPath = path.join(ROOT, 'AGENTS.md');
  const violations = [];

  if (!fs.existsSync(agentsmdPath)) {
    violations.push('AGENTS.md does not exist');
    return violations;
  }

  const agentsmd = fs.readFileSync(agentsmdPath, 'utf8');

  for (const file of agentFiles) {
    if (!agentsmd.includes(file)) {
      violations.push(`Agent file "${file}" is not referenced in AGENTS.md`);
    }
  }

  return violations;
}

function checkCommandsIndex() {
  const commandFiles = getFilesInDir('commands');
  const claudemdPath = path.join(ROOT, 'CLAUDE.md');
  const violations = [];

  if (!fs.existsSync(claudemdPath)) {
    violations.push('CLAUDE.md does not exist');
    return violations;
  }

  const claudemd = fs.readFileSync(claudemdPath, 'utf8');

  for (const file of commandFiles) {
    const commandName = file.replace('.md', '');
    // Check that the command is referenced (as /command-name or command-name.md)
    if (!claudemd.includes(`/${commandName}`) && !claudemd.includes(file)) {
      violations.push(`Command "${commandName}" is not referenced in CLAUDE.md`);
    }
  }

  return violations;
}

// Main
const agentViolations = checkAgentsIndex();
const commandViolations = checkCommandsIndex();
const allViolations = [...agentViolations, ...commandViolations];

if (allViolations.length > 0) {
  console.error('\n📄 DOCUMENTATION VALIDATION FAILED\n');
  console.error('The following documentation gaps were found:\n');
  for (const v of allViolations) {
    console.error(`  - ${v}`);
  }
  console.error('\nUpdate AGENTS.md and/or CLAUDE.md to include all agents and commands.\n');
  process.exit(1);
}

console.log('✓ Documentation validation passed');
