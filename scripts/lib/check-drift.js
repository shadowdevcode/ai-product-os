import fs from 'fs';
import path from 'path';

// Minimal drift checker: ensures all files in commands/ exist in .claude/commands/
const srcDir = 'commands';
const destDir = '.claude/commands';

if (!fs.existsSync(srcDir) || !fs.existsSync(destDir)) {
  console.error('Error: commands/ or .claude/commands/ directory not found.');
  process.exit(1);
}

const srcFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.md'));
let driftFound = false;

for (const file of srcFiles) {
  if (!fs.existsSync(path.join(destDir, file))) {
    console.error(`DRIFT ERROR: ${file} exists in ${srcDir} but not in ${destDir}`);
    driftFound = true;
  }
}

if (driftFound) {
  process.exit(1);
} else {
  console.log('✓ No instruction drift detected.');
}
