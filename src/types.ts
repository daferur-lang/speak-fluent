export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2'

export const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2']

export interface SpeakingPrompt {
  id: string
  level: CEFRLevel
  situation: string
  targetSentence: string
  hint: string
}

export type WordMatch = 'correct' | 'missing' | 'extra'

export interface WordFeedback {
  word: string
  match: WordMatch
}

export interface TurnResult {
  promptId: string
  heard: string
  words: WordFeedback[]
  accuracy: number
}

export interface ConversationReply {
  aiText: string
  feedbackSummary: string
  nextPromptId: string | null
}

export const PASS_ACCURACY = 70

export interface ProgressState {
  unlockedLevel: CEFRLevel
  activeLevel: CEFRLevel
  bestAccuracyByPromptId: Record<string, number>
}
