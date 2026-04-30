# Sub-agent prompts (T0)

Markdown system prompts for specialized research agents live here as **`*.md`** files (T1+).

- Lead agent system prompt: `src/lib/ai/run-chat.ts` (`LEAD_SYSTEM`).
- Execution tools load additional instructions from this folder when implemented (Reddit, web, app reviews, NLP).

Keep prompts versioned in git; avoid hiding critical instructions only in the database.
