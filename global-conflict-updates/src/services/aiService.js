const OpenAI = require('openai');

const SUMMARY_USER_PROMPT =
  'Summarize this news in 1-2 concise sentences. Focus on what happened and why it matters.';

/**
 * Returns a short summary or null on missing key / failure (caller should use description fallback).
 */
async function generateSummary(title, description) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const body = `${title || ''}\n\n${description || ''}`.trim().slice(0, 2000);
  if (!body) return null;

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You write clear, factual news summaries. No markdown or quotes.',
        },
        {
          role: 'user',
          content: `${SUMMARY_USER_PROMPT}\n\n---\n${body}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.25,
    });

    const text = completion.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  }
}

/**
 * One story-line from multiple headlines (event-level).
 */
async function generateEventSummary(titles) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const list = titles.filter(Boolean).slice(0, 15);
  if (!list.length) return null;

  const body = list.map((t, i) => `${i + 1}. ${String(t)}`).join('\n');

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You synthesize developing news into one clear paragraph. No markdown, bullets, or quotes.',
        },
        {
          role: 'user',
          content: `These headlines describe the same developing story. Write 2–3 concise sentences summarizing what is going on and why it matters.\n\n${body}`,
        },
      ],
      max_tokens: 280,
      temperature: 0.25,
    });

    const text = completion.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  }
}

module.exports = { generateSummary, generateEventSummary };
