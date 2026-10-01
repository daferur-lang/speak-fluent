import type { WordFeedback } from '../types'

/**
 * Compares what the learner was asked to say with what speech recognition
 * wrote down. Recognition picks its own spelling ("6122456" for "six one two
 * four five six", "I'm" for "I am", "going to" for "gonna"), so both sides are
 * first rewritten to a canonical token form; scoring happens on those tokens
 * but feedback is reported on the original words.
 */

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
}
const TEENS: Record<string, number> = {
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19,
}
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
}
const SCALES: Record<string, number> = { hundred: 100, thousand: 1000 }

/** Word-level equivalences: contractions, colloquial forms and UK/US spelling. */
const EQUIVALENTS: Record<string, string[]> = {
  "i'm": ['i', 'am'], "you're": ['you', 'are'], "we're": ['we', 'are'], "they're": ['they', 'are'],
  "he's": ['he', 'is'], "she's": ['she', 'is'], "it's": ['it', 'is'], "that's": ['that', 'is'],
  "there's": ['there', 'is'], "what's": ['what', 'is'], "where's": ['where', 'is'], "who's": ['who', 'is'],
  "let's": ['let', 'us'], "i've": ['i', 'have'], "you've": ['you', 'have'], "we've": ['we', 'have'],
  "they've": ['they', 'have'], "i'll": ['i', 'will'], "you'll": ['you', 'will'], "we'll": ['we', 'will'],
  "they'll": ['they', 'will'], "it'll": ['it', 'will'], "i'd": ['i', 'would'], "you'd": ['you', 'would'],
  "we'd": ['we', 'would'], "don't": ['do', 'not'], "doesn't": ['does', 'not'], "didn't": ['did', 'not'],
  "can't": ['can', 'not'], cannot: ['can', 'not'], "won't": ['will', 'not'], "isn't": ['is', 'not'],
  "aren't": ['are', 'not'], "wasn't": ['was', 'not'], "weren't": ['were', 'not'], "haven't": ['have', 'not'],
  "hasn't": ['has', 'not'], "couldn't": ['could', 'not'], "shouldn't": ['should', 'not'],
  "wouldn't": ['would', 'not'],
  gonna: ['going', 'to'], wanna: ['want', 'to'], gotta: ['got', 'to'], kinda: ['kind', 'of'],
  ok: ['okay'], mum: ['mom'], centre: ['center'], theatre: ['theater'], colour: ['color'],
  favourite: ['favorite'], travelling: ['traveling'], organise: ['organize'], realise: ['realize'],
}

interface Unit {
  display: string
  group: number
}

interface Canonical {
  units: Unit[]
  tokens: { value: string; group: number }[]
  /** Groups that are numbers: they only count as said when every digit matches. */
  numeric: Set<number>
}

function isNumberWord(word: string): boolean {
  return word in UNITS || word in TEENS || word in TENS || word in SCALES
}

/**
 * "one hundred and twenty" → [120]; "seven thirty" → [7, 30]; "six one two" → [6, 1, 2].
 * `owner[k]` tells which value the k-th word belongs to, so each number is scored on its own.
 */
function parseNumberWords(words: string[]): { values: number[]; owner: number[] } {
  const values: number[] = []
  const owner: number[] = []
  let current: number | null = null
  let canAddUnit = false
  let canAddTens = false
  const push = () => {
    if (current !== null) values.push(current)
  }

  for (const word of words) {
    const before = values.length + (current === null ? 0 : 1)
    if (word === 'and') {
      owner.push(Math.max(0, before - 1))
      continue
    }
    if (word in UNITS) {
      if (current !== null && canAddUnit) current += UNITS[word]
      else {
        push()
        current = UNITS[word]
      }
      canAddUnit = canAddTens = false
    } else if (word in TEENS) {
      if (current !== null && canAddTens) current += TEENS[word]
      else {
        push()
        current = TEENS[word]
      }
      canAddUnit = canAddTens = false
    } else if (word in TENS) {
      if (current !== null && canAddTens) current += TENS[word]
      else {
        push()
        current = TENS[word]
      }
      canAddUnit = true
      canAddTens = false
    } else if (word === 'hundred') {
      const base: number = current ?? 1
      current = base - (base % 1000) + ((base % 1000) || 1) * 100
      canAddUnit = canAddTens = true
    } else if (word === 'thousand') {
      current = (current ?? 1) * 1000
      canAddUnit = canAddTens = true
    }
    // values.length grows when a new number starts, so the current one is at this index.
    owner.push(values.length)
  }
  push()
  return { values, owner }
}

function digits(value: string | number): string[] {
  return String(value).split('')
}

