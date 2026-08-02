import type { Difficulty } from "@/data/difficultyLevels"

// ponytail: all trap timing lives here — tune before playtesting
//
// Every tier is timed. The trap family is a *reflex* check on arithmetic the player is already doing
// to progress at that tier (operand ranges scale separately — see arithmeticReflex/generate.ts), so
// the limit tests recall speed on familiar sums rather than comprehension of new ones. Starter and
// junior share expert's limit: their sums are the smallest in the game, and their trap corridors are
// all hidden (optional) content.
//
// 0 would mean "untimed" (the countdown short-circuits, and trap-insight refuses to extend it) — no
// tier uses that now, but the sentinel still works if a tier should ever go back to untimed.
export const TRAP_TIME_LIMITS_SECONDS: Record<Difficulty, number> = {
  starter: 8,
  junior: 8,
  expert: 8,
  master: 6,
  wizard: 4,
}

export const TRAP_TIME_EXTENSION_PER_INSIGHT_STACK = 1 // seconds per stack
