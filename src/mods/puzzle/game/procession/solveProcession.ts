import type { Mark, ProcessionPuzzle } from "./procession"

/**
 * The ladder, as five rungs (`docs/game-design/puzzles/procession.md` §3).
 *
 * A bar's knowledge is the SET of ticks it could still start on, and solving is that set narrowing. Which
 * marks a rung is allowed to read is the whole of what separates one rung from the next, so a rung is
 * spelled as a filter over the marks rather than as its own routine — and the tier of a board is the
 * weakest rung that settles it, which is what `requiredRung` below answers.
 */
export const RUNGS = ["chain", "squeeze", "apart", "split"] as const
export type Rung = (typeof RUNGS)[number]

/** Which marks each rung may reason from, cumulative — a rung reads everything the rungs below it read. */
const READS: Record<Rung, readonly Mark["kind"][]> = {
  chain: ["pin", "link"],
  squeeze: ["pin", "link", "before", "span"],
  apart: ["pin", "link", "before", "span", "apart", "together"],
  split: ["pin", "link", "before", "span", "apart", "together"],
}

/**
 * Whether a rung may assume-and-contradict, and how many of those suppositions a board demands is a
 * separate number the gate reads (`Deduction.splits`).
 *
 * **One rung, not a depth ladder.** A supposition inside a supposition was designed as the top rung and
 * does not occur: across 900 boards rolled at the widest days and bar counts this family will ship, not one
 * needed a second level (`procession.md` §3). What DOES separate the top two tiers is how many separate
 * suppositions a board asks for, which is a count rather than a depth.
 */
const SPLITS: Record<Rung, boolean> = { chain: false, squeeze: false, apart: false, split: true }

/** Which ticks each bar could still start on. */
type Domains = boolean[][]

const fullDomains = (puzzle: ProcessionPuzzle): Domains =>
  puzzle.bars.map(bar => Array.from({ length: puzzle.ticks - bar.len + 1 }, () => true))

const clone = (domains: Domains): Domains => domains.map(row => [...row])

const values = (row: readonly boolean[]): number[] => {
  const out: number[] = []
  for (let tick = 0; tick < row.length; tick++) if (row[tick]) out.push(tick)
  return out
}

const only = (row: readonly boolean[]): number | undefined => {
  const found = values(row)
  return found.length === 1 ? found[0] : undefined
}

/** One bar becoming certain, and what made it certain. The hint reads this list (`procession.md` §7). */
export type Settling = { bar: number; tick: number; rung: Rung }

type Pass = {
  /** False the moment a bar has nowhere left to stand — which is what a split rung is listening for. */
  alive: boolean
  /** How many times a candidate was struck off. The `steps` a grade reports. */
  steps: number
  /** How many of those strikes needed a supposition. The knob that separates the top two tiers. */
  splits: number
  settled: Settling[]
}

/**
 * Narrow every domain as far as the given marks allow, and keep narrowing while anything changes.
 *
 * Every rule here is a NECESSARY condition on a legal arrangement, never a sufficient one — so a value
 * this drops cannot be part of a solution, and a board this leaves undetermined is one the search below
 * finishes rather than one it has ruled on.
 */
const propagate = (puzzle: ProcessionPuzzle, domains: Domains, marks: readonly Mark[], rung: Rung): Pass => {
  const pass: Pass = { alive: true, steps: 0, splits: 0, settled: [] }
  // Recorded as it happens rather than swept up at the end, because the ORDER is what the hint reads: the
  // bar a stuck player is told about is the first one the ladder could have fixed for itself (§7).
  const strike = (bar: number, tick: number) => {
    if (!domains[bar][tick]) return
    domains[bar][tick] = false
    pass.steps++
    changed = true
    const settled = only(domains[bar])
    if (settled !== undefined) pass.settled.push({ bar, tick: settled, rung })
  }
  const len = (bar: number) => puzzle.bars[bar].len

  let changed = true
  while (changed && pass.alive) {
    changed = false
    for (const mark of marks) {
      switch (mark.kind) {
        case "pin":
          for (const tick of values(domains[mark.a])) if (tick !== mark.tick) strike(mark.a, tick)
          break
        case "link": {
          const shift = len(mark.a) + mark.gap
          for (const tick of values(domains[mark.a])) if (!domains[mark.b]?.[tick + shift]) strike(mark.a, tick)
          for (const tick of values(domains[mark.b])) if (!domains[mark.a]?.[tick - shift]) strike(mark.b, tick)
          break
        }
        case "before": {
          const earliestA = values(domains[mark.a])[0]
          const latestB = values(domains[mark.b]).at(-1)
          if (earliestA === undefined || latestB === undefined) break
          for (const tick of values(domains[mark.b])) if (tick < earliestA + len(mark.a)) strike(mark.b, tick)
          for (const tick of values(domains[mark.a])) if (tick + len(mark.a) > latestB) strike(mark.a, tick)
          break
        }
        case "apart":
        case "together": {
          // The support check, and the rung the family's whole upper half rests on: a start survives only
          // if the OTHER bar has somewhere to stand alongside it. Where one order of an `apart` pair does
          // not fit on lengths alone, this is what collapses it without a guess (family doc §3, R3).
          const wanted = mark.kind === "together"
          for (const [self, other] of [
            [mark.a, mark.b],
            [mark.b, mark.a],
          ]) {
            for (const tick of values(domains[self])) {
              const supported = values(domains[other]).some(alt => {
                const clash = tick < alt + len(other) && alt < tick + len(self)
                return clash === wanted
              })
              if (!supported) strike(self, tick)
            }
          }
          break
        }
        case "span": {
          // The day runs from the first start to the last end, so its first start is no earlier than the
          // earliest any bar can begin and no later than the earliest SOME bar must begin. Everything then
          // has to fit in the window that leaves — which is subtraction against the width of the day, and
          // the arithmetic this rung is here to make a player do.
          const earliest = Math.min(...domains.map(row => values(row)[0] ?? Infinity))
          const latestFirst = Math.min(...domains.map(row => values(row).at(-1) ?? Infinity))
          if (!Number.isFinite(earliest) || !Number.isFinite(latestFirst)) break
          domains.forEach((row, bar) => {
            for (const tick of values(row))
              if (tick < earliest || tick + len(bar) > latestFirst + mark.ticks) strike(bar, tick)
          })
          break
        }
      }
      if (domains.some(row => values(row).length === 0)) {
        pass.alive = false
        break
      }
    }
  }

  // A bar the board opened with only one place for was never deduced, but it is still known, and a hint
  // that skipped it would point past the easiest thing on the board.
  domains.forEach((row, bar) => {
    const tick = only(row)
    if (tick !== undefined && !pass.settled.some(seen => seen.bar === bar)) pass.settled.push({ bar, tick, rung })
  })
  return pass
}

