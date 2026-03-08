# Peer Review Report: AI Personal Finance Advisor (Issue 003)

## Architecture Concerns
- **Tightly Coupled Cron & Sending**: Currently, the `/api/cron/` endpoints fetch all users and fire `Promise.allSettled()` to send out messages simultaneously. This works for an MVP of 20 users, but if scaled, this "Thundering Herd" will violate Meta's API rate limits and trigger Vercel memory exhaustion/timeout. A dedicated queue worker (like Upstash Qstash or Inngest) is required for real scale.

## Scalability Risks
- Sending thousands of simultaneous API calls without jitter or batching is highly fragile.

## Edge Cases
- **Non-Text Messages**: Users often send images of receipts or voice notes. The current webhook only processes `message.type === 'text'`. If an image is sent, the bot silently ignores it, providing zero feedback to the user and breaking trust.
- **Zero-Spend Feedback Loop**: If a user triumphantly texts "I spent 0 on non-essentials today!" the regex won't securely capture the 0, or the `if (amount > 0)` check will pass over it, hitting the fallback `I didn't catch an amount`. This is an actively hostile UX behavior that severely misaligns with the product goal of building positive financial habits. 

## Reliability Risks
- **No Webhook Retries/Idempotency**: If Supabase has a blip during an incoming message, the Next.js API returns a `500`. Meta *may* retry, but we have no deduplication keys on the `logs` table, potentially leading to double-logging if Meta retries successfully.

## Product Alignment Issues
- The MVP requires the bot to act as a supportive accountability partner. The failure to handle "0 spend" enthusiastically hurts the core behavioral psychology of the product.

## Recommendations
**Request Minor MVP Fixes**

While the scaling concerns (Thundering herd, queues) are **not necessary** to fix for a 20-user MVP, the user-facing edge cases must be handled:
1. **Must Fix**: Add a fallback response in the webhook for `message.type !== 'text'` explaining the bot only understands text right now.
2. **Must Fix**: Specifically handle `amount === 0` internally to praise the user for saving money, rather than hitting the generic error fallback.

Once these two UX issues are fixed, the MVP is approved for launch/QA!
