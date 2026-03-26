/**
 * generate-docs.js
 *
 * Scans the agents/ and commands/ directories and prints a summary
 * of all agents and commands found. Useful for manually verifying
 * that AGENTS.md and CLAUDE.md are in sync with the actual files.
 *
 * Usage: node scripts/lib/generate-docs.js
 *
 * This script does NOT auto-modify any documentation files.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const AGENTS_DIR = path.join(ROOT, "agents");
const COMMANDS_DIR = path.join(ROOT, "commands");

/**
 * Read the first N lines of a file to extract a meaningful name or heading.
 */
function readFirstLines(filePath, count = 3) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return content.split("\n").slice(0, count);
  } catch {
    return [];
  }
}

/**
 * Extract agent name from the first 3 lines of a markdown file.
 * Looks for a markdown heading (# ...) first, then falls back to the filename.
 */
function extractAgentName(filePath) {
  const lines = readFirstLines(filePath, 3);
  for (const line of lines) {
    const match = line.match(/^#+\s+(.+)/);
    if (match) {
      return match[1].trim();
    }
  }
  // Fallback: derive name from filename (e.g. "research-agent.md" -> "Research Agent")
  const base = path.basename(filePath, ".md");
  return base
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Extract command name from the first 3 lines of a markdown file.
 */
function extractCommandName(filePath) {
  const lines = readFirstLines(filePath, 3);
  for (const line of lines) {
    const match = line.match(/^#+\s+(.+)/);
    if (match) {
      return match[1].trim();
    }
  }
  // Fallback: derive from filename (e.g. "create-issue.md" -> "/create-issue")
  const base = path.basename(filePath, ".md");
  return `/${base}`;
}

/**
 * List all .md files in a directory, sorted alphabetically.
 */
function listMarkdownFiles(dir) {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .sort();
  } catch {
    return [];
  }
}

function main() {
  // --- Agents ---
  const agentFiles = listMarkdownFiles(AGENTS_DIR);
  console.log("=== Agents ===");
  console.log(`Found ${agentFiles.length} agent file(s) in agents/\n`);

  for (const file of agentFiles) {
    const fullPath = path.join(AGENTS_DIR, file);
    const name = extractAgentName(fullPath);
    console.log(`  ${file.padEnd(35)} -> ${name}`);
  }

  console.log("");

  // --- Commands ---
  const commandFiles = listMarkdownFiles(COMMANDS_DIR);
  console.log("=== Commands ===");
  console.log(`Found ${commandFiles.length} command file(s) in commands/\n`);

  for (const file of commandFiles) {
    const fullPath = path.join(COMMANDS_DIR, file);
    const name = extractCommandName(fullPath);
    console.log(`  ${file.padEnd(35)} -> ${name}`);
  }

  console.log("");
  console.log(
    "Compare the above with AGENTS.md and CLAUDE.md to verify documentation is in sync."
  );
}

main();
