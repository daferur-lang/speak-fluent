import { describe, expect, it } from 'vitest'
import { detectPitch, melodyCurve, pitchContour, resample, toSemitones, trimUnvoiced } from './pitch'

const SR = 16000

function tone(hz: number, seconds: number, harmonics = false): Float32Array {
  const out = new Float32Array(Math.round(SR * seconds))
  for (let i = 0; i < out.length; i++) {
    const t = i / SR
    out[i] = 0.5 * Math.sin(2 * Math.PI * hz * t) + (harmonics ? 0.3 * Math.sin(2 * Math.PI * 2 * hz * t) : 0)
  }
  return out
}

describe('detectPitch', () => {
  it.each([110, 220, 330])('detecta %i Hz en un seno puro', (hz) => {
    const pitch = detectPitch(tone(hz, 0.1).subarray(0, 1024), SR)
    expect(pitch).not.toBeNull()
    expect(Math.abs(pitch! - hz) / hz).toBeLessThan(0.02)
  })

  it('no confunde la octava cuando hay armónicos fuertes', () => {
    const pitch = detectPitch(tone(150, 0.1, true).subarray(0, 1024), SR)
    expect(Math.abs(pitch! - 150) / 150).toBeLessThan(0.02)
  })

  it('devuelve null en silencio', () => {
    expect(detectPitch(new Float32Array(1024), SR)).toBeNull()
  })
})

describe('contorno y normalización', () => {
  it('pitchContour produce un valor cada 10 ms', () => {
    const contour = pitchContour(tone(200, 1))
    expect(contour.length).toBeGreaterThan(90)
    expect(contour.every((v) => v !== null && Math.abs(v - 200) < 4)).toBe(true)
  })

  it('toSemitones es relativo a la mediana y marca una octava como 12', () => {
    expect(toSemitones([110, 220, 110, null])).toEqual([0, 12, 0, null])
  })

  it('toSemitones descarta saltos de más de una octava como ruido', () => {
    const result = toSemitones([100, 100, 100, 500])
    expect(result[3]).toBeNull()
  })

  it('trimUnvoiced quita silencios al principio y al final', () => {
    expect(trimUnvoiced([null, null, 1, null, 2, null])).toEqual([1, null, 2])
  })

  it('resample estira al número exacto de puntos', () => {
    expect(resample([0, 10], 5)).toEqual([0, 0, 10, 10, 10])
    expect(resample([], 3)).toEqual([null, null, null])
  })

  it('una misma melodía a distinta altura da la misma curva', () => {
    const glide = (base: number) => {
      const out = new Float32Array(SR)
      let phase = 0
      for (let i = 0; i < out.length; i++) {
        const hz = base * (1 + 0.5 * (i / out.length))
        phase += (2 * Math.PI * hz) / SR
        out[i] = 0.5 * Math.sin(phase)
      }
      return out
    }
    const low = melodyCurve(glide(110), 20)
    const high = melodyCurve(glide(220), 20)
    low.forEach((v, i) => expect(Math.abs(v! - high[i]!)).toBeLessThan(0.5))
  })
})
