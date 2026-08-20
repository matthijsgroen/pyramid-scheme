import type { Difficulty } from "@/data/difficultyLevels"
import type { FutoshikiOptions } from "./generateFutoshiki"

// Tier settings, from docs/game-design/puzzles/futoshiki.md §5. Three dials now, and they answer three
// different questions: the CAP is what a board may demand of the player, PREFILL is how much of the
// answer it is handed to start with, and REQUIRES is the reasoning it is guaranteed to need. How many
// signs a board shows is still not a dial — it falls out of the cap, a weak ladder sparing few and a
// strong one stripping the board bare.
//
// 6 wide is the ceiling. Seven was bought for the top rungs of the ladder, on the belief that nothing
// above sign pair fires below it; measurement says otherwise (§4.3), and seven cost a 45-minute solve
// against a 3-minute budget. What separates wizard from master is no longer the grid: master may
// reach for a naked subset but never a hidden one, and a wizard board is handed nothing and must
// genuinely turn on a hidden subset or an x-wing to fall.
export const FUTOSHIKI_CONFIG: Record<Difficulty, { size: number } & FutoshikiOptions> = {
  // The `requires` is not decoration at the gentle end: a ladder this weak can settle a 4x4 on
  // pre-filled numbers alone, and one board in six came out carrying NO signs at all — a Latin square
  // wearing the family's name. Insisting the board turn a sign bound on costs nothing and makes that
  // board impossible.
  starter: { size: 4, techniqueCap: "signBound", prefill: 4, requires: ["signBound"] },
  // **One addition, on the grid the player already knows**: reading a sign against a number that is
  // already there. Starter used to hand straight over to a 5x5 with sign chains and one fewer given,
  // which is three dials at once and played as a different family. The rung between them was the one
  // being skipped — T3 was reachable at no tier's cap — and it is the cheapest sentence in the ladder:
  // "that square is already a 4, and this one has to be smaller."
  //
  // It also fixes what §5.1 calls the squeezed gentle end: a T2 cap cannot manufacture signs, so
  // starter carries ~3 of them against 4 given numbers, and a T3 cap yields roughly four signs against
  // 1.7 numbers. So junior is where the board stops looking like a Latin square with hints, without
  // growing a single square.
  junior: { size: 4, techniqueCap: "signVsValue", prefill: 3, requires: ["signVsValue"] },
  // The grid grows, and with it the chain: a run of signs pointing the same way is a reason that needs
  // somewhere to run.
  expert: { size: 5, techniqueCap: "signChain", prefill: 2, requires: ["signChain"] },
  master: { size: 6, techniqueCap: "nakedSubset", prefill: 1, requires: ["nakedSubset"] },
  wizard: { size: 6, techniqueCap: "xWing", prefill: 0, requires: ["hiddenSubset", "xWing"] },
}
