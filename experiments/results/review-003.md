# Review Report: AI Personal Finance Advisor (Issue 003)

## Critical Issues

1. **Unawaited Promises in Serverless (Webhook)**: 
   In `src/app/api/webhook/whatsapp/route.ts`, the `sendWhatsAppMessage` function is called without `await`. While intended as "fire-and-forget", in serverless environments (like Vercel), background execution is suspended immediately once the HTTP response is returned. This means the WhatsApp reply will often be killed before sending.
   
2. **N+1 Query Problem (Weekly Summary)**:
   In `src/app/api/cron/weekly-summary/route.ts`, the code iterates over all users and performs a separate `await supabase.from('logs').select(...).eq('user_id', user.id)` for each user. This is an N+1 query vulnerability. For 100 users, this executes 101 sequential database queries, explicitly guaranteeing a Serverless timeout.

3. **Sequential API Calls (Weekly Summary)**:
   Inside the same `weekly-summary` loop, the WhatsApp messages are sent sequentially (`await sendWhatsAppMessage(...)`). This will cause the entire cron endpoint to take `N * API_latency` seconds, rapidly exceeding Vercel's execution limits.

## Architecture Violations
- None detected. The monolithic Next.js API route architecture matches the MVP specs. 

## Security Risks
- The `CRON_SECRET` and Meta webhook `VERIFY_TOKEN` validation are securely implemented.
- **Risk**: Missing RLS (Row Level Security) policies on the Supabase database. Although backend API routes use the `service_role` key (bypassing RLS), having no RLS leaves the database exposed if an `anon` key is ever leaked to a frontend client in the future.

## Performance Issues
- The `daily-nudge` route fetches all users into memory (`.select('*')`) and fires parallel Promises. If the user base exceeds a few hundred users, memory usage and rate limits on the Meta API will cause failures. Batching is needed for scalability, though acceptable for an initial 20-user MVP experiment.

## Code Quality Improvements
- **Regex limitations**: The regex `\d+` used in the webhook only pulls the *first* number in a text message. If a user writes "Lunch was 400 and coffee 100", it logs 400. This is an acceptable MVP limitation but should be documented.
- **Error Propagation**: Ensure database errors are fully logged with Context so debugging production webhooks is easier.

## Recommendation
**Request Changes**
The N+1 database queries and unawaited serverless promises must be fixed before proceeding to Peer Review.
