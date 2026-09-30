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

export function speak(text: string, onEnd?: () => void): void {
  if (!isSpeechSynthesisSupported()) {
    onEnd?.()
    return
  }
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.95
  if (onEnd) utterance.onend = onEnd
  window.speechSynthesis.speak(utterance)
}