/**
 * Propagation, then — for the split rungs — assume-and-contradict over every candidate that is left.
 *
 * **A split is a shave rather than a guess that sticks.** A value is taken, propagated, and struck off if
 * it leads nowhere; the board is never left standing on an assumption, which is what makes this a
 * technique a player can follow rather than a search a player has to trust. The propagation inside a
 * supposition is the `apart` rung and never another supposition, so nothing here nests.
 */
const deduceWith = (puzzle: ProcessionPuzzle, domains: Domains, rung: Rung): Pass => {
  const marks = puzzle.marks.filter(mark => READS[rung].includes(mark.kind))
  const pass = propagate(puzzle, domains, marks, rung)
  if (!pass.alive || !SPLITS[rung]) return pass

  let changed = true
  while (changed && pass.alive) {
    changed = false
    for (let bar = 0; bar < domains.length; bar++) {
      const candidates = values(domains[bar])
      if (candidates.length < 2) continue
      for (const tick of candidates) {
        const trial = clone(domains)
        trial[bar] = trial[bar].map((_, index) => index === tick)
        if (deduceWith(puzzle, trial, "apart").alive) continue
        domains[bar][tick] = false
        pass.steps++
        pass.splits++
        changed = true
        const settled = only(domains[bar])
        if (settled !== undefined && !pass.settled.some(seen => seen.bar === bar))
          pass.settled.push({ bar, tick: settled, rung })
      }
      if (values(domains[bar]).length === 0) pass.alive = false
    }
    if (changed && pass.alive) {
      const again = propagate(puzzle, domains, marks, rung)
      pass.alive = again.alive
      pass.steps += again.steps
      for (const settling of again.settled)
        if (!pass.settled.some(seen => seen.bar === settling.bar)) pass.settled.push(settling)
    }
  }
  return pass
}

export type Deduction = {
  determined: boolean
  steps: number
  /** How many suppositions the board needed — 0 below the split rung, and the top tiers' own knob. */
  splits: number
  /** Every bar the ladder fixed, in the order it fixed them. */
  settled: Settling[]
  starts?: number[]
}

/** What one rung of the ladder can make of a board, from nothing known. */
export const deduce = (puzzle: ProcessionPuzzle, rung: Rung): Deduction => {
  const domains = fullDomains(puzzle)
  const pass = deduceWith(puzzle, domains, rung)
  const starts = domains.map(row => only(row))
  const determined = pass.alive && starts.every(tick => tick !== undefined)
  return {
    determined,
    steps: pass.steps,
    splits: pass.splits,
    settled: pass.settled,
    starts: determined ? (starts as number[]) : undefined,
  }
}

/**
 * The weakest rung that settles this board, which IS its tier (`procession.md` §3).
 *
 * Undefined means the ladder does not reach it — a board still undetermined after the split rung has run
 * out of technique, and the generator's gate throws it away.
 */
export const requiredRung = (
  puzzle: ProcessionPuzzle
): { rung: Rung; steps: number; splits: number; starts: number[] } | undefined => {
  for (const rung of RUNGS) {
    const attempt = deduce(puzzle, rung)
    if (attempt.determined) return { rung, steps: attempt.steps, splits: attempt.splits, starts: attempt.starts! }
  }
  return undefined
}

/**
 * How many arrangements satisfy every mark, counted up to a limit.
 *
 * **The uniqueness gate, and it is a search rather than a ladder** — a board is only shipped if exactly one
 * arrangement holds, whether or not a technique reaches it. Propagation between choices is what keeps the
 * count cheap: six bars in sixteen ticks is a wide space before pruning and a narrow one after.
 */
export const countArrangements = (puzzle: ProcessionPuzzle, limit = 2): number => {
  const all = puzzle.marks
  const walk = (domains: Domains): number => {
    const pass = propagate(puzzle, domains, all, "apart")
    if (!pass.alive) return 0
    let next = -1
    let width = Infinity
    domains.forEach((row, bar) => {
      const size = values(row).length
      if (size > 1 && size < width) {
        width = size
        next = bar
      }
    })
    if (next === -1) return 1
    let found = 0
    for (const tick of values(domains[next])) {
      const trial = clone(domains)
      trial[next] = trial[next].map((_, index) => index === tick)
      found += walk(trial)
      if (found >= limit) return found
    }
    return found
  }
  return walk(fullDomains(puzzle))
}
