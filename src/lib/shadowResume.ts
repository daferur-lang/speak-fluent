/**
 * Where to continue shadowing: the first phrase not yet passed, starting from
 * where the learner left off (wrapping around). If everything is passed, stay
 * on the saved phrase so they can keep polishing.
 */
export function nextPendingIndex(ids: string[], from: number, passed: Set<string>, includeFrom = true): number {
  if (ids.length === 0) return 0
  const start = ((from % ids.length) + ids.length) % ids.length
  for (let step = includeFrom ? 0 : 1; step <= ids.length; step++) {
    const i = (start + step) % ids.length
    if (!passed.has(ids[i])) return i
  }
  return includeFrom ? start : (start + 1) % ids.length
}

export function resumeIndex(ids: string[], savedId: string | null, passed: Set<string>): number {
  const saved = savedId ? ids.indexOf(savedId) : -1
  return nextPendingIndex(ids, saved >= 0 ? saved : 0, passed)
}
