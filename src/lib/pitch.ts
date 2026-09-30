/**
 * Intonation analysis for shadowing: extracts a pitch contour (Hz per ~10 ms
 * frame) with a normalized-autocorrelation detector, then converts it to
 * semitones relative to the speaker's own median so a deep and a high voice
 * can be compared by melody shape rather than absolute pitch.
 */

export const ANALYSIS_SAMPLE_RATE = 16000
const FRAME_SIZE = 1024
const HOP_SIZE = 160
const MIN_HZ = 70
const MAX_HZ = 450
const SILENCE_RMS = 0.01
const MIN_CLARITY = 0.6

export type Contour = (number | null)[]

export function detectPitch(frame: Float32Array, sampleRate: number): number | null {
  const n = frame.length
  let energy = 0
  for (let i = 0; i < n; i++) energy += frame[i] * frame[i]
  if (Math.sqrt(energy / n) < SILENCE_RMS) return null

  const minLag = Math.floor(sampleRate / MAX_HZ)
  const maxLag = Math.min(Math.ceil(sampleRate / MIN_HZ), n - 1)
  const nsdf = new Float32Array(maxLag + 2)
  let globalMax = 0

  for (let lag = minLag; lag <= maxLag + 1 && lag < n; lag++) {
    let acf = 0
    let norm = 0
    for (let i = 0; i < n - lag; i++) {
      acf += frame[i] * frame[i + lag]
      norm += frame[i] * frame[i] + frame[i + lag] * frame[i + lag]
    }
    nsdf[lag] = norm > 0 ? (2 * acf) / norm : 0
    if (lag <= maxLag && nsdf[lag] > globalMax) globalMax = nsdf[lag]
  }
  if (globalMax < MIN_CLARITY) return null

  // Smallest lag that is a local peak close to the global max: avoids picking
  // a multiple of the true period (octave-down errors).
  for (let lag = minLag + 1; lag <= maxLag; lag++) {
    const isPeak = nsdf[lag] >= nsdf[lag - 1] && nsdf[lag] >= nsdf[lag + 1]
    if (isPeak && nsdf[lag] >= 0.9 * globalMax) {
      const a = nsdf[lag - 1]
      const b = nsdf[lag]
      const c = nsdf[lag + 1]
      const denom = a - 2 * b + c
      const shift = denom !== 0 ? (0.5 * (a - c)) / denom : 0
      return sampleRate / (lag + shift)
    }
  }
  return null
}

export function pitchContour(samples: Float32Array, sampleRate = ANALYSIS_SAMPLE_RATE): Contour {
  const contour: Contour = []
  for (let start = 0; start + FRAME_SIZE <= samples.length; start += HOP_SIZE) {
    contour.push(detectPitch(samples.subarray(start, start + FRAME_SIZE), sampleRate))
  }
  return contour
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Hz → semitones relative to the median voiced pitch; outliers beyond an octave become gaps. */
export function toSemitones(contour: Contour): Contour {
  const voiced = contour.filter((v): v is number => v !== null)
  if (voiced.length === 0) return contour.map(() => null)
  const ref = median(voiced)
  return contour.map((hz) => {
    if (hz === null) return null
    const st = 12 * Math.log2(hz / ref)
    return Math.abs(st) > 12 ? null : st
  })
}

/** Drops leading/trailing unvoiced frames so both curves start and end with the speech. */
export function trimUnvoiced(contour: Contour): Contour {
  let start = 0
  let end = contour.length
  while (start < end && contour[start] === null) start++
  while (end > start && contour[end - 1] === null) end--
  return contour.slice(start, end)
}

/** Median filter (window 5) that ignores gaps; removes isolated detection spikes. */
export function smooth(contour: Contour): Contour {
  return contour.map((value, i) => {
    if (value === null) return null
    const window = contour.slice(Math.max(0, i - 2), i + 3).filter((v): v is number => v !== null)
    return median(window)
  })
}

/** Stretches a contour to exactly `points` samples (nearest neighbour, keeps gaps). */
export function resample(contour: Contour, points: number): Contour {
  if (contour.length === 0) return new Array(points).fill(null)
  return Array.from({ length: points }, (_, i) => {
    const source = points === 1 ? 0 : Math.round((i / (points - 1)) * (contour.length - 1))
    return contour[source]
  })
}

/** Full pipeline used by the UI: raw mono samples → comparable melody curve. */
export function melodyCurve(samples: Float32Array, points = 120, sampleRate = ANALYSIS_SAMPLE_RATE): Contour {
  return resample(toSemitones(smooth(trimUnvoiced(pitchContour(samples, sampleRate)))), points)
}
