import { describe, expect, it, vi } from 'vitest'
import { generateText, GeminiError, isRetryable } from './gemini'

const ok = (text: string) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 })
const fail = (status: number) => new Response('{}', { status })
const noSleep = async () => {}

function fakeFetch(responses: (Response | Error)[]) {
  const calls: string[] = []
  const impl = vi.fn(async (url: RequestInfo | URL) => {
    calls.push(String(url).split('/models/')[1].split(':')[0])
    const next = responses.shift()!
    if (next instanceof Error) throw next
    return next
  }) as unknown as typeof fetch
  return { impl, calls }
}

describe('generateText', () => {
  it('usa el modelo rápido si responde', async () => {
    const { impl, calls } = fakeFetch([ok('Hi|||Bien')])
    expect(await generateText('p', impl, noSleep)).toBe('Hi|||Bien')
    expect(calls).toEqual(['gemini-3.5-flash-lite'])
  })

  it('reintenta si el modelo está saturado (503)', async () => {
    const { impl, calls } = fakeFetch([fail(503), ok('Hi')])
    expect(await generateText('p', impl, noSleep)).toBe('Hi')
    expect(calls).toEqual(['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite'])
  })

  it('pasa al modelo de respaldo si el rápido sigue fallando', async () => {
    const { impl, calls } = fakeFetch([fail(429), new TypeError('Failed to fetch'), ok('Hi')])
    expect(await generateText('p', impl, noSleep)).toBe('Hi')
    expect(calls).toEqual(['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'])
  })

  it('no repite un modelo que da 400/404: salta directo al respaldo', async () => {
    const { impl, calls } = fakeFetch([fail(404), ok('Hi')])
    expect(await generateText('p', impl, noSleep)).toBe('Hi')
    expect(calls).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'])
  })

  it('si todo falla, lanza el último error con su código', async () => {
    const { impl } = fakeFetch([fail(503), fail(503), fail(503)])
    await expect(generateText('p', impl, noSleep)).rejects.toMatchObject({ status: 503 })
  })

  it('ignora las partes de "pensamiento" y junta el texto', async () => {
    const body = { candidates: [{ content: { parts: [{ text: 'hmm', thought: true }, { text: 'Hi' }, { text: '|||Bien' }] } }] }
    const { impl } = fakeFetch([new Response(JSON.stringify(body), { status: 200 })])
    expect(await generateText('p', impl, noSleep)).toBe('Hi|||Bien')
  })
})

describe('isRetryable', () => {
  it('reintenta saturación, cuota y red; no peticiones inválidas', () => {
    expect(isRetryable(new GeminiError('x', 503))).toBe(true)
    expect(isRetryable(new GeminiError('x', 429))).toBe(true)
    expect(isRetryable(new GeminiError('timeout'))).toBe(true)
    expect(isRetryable(new GeminiError('x', 400))).toBe(false)
  })
})
