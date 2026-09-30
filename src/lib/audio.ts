import { ANALYSIS_SAMPLE_RATE } from './pitch'

export function isRecordingSupported(): boolean {
  return typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && 'MediaRecorder' in window
}

export interface RecorderHandle {
  stop: () => Promise<Blob>
}

export async function startRecording(): Promise<RecorderHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  })
  const recorder = new MediaRecorder(stream)
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }
  recorder.start()

  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop())
          resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }))
        }
        recorder.stop()
      }),
  }
}

/** Decodes any audio (Blob or URL) to mono samples at the analysis rate; the browser does the resampling. */
export async function decodeToMono(source: Blob | string): Promise<Float32Array> {
  const data = typeof source === 'string' ? await (await fetch(source)).arrayBuffer() : await source.arrayBuffer()
  const context = new OfflineAudioContext(1, 1, ANALYSIS_SAMPLE_RATE)
  const buffer = await context.decodeAudioData(data)
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0)
  const mono = new Float32Array(buffer.length)
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const channel = buffer.getChannelData(c)
    for (let i = 0; i < mono.length; i++) mono[i] += channel[i] / buffer.numberOfChannels
  }
  return mono
}

let current: HTMLAudioElement | null = null

/** Plays one clip at a time; resolves when it ends (or is interrupted). */
export function playAudio(src: string | Blob, rate = 1): Promise<void> {
  stopAudio()
  const url = typeof src === 'string' ? src : URL.createObjectURL(src)
  const audio = new Audio(url)
  audio.playbackRate = rate
  audio.preservesPitch = true
  current = audio
  return new Promise((resolve) => {
    const done = () => {
      if (typeof src !== 'string') URL.revokeObjectURL(url)
      if (current === audio) current = null
      resolve()
    }
    audio.onended = done
    audio.onpause = done
    audio.onerror = done
    audio.play().catch(done)
  })
}

export function stopAudio(): void {
  if (current) {
    current.pause()
    current = null
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}
