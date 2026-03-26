/**
 * check-drift.js
 *
 * Pre-push drift detection script.
 * Warns when agent, command, or knowledge files change without updating
 * the corresponding documentation files (AGENTS.md, CLAUDE.md).
 *
 * This is advisory only -- it always exits 0 so it never blocks a push.
 */

const { execSync } = require("child_process");

const PREFIX = "\x1b[33m[drift-check]\x1b[0m"; // yellow prefix

/**
 * Get the list of files changed in the commits being pushed.
 * Falls back to HEAD~1 diff if there are no cached changes.
 */
function getChangedFiles() {
  // In a pre-push hook context, we compare what is about to be pushed.
  // Try the staged diff first; if empty, compare against the previous commit.
  let files = "";
  try {
    files = execSync("git diff --cached --name-only", { encoding: "utf-8" });
  } catch {
    // ignore
  }

  if (!files.trim()) {
    try {
      files = execSync("git diff HEAD~1 --name-only", { encoding: "utf-8" });
    } catch {
      // Might fail on initial commit -- nothing to check.
      return [];
    }
  }

  return files
    .trim()
    .split("\n")
    .filter(Boolean);
}

function main() {
  const changed = getChangedFiles();

  if (changed.length === 0) {
    return; // nothing changed, nothing to warn about
  }

  const hasAgentChange = changed.some((f) => f.startsWith("agents/"));
  const hasCommandChange = changed.some((f) => f.startsWith("commands/"));
  const hasKnowledgeChange = changed.some((f) => f.startsWith("knowledge/"));
  const hasAgentsMd = changed.includes("AGENTS.md");
  const hasClaudeMd = changed.includes("CLAUDE.md");

  let driftDetected = false;

  // Rule 1: agents/ changed but AGENTS.md was not updated
  if (hasAgentChange && !hasAgentsMd) {
    driftDetected = true;
    console.warn(
      `${PREFIX} Files in agents/ were modified but AGENTS.md was not updated.`
    );
  }

  // Rule 2: commands/ changed but CLAUDE.md was not updated
  if (hasCommandChange && !hasClaudeMd) {
    driftDetected = true;
    console.warn(
      `${PREFIX} Files in commands/ were modified but CLAUDE.md was not updated.`
    );
  }

  // Rule 3: knowledge/ changed but CLAUDE.md was not updated
  if (hasKnowledgeChange && !hasClaudeMd) {
    driftDetected = true;
    console.warn(
      `${PREFIX} Files in knowledge/ were modified but CLAUDE.md was not updated.`
    );
  }

  if (driftDetected) {
    console.warn(
      `${PREFIX} Consider updating documentation to stay in sync. (This is a warning only.)`
    );
  }

  // Always exit successfully -- this check is advisory, not blocking.
  process.exit(0);
}

main();
