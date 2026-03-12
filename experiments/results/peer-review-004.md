# Peer Review: Project Clarity MVP

## Architecture Concerns
- **Tightly Coupled AI Processing:** The frontend immediately waits for the Next.js API route to call the Gemini API, wait for a response, parse it, and write to Supabase before returning. If Gemini is slow (even the Flash model), the UI hangs. This synchronous API boundary is fragile.
- **Bypassing RLS:** The lack of Row Level Security in the `tasks` schema means anyone with the `ANON_KEY` can read or write to the database. Given `ANON_KEY` is public in Next.js by design, this is a significant security/architecture flaw even for an MVP.

## Scalability Risks
- **Supabase Connections:** Every incoming `POST /tasks` request opens a connection to Supabase to insert data. While Supabase handles connection pooling, sudden bursts of brain-dumps could exhaust serverless function limits.
- **Payload Limits:** Even with a 500-character limit, bulk processing or batching is impossible. If a PM wants to categorize 10 thoughts at once, they make 10 separate Gemini network calls.

## Edge Cases
- **Gemini Timeout / Interruption:** If the Vercel serverless function times out before Gemini responds, the user receives a 504 Gateway Timeout. The frontend will fail, and the thought is lost unless the frontend successfully restored text on error (which was mitigated in Code Review, but still a bad UX).
- **Invalid JSON from Gemini:** Even with Structured Outputs, Gemini occasionally hallucinates markdown wrappers (`````json ... `````). `JSON.parse` will throw an error, causing the task save to fail entirely.

## Reliability Risks
- **Single Point of Failure (SPOF):** The system relies 100% on Gemini. If the Google GenAI API goes down, the product is completely unusable. There is no fallback logic (e.g., saving as "Uncategorized" so the user doesn't lose their thought).
- **Optimistic UI De-sync:** If a user marks a task "done" on the frontend, there is *no* backend implementation to persist this state. `TaskBoard.tsx` removes it visually, but reloading the page brings it back. This destroys trust.

## Product Alignment Issues
- **Missing State Persistence:** A To-Do list that doesn't save when tasks are completed fundamentally fails as a product. The MVP scope omitted the `PUT /api/tasks/[id]` endpoint, leaving the core loop broken.

## Recommendations

The following MUST-FIX items are required before proceeding:

1. **Implement `PUT /api/tasks/[id]`:** Add an endpoint to actually update the `status` of a task to 'done' in Supabase, and wire `TaskBoard.tsx` to call it.
2. **Safe JSON Parsing:** Use a regex or string replacement to strip Markdown codeblocks from the Gemini response before calling `JSON.parse()`.
3. **Fallback State:** If Gemini fails or times out, save the task to Supabase anyway with a default category (e.g., `ops`) and `priority` (`medium`) and append "[Manual Review Required]" to the title, so data is never lost.

**Recommendation: Request Changes**
