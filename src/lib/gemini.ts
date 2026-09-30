import type { CEFRLevel } from '../types'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const ATTEMPT_TIMEOUT_MS = 12_000

/**
 * Tried in order. 3.5 Flash-Lite answers in ~1-3 s but only accepts
 * `thinkingLevel`; 3.1 Flash-Lite is the fallback when the first is
 * overloaded (it spikes to 20+ s and fails intermittently on the free tier).
 */
export const ATTEMPTS = [
  { model: 'gemini-3.5-flash-lite', thinkingConfig: { thinkingLevel: 'minimal' } },
  { model: 'gemini-3.5-flash-lite', thinkingConfig: { thinkingLevel: 'minimal' } },
  { model: 'gemini-3.1-flash-lite', thinkingConfig: { thinkingBudget: 0 } },
] as const

export class GeminiError extends Error {
  readonly status: number | null
  constructor(message: string, status: number | null = null) {
    super(message)
    this.status = status
  }
}

/** Overload, quota, timeout and network drops are worth another try; bad requests are not. */
export function isRetryable(error: unknown): boolean {
  if (!(error instanceof GeminiError)) return true
  return error.status === null || error.status === 429 || error.status >= 500
}

export interface ConversationTurnRequest {
  level: CEFRLevel
  situation: string
  targetSentence: string
  heardText: string
  accuracy: number
}

export interface ConversationTurnResponse {
  aiReply: string
  feedback: string
}

const LEVEL_PERSONA: Record<CEFRLevel, string> = {
  A1: 'a beginner (A1) student. Use very simple present-tense vocabulary and short sentences. Be extra patient and encouraging.',
  A2: 'an elementary (A2) student. Use everyday vocabulary and simple past/future forms. Be encouraging, and gently point out one clear mistake if there is one.',
  B1: 'an intermediate (B1) student. Use natural, slightly richer vocabulary and normal conversational pace. Give more specific, constructive feedback, including grammar.',
  B2: 'an upper-intermediate (B2) student. Reply the way a native speaker would in a real conversation, with natural idioms and connectors. Feedback can be nuanced and cover fluency, not just correctness.',
}

function buildPrompt({ level, situation, targetSentence, heardText, accuracy }: ConversationTurnRequest): string {
  return `You are a friendly English speaking coach for ${LEVEL_PERSONA[level]}
Situation: ${situation}
Target sentence the student was asked to say: "${targetSentence}"
What the student actually said (from speech recognition): "${heardText}"
Word match accuracy: ${accuracy}%

Reply with two short parts, separated by "|||":
1. A natural, in-character response to continue the conversation, matching the vocabulary and complexity level described above (max 2 short sentences).
2. One short, specific, encouraging feedback tip in Spanish about their pronunciation/word choice attempt (max 1 sentence, no jargon).

Format exactly as: <english reply>|||<spanish feedback>`
}

async function callModel(attempt: (typeof ATTEMPTS)[number], prompt: string, fetchImpl: typeof fetch): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS)
  try {
    const response = await fetchImpl(`${BASE_URL}/${attempt.model}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { thinkingConfig: attempt.thinkingConfig },
      }),
    })
    if (!response.ok) throw new GeminiError(`gemini-request-failed-${response.status}`, response.status)
    const data = await response.json()
    const parts: { text?: string; thought?: boolean }[] = data?.candidates?.[0]?.content?.parts ?? []
    const text = parts
      .filter((p) => !p.thought && p.text)
      .map((p) => p.text)
      .join('')
      .trim()
    if (!text) throw new GeminiError('gemini-empty-response', 500)
    return text
  } catch (error) {
    if (error instanceof GeminiError) throw error
    throw new GeminiError(controller.signal.aborted ? 'gemini-timeout' : 'gemini-network-error')
  } finally {
    clearTimeout(timer)
  }
}

/** Runs the attempt chain; exported with injectable fetch/sleep for tests. */
export async function generateText(
  prompt: string,
  fetchImpl: typeof fetch = fetch,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<string> {
  let lastError: unknown = null
  for (let i = 0; i < ATTEMPTS.length; i++) {
    const attempt = ATTEMPTS[i]
    // A non-retryable error (e.g. 400/404) means this model won't work: skip its retries.
    if (i > 0 && attempt.model === ATTEMPTS[i - 1].model && !isRetryable(lastError)) continue
    try {
      return await callModel(attempt, prompt, fetchImpl)
    } catch (error) {
      lastError = error
      console.warn(`[gemini] ${attempt.model} falló:`, (error as Error).message)
      if (i < ATTEMPTS.length - 1) await sleep(600)
    }
  }
  throw lastError
}

export async function getConversationTurn(request: ConversationTurnRequest): Promise<ConversationTurnResponse> {
  if (!API_KEY) {
    throw new Error('missing-api-key')
  }

  const text = await generateText(buildPrompt(request))

  const [aiReply, feedback] = text.split('|||').map((part: string) => part.trim())
  return {
    aiReply: aiReply || "Good try! Let's continue.",
    feedback: feedback || 'Sigue practicando, vas por buen camino.',
  }
}
