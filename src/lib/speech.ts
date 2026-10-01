export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function getRecognitionCtor() {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition
}

export interface RecognitionHandle {
  stop: () => void
}

export function listenOnce(
  onResult: (transcript: string) => void,
  onError: (message: string) => void,
): RecognitionHandle {
  const Ctor = getRecognitionCtor()
  if (!Ctor) {
    onError('speech-recognition-unsupported')
    return { stop: () => {} }
  }

  const recognition = new Ctor()
  recognition.lang = 'en-US'
  recognition.continuous = false
  recognition.interimResults = false
  recognition.maxAlternatives = 1

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript
    onResult(transcript.trim())
  }
  recognition.onerror = (event) => {
    onError(event.error)
  }

  recognition.start()
  return { stop: () => recognition.stop() }
}

export function speak(text: string, onEnd?: () => void, lang: 'en-US' | 'en-GB' = 'en-US', rate = 0.95): void {
  if (!isSpeechSynthesisSupported()) {
    onEnd?.()
    return
  }
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = rate
  if (onEnd) utterance.onend = onEnd
  window.speechSynthesis.speak(utterance)
}

export interface LongListenHandle {
  /** Stops listening and resolves with everything recognised so far. */
  stop: () => Promise<string>
}

/**
 * Continuous recognition for reading a whole paragraph aloud. Chrome ends the
 * session on its own after pauses, so it is restarted until stop() is called.
 */
export function listenLong(onError: (message: string) => void): LongListenHandle {
  const Ctor = getRecognitionCtor()
  if (!Ctor) {
    onError('speech-recognition-unsupported')
    return { stop: async () => '' }
  }

  const finals: string[] = []
  let stopped = false
  let resolveEnd: (() => void) | null = null
  const recognition = new Ctor()
  recognition.lang = 'en-US'
  recognition.continuous = true
  recognition.interimResults = false

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) finals.push(event.results[i][0].transcript)
  }
  // These won't fix themselves by restarting (no permission, mic busy, no network).
  let fatal = false
  recognition.onerror = (event) => {
    if (event.error === 'no-speech' || event.error === 'aborted') return
    fatal = true
    onError(event.error)
  }
  recognition.onend = () => {
    if (stopped) resolveEnd?.()
    else if (!fatal) recognition.start()
  }
  recognition.start()

  return {
    stop: () =>
      new Promise<string>((resolve) => {
        stopped = true
        let settled = false
        resolveEnd = () => {
          if (settled) return
          settled = true
          resolve(finals.join(' ').trim())
        }
        recognition.stop()
        setTimeout(() => resolveEnd?.(), 2000)
      }),
  }
}
