import { useCallback, useEffect, useRef, useState } from 'react'
import { promptsByLevel } from '../data/prompts'
import { getConversationTurn } from '../lib/gemini'
import { scorePronunciation } from '../lib/pronunciation'
import { isSpeechRecognitionSupported, listenOnce, speak } from '../lib/speech'
import { PASS_ACCURACY } from '../types'
import type { CEFRLevel, SpeakingPrompt, WordFeedback } from '../types'

export type ConversationStatus = 'idle' | 'listening' | 'scoring' | 'ai-thinking' | 'ai-speaking' | 'error'

export interface TurnHistoryEntry {
  situation: string
  target: string
  heard: string
  accuracy: number
  words: WordFeedback[]
  aiReply: string
  feedback: string
}

function pickPrompt(
  level: CEFRLevel,
  bestAccuracyByPromptId: Record<string, number>,
  avoidId?: string,
): SpeakingPrompt {
  const prompts = promptsByLevel[level]
  const unsolved = prompts.filter((p) => (bestAccuracyByPromptId[p.id] ?? 0) < PASS_ACCURACY)
  const pool = unsolved.length > 0 ? unsolved : prompts
  const candidates = pool.length > 1 ? pool.filter((p) => p.id !== avoidId) : pool
  return candidates[Math.floor(Math.random() * candidates.length)]
}

interface UseConversationArgs {
  activeLevel: CEFRLevel
  bestAccuracyByPromptId: Record<string, number>
  onResult: (promptId: string, level: CEFRLevel, accuracy: number) => void
}

export function useConversation({ activeLevel, bestAccuracyByPromptId, onResult }: UseConversationArgs) {
  const [currentPrompt, setCurrentPrompt] = useState<SpeakingPrompt>(() =>
    pickPrompt(activeLevel, bestAccuracyByPromptId),
  )
  const [status, setStatus] = useState<ConversationStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [history, setHistory] = useState<TurnHistoryEntry[]>([])
  const stopRef = useRef<() => void>(() => {})
  const bestAccuracyRef = useRef(bestAccuracyByPromptId)

  useEffect(() => {
    bestAccuracyRef.current = bestAccuracyByPromptId
  }, [bestAccuracyByPromptId])

  useEffect(() => {
    setCurrentPrompt(pickPrompt(activeLevel, bestAccuracyRef.current))
  }, [activeLevel])

  const supported = isSpeechRecognitionSupported()

  const startTurn = useCallback(() => {
    if (!supported) {
      setStatus('error')
      setErrorMessage('unsupported-browser')
      return
    }
    setErrorMessage(null)
    setStatus('listening')

    const handle = listenOnce(
      async (transcript) => {
        setStatus('scoring')
        const { words, accuracy } = scorePronunciation(currentPrompt.targetSentence, transcript)
        onResult(currentPrompt.id, currentPrompt.level, accuracy)

        setStatus('ai-thinking')
        try {
          const { aiReply, feedback } = await getConversationTurn({
            level: currentPrompt.level,
            situation: currentPrompt.situation,
            targetSentence: currentPrompt.targetSentence,
            heardText: transcript,
            accuracy,
          })

          setHistory((prev) => [
            ...prev,
            {
              situation: currentPrompt.situation,
              target: currentPrompt.targetSentence,
              heard: transcript,
              accuracy,
              words,
              aiReply,
              feedback,
            },
          ])

          setStatus('ai-speaking')
          speak(aiReply, () => {
            setStatus('idle')
            setCurrentPrompt(pickPrompt(activeLevel, bestAccuracyRef.current, currentPrompt.id))
          })
        } catch (error) {
          console.error('[conversation] la IA no respondió:', (error as Error).message)
          // The pronunciation result is computed locally: keep the turn instead of losing it.
          setHistory((prev) => [
            ...prev,
            {
              situation: currentPrompt.situation,
              target: currentPrompt.targetSentence,
              heard: transcript,
              accuracy,
              words,
              aiReply: '',
              feedback: 'Tu compañero de IA no ha respondido esta vez, pero tu pronunciación sí cuenta. Sigue con la siguiente.',
            },
          ])
          setStatus('idle')
          setCurrentPrompt(pickPrompt(activeLevel, bestAccuracyRef.current, currentPrompt.id))
        }
      },
      (error) => {
        setStatus('error')
        setErrorMessage(error)
      },
    )

    stopRef.current = handle.stop
  }, [currentPrompt, supported, activeLevel, onResult])

  const stopTurn = useCallback(() => {
    stopRef.current()
    setStatus('idle')
  }, [])

  return { currentPrompt, status, errorMessage, history, startTurn, stopTurn, supported }
}
