import type { Difficulty } from "@/data/difficultyLevels"
import { PROCESSION_STEPS } from "@/game/mechanics/sequence"
import type { ProcessionOptions } from "./generateProcession"

/**
 * The ladder, tier by tier (`docs/game-design/puzzles/procession.md` §5).
 *
 * **The rung is the tier and the size is the bookkeeping.** A wider day and another bar do not make a
 * board harder — they make it longer — so what separates one tier from the next is the weakest rung that
 * settles it, and above the middle, how much of the board only yields to a supposition. The sizes grow
 * underneath because a rung needs enough web to have somewhere to happen.
 *
 * **Nothing ships at the `chain` rung, and that is the whole of what the first playtest changed.** A board
 * whose every bar is fixed by a pin or by a link off one is a board the player is TOLD, one sentence at a
 * time — that was tolerable while the marks were wordless chips and became dictation the moment each mark
 * said itself in words. So the ladder starts one rung up: even a starter board has to be worked out, and
 * the arithmetic it asks for is a day's width minus what is already spoken for.
 *
 * Measured over 2000 seeds a tier, one attempt each.
 */
export const PROCESSION_CONFIG: Record<Difficulty, ProcessionOptions> = {
  // Three bars in an eight-tick day, and the whole board is one sum: what is left of the day once the
  // pinned bar and the gaps around it are spoken for. 7.1% of seeds, 2–3 marks.
  starter: {
    ticks: 8,
    bars: 3,
    minLen: 2,
    maxLen: 3,
    maxGap: 2,
    kinds: ["pin", "link", "before", "span"],
    minRung: "squeeze",
    maxRung: "squeeze",
    minSplits: 0,
    maxSplits: 0,
  },
  // `apart` and `together` arrive, read on lengths alone: one order of a pair does not fit in the day, so
  // the pair settles without anybody supposing anything. 13.3% of seeds, 4–5 marks.
  junior: {
    ticks: 10,
    bars: 4,
    minLen: 2,
    maxLen: 3,
    maxGap: 3,
    kinds: ["pin", "link", "before", "apart", "together", "span"],
    minRung: "apart",
    maxRung: "apart",
    minSplits: 0,
    maxSplits: 0,
  },
  // The first suppositions: take one order, follow it until it breaks, take the other. Held to three
  // struck candidates, so the board is one such argument rather than a habit. 3.4% of seeds.
  expert: {
    ticks: 12,
    bars: 5,
    minLen: 2,
    maxLen: 4,
    maxGap: 3,
    kinds: ["pin", "link", "before", "apart", "together", "span"],
    minRung: "split",
    maxRung: "split",
    minSplits: 1,
    maxSplits: 3,
  },
  // The same rung with more of the board resting on it, on a wider day. 1.4% of seeds.
  master: {
    ticks: 14,
    bars: 5,
    minLen: 2,
    maxLen: 4,
    maxGap: 4,
    kinds: ["pin", "link", "before", "apart", "together", "span"],
    minRung: "split",
    maxRung: "split",
    minSplits: 4,
    maxSplits: 8,
  },
  // A sixth bar and the widest day, where most of what is known is known by supposition. The ceiling is as
  // load-bearing as the floor: past twenty struck candidates a board stops being hard and starts being
  // long, which is the shape §3.2 of the catalogue rules out. 2.4% of seeds.
  wizard: {
    ticks: 16,
    bars: 6,
    minLen: 2,
    maxLen: 4,
    maxGap: 4,
    kinds: ["pin", "link", "before", "apart", "together", "span"],
    minRung: "split",
    maxRung: "split",
    minSplits: 9,
    maxSplits: 20,
  },
}

/** The variant a procession door asks for: `door<n>`, one bar per step of its sequence. */
export const doorVariant = (steps: number) => `door${steps}`

/**
 * The options a board is built from. A door's board is the tier's, sized by its sequence and with no two bars
 * starting together, so its answer reads as one order (`docs/game-design/puzzles/procession.md`, "At a door").
 */
export const processionOptions = (difficulty: Difficulty, variant?: string): ProcessionOptions => {
  const steps = variant?.match(/^door(\d+)$/)?.[1]
  const tier = PROCESSION_CONFIG[difficulty]
  return steps ? { ...tier, bars: Number(steps), distinctStarts: true } : tier
}

/** How many steps a procession door's sequence may have: one bar each, and six is one cast's glyphs. */
export const PROCESSION_DOOR_STEPS: readonly number[] = Array.from(
  { length: PROCESSION_STEPS.max - PROCESSION_STEPS.min + 1 },
  (_, index) => PROCESSION_STEPS.min + index
)
