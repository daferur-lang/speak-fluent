import { describe, expect, it } from 'vitest'
import { assessIntonation, finalMove, intonationTip, isTakePassed, shapeSimilarity } from './intonation'
import type { Contour } from './pitch'

const curve = (fn: (x: number) => number, n = 120): Contour => Array.from({ length: n }, (_, i) => fn(i / (n - 1)))
const statement = curve((x) => 3 * Math.sin(Math.PI * x * 1.5) - (x > 0.75 ? (x - 0.75) * 16 : 0)) // ends falling
const question = curve((x) => Math.sin(Math.PI * x * 2) + (x > 0.75 ? (x - 0.75) * 20 : 0)) // ends rising

describe('finalMove', () => {
  it('detecta final que baja, que sube y plano', () => {
    expect(finalMove(statement)).toBe('fall')
    expect(finalMove(question)).toBe('rise')
    expect(finalMove(curve(() => 0))).toBe('flat')
  })

  it('con muy poca voz no inventa: plano', () => {
    expect(finalMove([null, 1, 2, null])).toBe('flat')
  })
})

describe('shapeSimilarity', () => {
  it('misma melodía = 1; invertida = -1', () => {
    expect(shapeSimilarity(statement, statement)).toBeCloseTo(1)
    expect(shapeSimilarity(statement, statement.map((v) => (v === null ? null : -v)))).toBeCloseTo(-1)
  })

  it('tolera desfases pequeños y huecos', () => {
    const shifted = [null, null, null, ...statement.slice(0, -3)]
    const gappy = statement.map((v, i) => (i % 7 === 0 ? null : v))
    expect(shapeSimilarity(statement, shifted)).toBeGreaterThan(0.8)
    expect(shapeSimilarity(statement, gappy)).toBeGreaterThan(0.95)
  })

  it('sin suficiente voz devuelve 0', () => {
    expect(shapeSimilarity(statement, new Array(120).fill(null))).toBe(0)
  })
})

describe('assessIntonation', () => {
  it('imitación buena → muy natural', () => {
    const imitation = statement.map((v) => (v === null ? null : v * 0.7 + 0.3))
    expect(assessIntonation(statement, imitation).level).toBe('natural')
  })

  it('solo acierta el final → casi, y la pista habla del medio', () => {
    const flatMiddle = curve((x) => (x > 0.75 ? -(x - 0.75) * 16 : 0.2 * Math.sin(40 * x)))
    const result = assessIntonation(statement, flatMiddle)
    expect(result.finalMatches).toBe(true)
    expect(result.level).not.toBe('exagera')
  })

  it('pregunta leída como afirmación → la pista explica el final', () => {
    const result = assessIntonation(question, statement)
    expect(result.finalMatches).toBe(false)
    expect(intonationTip(result)).toContain('el nativo sube el tono y tú lo bajaste')
  })

  it('nunca da un suspenso: el peor nivel es "exagera"', () => {
    const result = assessIntonation(statement, curve(() => 0))
    expect(['natural', 'casi', 'exagera']).toContain(result.level)
  })
})

describe('isTakePassed', () => {
  it('se entiende + entonación al menos casi → superada', () => {
    expect(isTakePassed(85, 'casi', 70)).toBe(true)
    expect(isTakePassed(70, 'natural', 70)).toBe(true)
  })
  it('no se entiende → no superada aunque la melodía sea perfecta', () => {
    expect(isTakePassed(50, 'natural', 70)).toBe(false)
  })
  it('se entiende pero melodía muy distinta → todavía no', () => {
    expect(isTakePassed(100, 'exagera', 70)).toBe(false)
  })
  it('sin transcripción (móvil que no deja) decide solo la entonación', () => {
    expect(isTakePassed(null, 'casi', 70)).toBe(true)
    expect(isTakePassed(null, 'exagera', 70)).toBe(false)
  })
  it('sin curva pero con transcripción, basta con que se entienda', () => {
    expect(isTakePassed(90, null, 70)).toBe(true)
    expect(isTakePassed(null, null, 70)).toBe(false)
  })
})
