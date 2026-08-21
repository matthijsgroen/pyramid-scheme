import type { Difficulty } from "@/data/difficultyLevels"
import type { EclipseOptions } from "./generateEclipse"

// Tier settings, per docs/game-design/puzzles/eclipse.md §5. Each tier adds ONE rung, and generation is made
// to prove it: `techniqueCap` says how far the reasoning may go, `requires` says the tier's own rung has to
// fire, and `requiresCount` says how often — one hard step in a thirty-step solve is the tier below it with a
// moment of thought in the middle.
export const ECLIPSE_CONFIG: Record<Difficulty, EclipseOptions> = {
  // Signs and the no-three rule, on the smallest board that can hold them. Counting is not needed yet: a 4×4
  // settled by signs alone is the self-teaching first encounter.
  starter: { size: 4, techniqueCap: "noTriple" },
  // Counting arrives: a line with two suns in it has two moons coming.
  junior: { size: 4, techniqueCap: "lineCount", requires: ["lineCount"] },
  // Two rungs that reach past one square: what a pair must cost its line, and the fact that no two lines of
  // a kind may read alike. Either satisfies the quota — both are new here, and a board rarely offers both.
  expert: { size: 6, techniqueCap: "linePairing", requires: ["noCopy", "linePairing"], requiresCount: 2 },
  // Counting that squeezes: what a line still owes decides squares no local reading can, and the lone mark
  // that has only one place left to go.
  master: { size: 6, techniqueCap: "squeeze", requires: ["loneMark", "squeeze"], requiresCount: 3 },
  // The same reasoning on a board half again as wide, and more of it. **The top tier is more board, not a
  // deeper rung**: a chained one was built and measured, and the one-step reading beside a sign replaced it
  // outright — no board needed the chain.
  wizard: { size: 8, techniqueCap: "squeeze", requires: ["squeeze"], requiresCount: 4 },
}
