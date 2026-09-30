import type { CEFRLevel } from '../types'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = 'gemini-3.1-flash-lite'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`

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

export async function getConversationTurn(request: ConversationTurnRequest): Promise<ConversationTurnResponse> {
  if (!API_KEY) {
    throw new Error('missing-api-key')
  }

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(request) }] }],
      generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
    }),
  })

  if (!response.ok) {
    throw new Error(`gemini-request-failed-${response.status}`)
  }

  const data = await response.json()
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('gemini-empty-response')
  }

  const [aiReply, feedback] = text.split('|||').map((part: string) => part.trim())
  return {
    aiReply: aiReply || "Good try! Let's continue.",
    feedback: feedback || 'Sigue practicando, vas por buen camino.',
  }
}
