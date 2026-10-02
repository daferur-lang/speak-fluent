import { describe, expect, it } from 'vitest'
import { nextPendingIndex, resumeIndex } from './shadowResume'

const ids = ['a', 'b', 'c', 'd', 'e']

describe('resumeIndex', () => {
  it('sin nada guardado empieza en la primera pendiente', () => {
    expect(resumeIndex(ids, null, new Set())).toBe(0)
    expect(resumeIndex(ids, null, new Set(['a', 'b']))).toBe(2)
  })
  it('vuelve a la frase donde lo dejaste si sigue pendiente', () => {
    expect(resumeIndex(ids, 'c', new Set(['a', 'b']))).toBe(2)
  })
  it('si la guardada ya está superada, salta a la siguiente pendiente', () => {
    expect(resumeIndex(ids, 'c', new Set(['a', 'b', 'c']))).toBe(3)
  })
  it('da la vuelta al final de la lista', () => {
    expect(resumeIndex(ids, 'e', new Set(['b', 'e']))).toBe(0)
  })
  it('caso real: 8 de 42 superadas → continúa en la 9', () => {
    const many = Array.from({ length: 42 }, (_, i) => `p${i}`)
    const passed = new Set(many.slice(0, 8))
    expect(resumeIndex(many, 'p7', passed)).toBe(8)
  })
  it('todo superado: se queda en la guardada; id desconocido → la primera', () => {
    expect(resumeIndex(ids, 'c', new Set(ids))).toBe(2)
    expect(resumeIndex(ids, 'zzz', new Set())).toBe(0)
  })
})

describe('nextPendingIndex (botón Siguiente frase)', () => {
  it('salta las ya superadas', () => {
    expect(nextPendingIndex(ids, 0, new Set(['a', 'b', 'c']), false)).toBe(3)
  })
  it('si no queda ninguna pendiente, avanza una', () => {
    expect(nextPendingIndex(ids, 1, new Set(ids), false)).toBe(2)
  })
})
