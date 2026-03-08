import { GoogleGenerativeAI } from '@google/generative-ai';
import { EmailSummary } from './gmail';

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
    if (!_genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('Missing GEMINI_API_KEY environment variable');
        }
        _genAI = new GoogleGenerativeAI(apiKey);
    }
    return _genAI;
}

export interface DigestResult {
    summaryText: string;
    priorityBreakdown: {
        urgent: number;
        important: number;
        fyi: number;
    };
}

/**
 * Generate an AI-powered digest from a batch of emails
 */
export async function summarizeEmails(emails: EmailSummary[]): Promise<DigestResult> {
    if (emails.length === 0) {
        return {
            summaryText: '✅ No new unread emails. Enjoy your inbox zero!',
            priorityBreakdown: { urgent: 0, important: 0, fyi: 0 },
        };
    }

    const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });

    const emailList = emails
        .map(
            (e, i) =>
                `Email ${i + 1}:\nFrom: ${e.from}\nSubject: ${e.subject}\nSnippet: ${e.snippet}\nContent: ${e.body || 'N/A'}\nDate: ${e.date}`
        )
        .join('\n\n');

    const prompt = `You are an email digest assistant. Analyze these ${emails.length} unread emails and create a prioritized summary for WhatsApp delivery.

EMAILS:
${emailList}

INSTRUCTIONS:
1. Classify each email as one of:
   🔴 Urgent — requires immediate action (deadlines, payments, critical requests)
   🟡 Important — should read today (meetings, updates from key people)
   🟢 FYI — informational, can wait (newsletters, notifications, promotions)

2. Format the output EXACTLY as a WhatsApp-friendly message:
   - Start with a header line: "📬 *Email Digest* — {count} new emails"
   - Group by priority (🔴 first, then 🟡, then 🟢)
   - For each email: "• *{Sender Name}*: {1-line summary}"
   - Keep each summary under 100 characters
   - End with a footer: "—\n⚙️ Manage settings: {settings_url}"

3. At the END only, add a JSON line on its own line:
   PRIORITY_JSON:{"urgent":N,"important":N,"fyi":N}

Keep the total message under 1500 characters (WhatsApp limit).`;

    let text = '';
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await model.generateContent(prompt);
            text = result.response.text();
            break; // Success, exit retry loop
        } catch (error) {
            console.error(`Gemini API error (attempt ${attempt}/${maxRetries}):`, error);
            if (attempt === maxRetries) {
                throw new Error('Failed to summarize emails after multiple API attempts.');
            }
            // Exponential backoff: 1s, then 2s
            await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
    }

    // Parse priority breakdown from the JSON line
    let priorityBreakdown = { urgent: 0, important: 0, fyi: 0 };
    const jsonMatch = text.match(/PRIORITY_JSON:({.*})/);
    if (jsonMatch) {
        try {
            priorityBreakdown = JSON.parse(jsonMatch[1]);
        } catch {
            // Fall back to defaults if parsing fails
        }
    }

    // Remove the JSON line from the summary text
    const summaryText = text
        .replace(/PRIORITY_JSON:{.*}/, '')
        .replace(/\{settings_url\}/g, `${process.env.NEXT_PUBLIC_APP_URL}/settings`)
        .trim();

    return { summaryText, priorityBreakdown };
}
