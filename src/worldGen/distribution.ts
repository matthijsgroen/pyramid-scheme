// Composable candidate-slot distribution rules — filters (narrow candidates) and rankers
// (order what's left), composed with `pipe`. See docs/game-design/keys-and-locks-solver.md,
// "Distribution rules: composable functions, not declarative config".

export type CandidateFn<T> = (candidates: readonly T[]) => T[]

export const pipe =
  <T>(...fns: CandidateFn<T>[]): CandidateFn<T> =>
  candidates =>
    fns.reduce((cs, fn) => fn(cs), [...candidates])

export const filterBy =
  <T>(predicate: (candidate: T) => boolean): CandidateFn<T> =>
  candidates =>
    candidates.filter(predicate)

// Keeps the first candidate seen per key, dropping the rest — e.g. one slot per journey.
export const uniqueBy =
  <T, K>(keyOf: (candidate: T) => K): CandidateFn<T> =>
  candidates => {
    const seen = new Set<K>()
    const result: T[] = []
    for (const c of candidates) {
      const k = keyOf(c)
      if (seen.has(k)) continue
      seen.add(k)
      result.push(c)
    }
    return result
  }

// Higher score first. Stable for ties (Array.sort's own guarantee).
export const rankBy =
  <T>(scoreOf: (candidate: T) => number): CandidateFn<T> =>
  candidates =>
    [...candidates].sort((a, b) => scoreOf(b) - scoreOf(a))

// A distribution rule's constraint can be broken if honoring it strictly would leave
// instances unplaceable — `strict`-passing candidates come first (ranked among themselves),
// followed by the rest of the pool (also ranked) as a relaxed tail. A caller walking the
// result front-to-back and taking as many as it needs naturally relaxes the constraint once
// the strict prefix runs out, instead of failing outright. Generalizes fragments.ts's own
// strict-then-relaxed two-pass pattern into a reusable combinator.
export const preferThenRelax =
  <T>(strict: CandidateFn<T>, rank: CandidateFn<T>): CandidateFn<T> =>
  candidates => {
    const preferred = rank(strict(candidates))
    const preferredSet = new Set(preferred)
    const rest = rank(candidates.filter(c => !preferredSet.has(c)))
    return [...preferred, ...rest]
  }
