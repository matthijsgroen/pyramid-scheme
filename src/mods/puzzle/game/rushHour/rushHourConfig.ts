import type { Difficulty } from "@/data/difficultyLevels"
import type { RushHourOptions } from "./generateRushHour"

/**
 * Every tier is 6×6, and the ladder is carried by how far the way out is in MOVES
 * (`docs/game-design/puzzles/rush-hour.md` §3).
 *
 * **The grid is not the knob and the piece count is only half of one.** A 6×6 lands on 58px cells at
 * 390px wide, which is a comfortable drag; 7×7 is 49px and 8×8 is 43px, on a board whose only gesture is
 * shoving a piece along a lane. And piece count on its own does not make a board hard: a set drawn at
 * random tops out around nine moves however full it is, because most of its pieces are nowhere near the
 * way out. What lengthens a solution is pieces standing ACROSS the lane the player has to leave by —
 * hence `blockers`, which the count then scatters around.
 *
 * Measured over 60 seeds a tier, one draw and its climb each — the search the offline pass runs:
 *
 * | Tier    | Pieces | Walls | Blockers | Band  | Seeds that hit it | Cost a seed | Solutions seen |
 * | ------- | ------ | ----- | -------- | ----- | ----------------- | ----------- | -------------- |
 * | starter | 7      | 0     | 2        | 3–5   | 34 of 60          | 64ms        | 3–5            |
 * | junior  | 9      | 0     | 2        | 6–9   | 40 of 60          | 0.4s        | 6–9            |
 * | expert  | 11     | 0     | 3        | 10–15 | 38 of 60          | 0.5s        | 10–15          |
 * | master  | 12     | 1     | 3        | 16–22 | 7 of 60           | 0.4s        | 16–22          |
 * | wizard  | 13     | 0     | 3        | 24–35 | 2 of 60           | 0.6s        | 24–25          |
 *
 * **The climb is why the middle of the ladder lands almost every seed** (`generateRushHour`): a set that
 * comes out too shallow is nudged one piece at a time rather than thrown away. What the cost column pays for
 * is that climb — a wizard seed is a hundred times a starter one — and it is the seed list's whole reason for
 * existing (`puzzle-screens.md` §6.1).
 *
 * **The climb is capped at eight nudges because it is what the PLAYER pays** (`generateRushHour`): a listed
 * seed replays its draw and its climb when the room opens. That cap is why the deep tiers hit two or seven
 * seeds in sixty rather than most of them — the cost of finding those moved offline, which is the whole
 * point of a seed list.
 */
export const RUSH_HOUR_CONFIG: Record<Difficulty, RushHourOptions> = {
  // Three moves and seven pieces: the way out is blocked twice and nothing else is in the way. A first
  // encounter teaches itself, because the only pieces that CAN move are the ones that need to.
  starter: { size: 6, pieces: 7, blockers: 2, walls: 0, minMoves: 3, maxMoves: 5 },
  // The same two blockers with the board half full around them, so a blocker's own way out is no longer
  // free — the first boards where a move has to be made for another move's sake.
  junior: { size: 6, pieces: 9, blockers: 2, walls: 0, minMoves: 6, maxMoves: 9 },
  // Three across the lane. Ten moves is where the chain stops fitting in one look ahead.
  expert: { size: 6, pieces: 11, blockers: 3, walls: 0, minMoves: 10, maxMoves: 15 },
  // The one tier with a WALL, and it is placed here rather than higher on purpose: a wall crowds a board
  // that is already nearly full, so it costs depth at wizard's piece count while buying it at this one.
  master: { size: 6, pieces: 12, blockers: 3, walls: 1, minMoves: 16, maxMoves: 22 },
  // The top band. The hardest board that exists on a 6×6 with these pieces is 51 moves (the whole space has
  // been enumerated — family doc §7), so this asks for roughly the top half of what the mechanic has: above
  // the classic set's own "expert" range, under the point where a room becomes an evening.
  wizard: { size: 6, pieces: 13, blockers: 3, walls: 0, minMoves: 24, maxMoves: 35 },
}
