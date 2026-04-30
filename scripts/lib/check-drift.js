import fs from 'fs';
import path from 'path';

// Drift checker: ensures commands/ and .claude/commands/ are in sync
const srcDir = 'commands';
const destDir = '.claude/commands';

if (!fs.existsSync(srcDir) || !fs.existsSync(destDir)) {
  console.error('Error: commands/ or .claude/commands/ directory not found.');
  process.exit(1);
}

const srcFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.md'));
const destFiles = fs.readdirSync(destDir).filter(f => f.endsWith('.md'));

let driftFound = false;

// Check src -> dest
for (const file of srcFiles) {
  if (!fs.existsSync(path.join(destDir, file))) {
    console.error(`DRIFT ERROR: ${file} exists in ${srcDir} but not in ${destDir}`);
    driftFound = true;
  }
}

// Check dest -> src
for (const file of destFiles) {
  if (!fs.existsSync(path.join(srcDir, file))) {
    console.error(`DRIFT ERROR: ${file} exists in ${destDir} but not in ${srcDir}`);
    driftFound = true;
  }
}

if (driftFound) {
  process.exit(1);
} else {
  console.log('✓ No instruction drift detected.');
}