function rawWords(text: string): string[] {
  return text
    .replace(/[’‘]/g, "'")
    .replace(/\$(\d+(?:\.\d+)?)/g, '$1 dollars')
    .replace(/€(\d+(?:\.\d+)?)/g, '$1 euros')
    .replace(/£(\d+(?:\.\d+)?)/g, '$1 pounds')
    .replace(/(\d+(?:\.\d+)?)\s*%/g, '$1 percent')
    .replace(/(\d)[:.](\d)/g, '$1 $2')
    .replace(/(\d),(\d)/g, '$1$2')
    .toLowerCase()
    .split(/[\s-]+/)
    .map((w) => w.replace(/[^a-z0-9']/g, '').replace(/^'+|'+$/g, ''))
    .filter(Boolean)
}

export function canonicalize(text: string): Canonical {
  const words = rawWords(text)
  const units: Unit[] = []
  const tokens: Canonical['tokens'] = []
  const numeric = new Set<number>()
  let group = 0
  let i = 0

  while (i < words.length) {
    const word = words[i]

    if (isNumberWord(word)) {
      // Collect a run of number words; "and" only counts inside it ("one hundred and twenty").
      const run: string[] = []
      while (
        i < words.length &&
        (isNumberWord(words[i]) || (words[i] === 'and' && run.length > 0 && i + 1 < words.length && isNumberWord(words[i + 1])))
      ) {
        run.push(words[i])
        i++
      }
      const { values, owner } = parseNumberWords(run)
      run.forEach((w, k) => units.push({ display: w, group: group + owner[k] }))
      values.forEach((value, k) => {
        numeric.add(group + k)
        for (const d of digits(value)) tokens.push({ value: d, group: group + k })
      })
      group += values.length
      continue
    }

    units.push({ display: word, group })
    if (/^\d+$/.test(word)) {
      numeric.add(group)
      for (const d of digits(word)) tokens.push({ value: d, group })
    } else {
      for (const value of EQUIVALENTS[word] ?? [word]) tokens.push({ value, group })
    }
    group++
    i++
  }

  return { units, tokens, numeric }
}

/** Longest-common-subsequence alignment; returns, for each token on each side, whether it was matched. */
function align(a: string[], b: string[]): { matchedA: boolean[]; matchedB: boolean[]; ops: ('a' | 'b' | 'ab')[] } {
  const rows = a.length + 1
  const cols = b.length + 1
  const lcs: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0))
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      lcs[i][j] = a[i - 1] === b[j - 1] ? lcs[i - 1][j - 1] + 1 : Math.max(lcs[i - 1][j], lcs[i][j - 1])
    }
  }

  const matchedA = new Array(a.length).fill(false)
  const matchedB = new Array(b.length).fill(false)
  const ops: ('a' | 'b' | 'ab')[] = []
  let i = a.length
  let j = b.length
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      matchedA[i - 1] = matchedB[j - 1] = true
      ops.push('ab')
      i--
      j--
    } else if (j === 0 || (i > 0 && lcs[i - 1][j] >= lcs[i][j - 1])) {
      ops.push('a')
      i--
    } else {
      ops.push('b')
      j--
    }
  }
  return { matchedA, matchedB, ops: ops.reverse() }
}

/** Share of a group's tokens that were matched. */
function groupScores(tokens: Canonical['tokens'], matched: boolean[]): Map<number, number> {
  const totals = new Map<number, [number, number]>()
  tokens.forEach((token, k) => {
    const [hit, all] = totals.get(token.group) ?? [0, 0]
    totals.set(token.group, [hit + (matched[k] ? 1 : 0), all + 1])
  })
  return new Map([...totals].map(([group, [hit, all]]) => [group, hit / all]))
}

export function scorePronunciation(target: string, heard: string): { words: WordFeedback[]; accuracy: number } {
  const t = canonicalize(target)
  const h = canonicalize(heard)
  const { matchedA, matchedB, ops } = align(
    t.tokens.map((x) => x.value),
    h.tokens.map((x) => x.value),
  )

  // A target word counts as said when most of its canonical tokens were heard
  // ("I'm" ↔ "I am" is one word made of two tokens).
  const targetScore = groupScores(t.tokens, matchedA)
  const heardScore = groupScores(h.tokens, matchedB)
  const isCorrect = (group: number) => {
    const score = targetScore.get(group) ?? 0
    return t.numeric.has(group) ? score === 1 : score >= 0.5
  }
  // A heard word is only "extra" when it mostly didn't match anything (so "6122456" with one
  // stray digit is not flagged).
  const isExtra = (group: number) => (heardScore.get(group) ?? 0) < 0.5

  const words: WordFeedback[] = []
  const emittedTarget = new Set<number>()
  const emittedHeard = new Set<number>()
  let ti = 0
  let hi = 0
  const emitTargetGroup = (group: number) => {
    if (emittedTarget.has(group)) return
    emittedTarget.add(group)
    for (const unit of t.units.filter((u) => u.group === group)) {
      words.push({ word: unit.display, match: isCorrect(group) ? 'correct' : 'missing' })
    }
  }
  const emitHeardGroup = (group: number) => {
    if (emittedHeard.has(group)) return
    emittedHeard.add(group)
    if (!isExtra(group)) return
    const display = h.units.filter((u) => u.group === group).map((u) => u.display).join(' ')
    words.push({ word: display, match: 'extra' })
  }

  for (const op of ops) {
    if (op === 'a' || op === 'ab') emitTargetGroup(t.tokens[ti++].group)
    if (op === 'b' || op === 'ab') emitHeardGroup(h.tokens[hi++].group)
  }
  // Target words with no tokens (e.g. only punctuation) still need to appear.
  t.units.forEach((u) => emitTargetGroup(u.group))

  // Score per original word so a multi-word number doesn't weigh more than any other word.
  const unitCorrect = t.units.filter((u) => isCorrect(u.group)).length
  const accuracy = t.units.length === 0 ? 0 : Math.round((unitCorrect / t.units.length) * 100)

  return { words, accuracy }
}
