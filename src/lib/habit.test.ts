import { describe, expect, it } from 'vitest'
import { accuracyToRating, isDue, newCard, Rating, review } from './srs'
import { computeStreak, weekKey, MIN_DAY_SECONDS } from './streak'

describe('srs', () => {
  it.each([
    [100, Rating.Easy],
    [90, Rating.Easy],
    [75, Rating.Good],
    [50, Rating.Hard],
    [10, Rating.Again],
  ])('acierto %i%% → nota %i', (accuracy, rating) => {
    expect(accuracyToRating(accuracy)).toBe(rating)
  })

  it('una tarjeta nueva toca hoy y tras acertar se aplaza', () => {
    const now = new Date('2026-09-30T10:00:00')
    const card = newCard(now)
    expect(isDue(card, now)).toBe(true)
    const next = review(card, Rating.Easy, now)
    expect(isDue(next, now)).toBe(false)
    expect(new Date(next.due).getTime()).toBeGreaterThan(now.getTime())
  })

  it('fallar programa el repaso antes que acertar', () => {
    const now = new Date('2026-09-30T10:00:00')
    const card = newCard(now)
    const again = review(card, Rating.Again, now)
    const good = review(card, Rating.Good, now)
    expect(new Date(again.due).getTime()).toBeLessThan(new Date(good.due).getTime())
  })
})

describe('racha', () => {
  const ok = MIN_DAY_SECONDS

  it('cuenta días consecutivos acabando hoy', () => {
    const log = { '2026-09-28': ok, '2026-09-29': ok, '2026-09-30': ok }
    expect(computeStreak(log, '2026-09-30').streak).toBe(3)
  })

  it('si hoy aún no has practicado, la racha de ayer sigue viva', () => {
    const log = { '2026-09-28': ok, '2026-09-29': ok, '2026-09-30': 30 }
    const info = computeStreak(log, '2026-09-30')
    expect(info.streak).toBe(2)
    expect(info.todaySeconds).toBe(30)
  })

  it('perdona un día fallado por semana', () => {
    // 2026-09-28 es lunes; falta el martes 29
    const log = { '2026-09-27': ok, '2026-09-28': ok, '2026-09-30': ok }
    const info = computeStreak(log, '2026-09-30')
    expect(info.streak).toBe(3)
    expect(info.freezeUsedThisWeek).toBe(true)
  })

  it('dos fallos en la misma semana rompen la racha', () => {
    const log = { '2026-09-28': ok, '2026-10-01': ok, '2026-10-03': ok }
    expect(computeStreak(log, '2026-10-03').streak).toBe(2)
  })

  it('dos días seguidos sin practicar rompen la racha', () => {
    const log = { '2026-09-26': ok, '2026-09-29': ok, '2026-09-30': ok }
    expect(computeStreak(log, '2026-09-30').streak).toBe(2)
  })

  it('sin práctica la racha es 0', () => {
    expect(computeStreak({}, '2026-09-30').streak).toBe(0)
  })

  it('la semana empieza en lunes', () => {
    expect(weekKey(new Date(2026, 9, 4))).toBe('2026-09-28') // domingo 4-oct
    expect(weekKey(new Date(2026, 8, 28))).toBe('2026-09-28') // lunes
  })
})
