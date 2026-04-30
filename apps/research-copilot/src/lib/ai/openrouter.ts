import { createOpenAI } from '@ai-sdk/openai';

export function getOpenRouterProvider() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set.');
  }
  const baseURL =
    process.env.OPENROUTER_BASE_URL?.replace(/\/$/, '') ?? 'https://openrouter.ai/api/v1';
  return createOpenAI({
    baseURL,
    apiKey,
    headers: process.env.OPENROUTER_HTTP_REFERRER
      ? { Referer: process.env.OPENROUTER_HTTP_REFERRER }
      : undefined,
  });
}

export function getLeadModel() {
  const openrouter = getOpenRouterProvider();
  const modelId = process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini';
  return openrouter(modelId);
}
