import { describe, expect, it } from 'vitest'
import { scorePronunciation } from './pronunciation'

const missing = (target: string, heard: string) =>
  scorePronunciation(target, heard)
    .words.filter((w) => w.match === 'missing')
    .map((w) => w.word)

describe('scorePronunciation — casos reales del reconocimiento de voz', () => {
  it('teléfono: Chrome escribe las cifras juntas (caso real, antes 30%)', () => {
    const { accuracy } = scorePronunciation('My phone number is six one two, four five six.', 'my phone number is 6122456')
    expect(accuracy).toBeGreaterThanOrEqual(85)
  })

  it('teléfono dicho exacto en cifras da 100%', () => {
    expect(scorePronunciation('My phone number is six one two, four five six.', 'my phone number is 612 456').accuracy).toBe(100)
  })

  it('números compuestos: twenty-five = 25', () => {
    expect(scorePronunciation('I am twenty-five years old.', "I'm 25 years old").accuracy).toBe(100)
  })

  it('horas: seven thirty = 7:30', () => {
    expect(scorePronunciation('The train leaves at seven thirty.', 'the train leaves at 7:30').accuracy).toBe(100)
  })

  it('cientos: one hundred and twenty = 120', () => {
    expect(scorePronunciation('It costs one hundred and twenty euros.', 'it costs 120 euros').accuracy).toBe(100)
  })

  it('precios: five dollars = $5', () => {
    expect(scorePronunciation('It is five dollars.', "it's $5").accuracy).toBe(100)
  })

  it('al revés: frase en cifras y reconocimiento en letras', () => {
    expect(scorePronunciation('I have 2 kids.', 'I have two kids').accuracy).toBe(100)
  })

  it('contracciones en cualquier dirección', () => {
    expect(scorePronunciation("I'm from Spain and I don't eat meat.", 'I am from Spain and I do not eat meat').accuracy).toBe(100)
    expect(scorePronunciation('I am from Spain.', "I'm from Spain").accuracy).toBe(100)
  })

  it('gonna / wanna = going to / want to', () => {
    expect(scorePronunciation("I'm gonna have the chicken salad.", 'I am going to have the chicken salad').accuracy).toBe(100)
    expect(scorePronunciation('What do you wanna do this weekend?', 'what do you want to do this weekend').accuracy).toBe(100)
  })

  it('ortografía británica vs americana', () => {
    expect(scorePronunciation('How much is a ticket to the city centre?', 'how much is a ticket to the city center').accuracy).toBe(100)
    expect(scorePronunciation('My mum lives nearby.', 'my mom lives nearby').accuracy).toBe(100)
  })

  it('sigue detectando errores de verdad', () => {
    const result = scorePronunciation('My phone number is six one two, four five six.', 'my phone number is 612')
    expect(result.accuracy).toBeLessThan(85)
    expect(missing('My phone number is six one two, four five six.', 'my phone number is 612')).toEqual(['four', 'five', 'six'])
    expect(scorePronunciation('I wake up at seven.', 'I wake up at eight').accuracy).toBeLessThan(100)
  })

  it('un número solo vale si coinciden todas sus cifras', () => {
    expect(missing('I am twenty-five years old.', 'I am 26 years old')).toEqual(['twenty', 'five'])
    expect(missing('The train leaves at seven thirty.', 'the train leaves at 7')).toEqual(['thirty'])
  })

  it('las cifras de más no se marcan como palabra extra si casi todo coincide', () => {
    const { words } = scorePronunciation('My phone number is six one two, four five six.', 'my phone number is 6122456')
    expect(words.filter((w) => w.match === 'extra')).toEqual([])
  })

  it('muestra las palabras de la frase original, no la versión normalizada', () => {
    const { words } = scorePronunciation("I'm gonna call you at seven thirty.", 'I am going to call you at 7:30')
    expect(words.map((w) => w.word)).toEqual(["i'm", 'gonna', 'call', 'you', 'at', 'seven', 'thirty'])
    expect(words.every((w) => w.match === 'correct')).toBe(true)
  })

  it('una palabra de más se marca como extra con lo que se oyó', () => {
    const { words, accuracy } = scorePronunciation('Nice to meet you.', 'nice to meet you too')
    expect(accuracy).toBe(100)
    expect(words.find((w) => w.match === 'extra')?.word).toBe('too')
  })

  it('casos límite', () => {
    expect(scorePronunciation('', 'hello').accuracy).toBe(0)
    expect(scorePronunciation('Hello.', '').accuracy).toBe(0)
  })
})
