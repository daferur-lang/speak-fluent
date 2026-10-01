import type { Contour } from './pitch'

/**
 * Tolerant intonation check for shadowing. Instead of matching the native
 * melody point by point (actor-dubbing level), it looks at two things a
 * listener actually notices:
 *  - how the sentence ends (rising, falling or flat), and
 *  - the coarse overall shape of the melody.
 * Thresholds were calibrated by comparing the US and GB native recordings of
 * the same phrases: two natives who don't imitate each other must pass.
 */

export type FinalMove = 'rise' | 'fall' | 'flat'
export type IntonationLevel = 'natural' | 'casi' | 'exagera'

export const FINAL_MOVE_SEMITONES = 1.5
export const SHAPE_NATURAL = 0.5
export const SHAPE_CASI = 0.25
const COARSE_POINTS = 24
const MIN_OVERLAP = 8

export interface IntonationResult {
  level: IntonationLevel
  finalRef: FinalMove
  finalUser: FinalMove
  finalMatches: boolean
  shape: number
}

function voiced(curve: Contour): number[] {
  return curve.filter((v): v is number => v !== null)
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Pitch change over the last quarter of the voiced speech, as rise / fall / flat. */
export function finalMove(curve: Contour): FinalMove {
  const points = voiced(curve)
  if (points.length < 8) return 'flat'
  const tail = points.slice(Math.floor(points.length * 0.75))
  const half = Math.max(1, Math.floor(tail.length / 2))
  const change = mean(tail.slice(-half)) - mean(tail.slice(0, half))
  if (change > FINAL_MOVE_SEMITONES) return 'rise'
  if (change < -FINAL_MOVE_SEMITONES) return 'fall'
  return 'flat'
}

/** Averages a curve into a few buckets so small wiggles and timing offsets don't count. */
function coarse(curve: Contour, points = COARSE_POINTS): (number | null)[] {
  const size = curve.length / points
  return Array.from({ length: points }, (_, i) => {
    const bucket = voiced(curve.slice(Math.floor(i * size), Math.floor((i + 1) * size)))
    return bucket.length ? mean(bucket) : null
  })
}

/** Pearson correlation of the coarse melodies (−1…1); 0 when there is too little voiced overlap. */
export function shapeSimilarity(reference: Contour, user: Contour): number {
  const a = coarse(reference)
  const b = coarse(user)
  const pairs = a.map((v, i) => [v, b[i]] as const).filter((p): p is readonly [number, number] => p[0] !== null && p[1] !== null)
  if (pairs.length < MIN_OVERLAP) return 0
  const ma = mean(pairs.map((p) => p[0]))
  const mb = mean(pairs.map((p) => p[1]))
  let cov = 0
  let va = 0
  let vb = 0
  for (const [x, y] of pairs) {
    cov += (x - ma) * (y - mb)
    va += (x - ma) ** 2
    vb += (y - mb) ** 2
  }
  return va === 0 || vb === 0 ? 0 : cov / Math.sqrt(va * vb)
}

export function assessIntonation(reference: Contour, user: Contour): IntonationResult {
  const finalRef = finalMove(reference)
  const finalUser = finalMove(user)
  // "flat" is compatible with anything: small final moves are noisy even between two natives.
  const finalMatches = finalRef === finalUser || finalRef === 'flat' || finalUser === 'flat'
  const shape = shapeSimilarity(reference, user)
  const level: IntonationLevel =
    finalMatches && shape >= SHAPE_NATURAL ? 'natural' : finalMatches || shape >= SHAPE_CASI ? 'casi' : 'exagera'
  return { level, finalRef, finalUser, finalMatches, shape }
}

const MOVE_ES: Record<FinalMove, string> = { rise: 'sube', fall: 'baja', flat: 'se mantiene' }

/** One friendly, specific tip in Spanish; never a fail. */
export function intonationTip(result: IntonationResult): string {
  if (result.level === 'natural') return ''
  if (!result.finalMatches) {
    const user = result.finalUser === 'flat' ? 'lo mantuviste' : result.finalUser === 'rise' ? 'lo subiste' : 'lo bajaste'
    return `Al final el nativo ${MOVE_ES[result.finalRef]} el tono y tú ${user}.`
  }
  return 'El final está bien; exagera un poco más las subidas y bajadas del medio.'
}

export const LEVEL_LABEL: Record<IntonationLevel, string> = {
  natural: '¡Muy natural!',
  casi: 'Bien, casi',
  exagera: 'Prueba a exagerar la melodía',
}

/**
 * A shadowing take passes when it is understood (or understanding can't be
 * measured on this device) and the melody is at least "casi". Intonation can
 * be missing too (no voice detected), in which case being understood is enough.
 */
export function isTakePassed(accuracy: number | null, level: IntonationLevel | null, passAccuracy: number): boolean {
  const understood = accuracy === null || accuracy >= passAccuracy
  const melodyOk = level === null ? accuracy !== null : level !== 'exagera'
  return understood && melodyOk
}
