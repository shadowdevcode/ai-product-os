# Code Review: Project Clarity MVP

## Critical Issues
None. The code successfully implements the happy path.

## Architecture Violations
- **Missing Row Level Security (RLS)**: `schema.sql` explicitly disables RLS for MVP. While understandable for speed, any production application needs RLS, especially for a personal task manager. Acceptable for this specific MVP stage but must be noted.
- **Missing Auth:** The frontend does not currently pass user tokens to the backend or use Supabase Auth on the client side. The `tasks` table has no `user_id` enforced. 

## Security Risks
- **No Rate Limiting / Spam Protection:** The `POST /api/tasks` endpoint calls the Gemini API directly from user input. A malicious user could spam the endpoint and rack up Gemini API charges.
- **No Input Length Validation:** A user could send a 10MB string as `taskText`, potentially crashing the server or hitting Gemini payload limits. 

## Performance Issues
- **Unbounded GET Query:** The `GET /api/tasks` endpoint fetches *all* tasks ever created without pagination or limiting (e.g., `LIMIT 50`). This will degrade performance as the user adds more tasks.
- **Synchronous AI Calling:** The user has to wait for Gemini to process the text before the UI updates. While Gemini Flash is fast, a queue or immediate optimistic UI rendering with a "Categorizing..." state would be better.

## Code Quality Improvements
- **Missing Error UI:** In `TaskBoard.tsx`, if the `fetch('/api/tasks', { method: 'POST' })` fails, the error is logged to the console, and the input string is quietly discarded. The user is left confused. The input should be restored to the state, and a toast/error message shown.

## Recommendation

**Request Changes**

Before proceeding to Peer Review and Deployment, the following changes *must* be implemented:
1. Enforce a max length on the `taskText` input (e.g., 500 characters) in the API route.
2. Add a `LIMIT 100` to the `GET /api/tasks` endpoint to prevent unbounded queries.
3. Improve error handling in `TaskBoard.tsx` to handle API failures gracefully (restore input text and show an alert).
