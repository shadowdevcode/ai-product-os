import { GoogleGenAI, Type } from "@google/genai";

export interface GeminiProposal {
  pricing: {
    monthly_price_inr: number;
    price_range_label: string;
    estimated_monthly_savings_inr: number;
    roi_points: string[];
  };
  email_pitch: string;
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    pricing: {
      type: Type.OBJECT,
      properties: {
        monthly_price_inr: { type: Type.NUMBER },
        price_range_label: { type: Type.STRING },
        estimated_monthly_savings_inr: { type: Type.NUMBER },
        roi_points: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: [
        "monthly_price_inr",
        "price_range_label",
        "estimated_monthly_savings_inr",
        "roi_points",
      ],
    },
    email_pitch: { type: Type.STRING },
  },
  required: ["pricing", "email_pitch"],
};

function buildPrompt(features: string[]): string {
  const featureList = features.map((f) => `- ${f}`).join("\n");
  return `You are a B2B SaaS pricing and sales expert specialising in Indian SMB buyers.

A PM has assembled the following product bundle for an Indian SMB prospect:
${featureList}

Generate a value-based pricing proposal with the following requirements:

PRICING:
- monthly_price_inr: a single recommended monthly price (integer, in ₹999–₹9,999 range)
- price_range_label: a readable label like "₹2,499 – ₹3,499/month" (±20% around the recommended price)
- estimated_monthly_savings_inr: realistic monthly savings the buyer will achieve (integer, in INR)
- roi_points: EXACTLY 3 bullet points referencing Indian SMB operational savings
  - Each bullet references time saved in hours/week, CA fees avoided in INR, or staff efficiency gains
  - Be specific and numeric (e.g., "Saves 6 hours/week on manual invoicing")

EMAIL PITCH:
- email_pitch: a warm, direct outreach email of 140–160 words
  - Open with "Hi [First Name]," — never "Dear Sir/Madam"
  - Relationship-first, operational tone — explain the immediate value to their business
  - Reference 2–3 of the selected features by name
  - Close with a clear, low-pressure CTA (e.g., "Happy to do a quick 15-minute walkthrough")
  - No hallucinated company names or personal details
  - No corporate boilerplate`;
}

const GEMINI_TIMEOUT_MS = 9_000;

export async function generateProposal(
  features: string[]
): Promise<GeminiProposal> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const ai = new GoogleGenAI({ apiKey });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("GEMINI_TIMEOUT")), GEMINI_TIMEOUT_MS)
  );

  const response = await Promise.race([
    ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: buildPrompt(features),
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
    timeoutPromise,
  ]);

  const rawText = response.text ?? "";

  // Strip markdown codeblocks in case the model wraps output despite JSON mode
  const cleanText = rawText
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  let parsed: GeminiProposal;
  try {
    parsed = JSON.parse(cleanText) as GeminiProposal;
  } catch (e) {
    console.error("Gemini JSON parse failed:", cleanText, e);
    throw new Error("Failed to parse Gemini response");
  }

  if (
    !parsed.pricing ||
    typeof parsed.pricing.monthly_price_inr !== "number" ||
    !Array.isArray(parsed.pricing.roi_points) ||
    typeof parsed.email_pitch !== "string"
  ) {
    console.error("Gemini response missing required fields:", parsed);
    throw new Error("Gemini response has missing required fields");
  }

  if (
    parsed.pricing.monthly_price_inr < 500 ||
    parsed.pricing.monthly_price_inr > 15000
  ) {
    console.warn(
      "Gemini returned out-of-range price:",
      parsed.pricing.monthly_price_inr
    );
    // Clamp rather than fail — a clamped proposal is more useful than an error
    parsed.pricing.monthly_price_inr = Math.min(
      Math.max(parsed.pricing.monthly_price_inr, 999),
      9999
    );
  }

  return parsed;
}
