# Rush Hour — the blockade

Family id `rush-hour`, owned by the puzzle mod. Catalogue entry: `PUZZLE_FAMILIES.md` §4.17. The quality
bar every puzzle screen clears is `docs/instructions/puzzle-screens.md`.

## 1. Why it is in the catalogue

**It is the only family here that is planning rather than deduction.** Every other logic family settles a
cell by argument: something about the board is unknown, a rung of a technique ladder makes it known, and a
tier is the strongest rung a board demands. Nothing on this board is unknown. Every piece is visible, every
legal move is obvious, and the whole question is the ORDER of a dozen of them — you cannot move the piece
you want to move until two others are out of the way, and moving those is what pins the one after that.

That is a different muscle from the rest of the catalogue, and it is the reason a mechanic with no
uncertainty in it earns a slot.

## 2. The rules

- A piece occupies whole cells along one lane: a row if it is horizontal, a column if it is vertical.
- A piece slides along its own lane only — **never across it, never off the board**.
- A piece stops where something stops it: another piece, a walled cell, or the edge.
- **Piece 0 is the player's own.** It is horizontal, two cells, and the way out is the east end of its row.
- The board is done when the player's piece has its nose on that edge.

**There is no illegal position and no move budget**, which has two consequences worth stating. There is
nothing for a "mistake" hint to catch — every position a player can reach is a position they can leave —
and there is no fail state, so a board is a thing you work at rather than a thing you lose. Undo exists for
the same reason it exists in eclipse: a shove made three moves ago is the thing you now regret, and the
alternative to stepping back is resetting a board somebody has spent two minutes on.

## 3. Difficulty is distance, in moves

**A tier is the length of the shortest solution, and nothing else.** Not the grid, not the piece count on
its own — the number of moves a perfect player needs. The player is never shown that number and is never
held to it; it is a generation gate, exactly as star battle's required technique is a generation gate.

### 3.1 The search does both jobs

One breadth-first search over positions answers both questions this family has, which is why it has no
solver beyond it (`game/rushHour/solveRushHour.ts`):

- **How hard is this board** — the distance from its position to the nearest solved one.
- **What is the next right move** — the first step of a shortest solution from where the player is standing
  now, which is what the hint says (§4).

Generation exploits a property the mechanic hands over for free: **sliding is reversible**, so distance to
the way out can be measured backwards from every solved position at once. A piece SET — the lanes and the
lengths, which never change — has one component of positions, and one pass over it labels every position in
it with its own difficulty. So the expensive half of the work is done once per set and answers every tier,
instead of drawing a position at random and solving it.

The generator therefore draws a set, measures it, **climbs**, and then CHOOSES the position it hands over
from the band the tier asked for.

**The climb is what a random draw cannot do.** Measured: sets drawn at random top out around nineteen moves
however they are drawn, because deep boards are genuinely rare — the published enumeration of the whole 6×6
space (§7) puts the commonest board at eleven moves and the hardest that exists at 51. So a set that comes
out too shallow is not thrown away: one piece is re-rolled at a time and every change that does not make the
deepest position shallower is kept, until the band is reached or the climb runs out. Plateaus are crossed
deliberately (equal scores are accepted), because the sets here sit on wide ones. This is what took wizard from 19 moves to 24.

### 3.2 Three knobs, and none of them is the grid

**The grid is 6×6 at every tier.** At 390px wide the board takes 92% of it — the rest is the gutter the way
out is drawn in (§5.1) — so that is 54px a cell; 7×7 would be 46px and 8×8 40px, on a board whose only
gesture is shoving a piece along a lane with a finger. Bigger boards are a tablet question, if they are ever
a question.

**Piece count alone does not make a board hard.** Measured: a set drawn at random tops out around nine
moves however full it is, because most of its pieces are nowhere near the way out and the player simply
drives past them. What lengthens a solution is pieces standing ACROSS the lane the player has to leave by,
each of which has to be got out of the way, and each of which is itself pinned by something else.

So the knobs are `blockers` (how many pieces must cross the player's lane), `pieces` (how full the rest of
the board is) and `walls` (cells nothing may ever stand on — a piece that can never be shoved aside), and
the band is what actually decides the tier. **A wall is the one knob that adds difficulty without adding a
thing to plan with**, which is why the enumeration finds a harder board with one wall (60 moves) than
without (51); it is spent at master, because at wizard's piece count a wall crowds the board rather than
lengthening it. Measured over 200 seeds a tier, one draw
each — the search the offline pass runs:

| Tier    | Pieces | Walls | Blockers | Band  | Seeds that hit it | Cost a seed | Solutions seen |
| ------- | ------ | ----- | -------- | ----- | ----------------- | ----------- | -------------- |
| starter | 7      | 0     | 2        | 3–5   | 34 of 60          | 64ms        | 3–5            |
| junior  | 9      | 0     | 2        | 6–9   | 40 of 60          | 0.4s        | 6–9            |
| expert  | 11     | 0     | 3        | 10–15 | 38 of 60          | 0.5s        | 10–15          |
| master  | 12     | 1     | 3        | 16–22 | 7 of 60           | 0.4s        | 16–22          |
| wizard  | 13     | 0     | 3        | 24–35 | 2 of 60           | 0.6s        | 24–25          |

**Every tier now costs about half a second a seed, and the deep tiers simply hit less often.** That is the
cap above doing its job: cost is flat and yield is what varies, so the whole ladder is a few CPU-minutes of
scanning that the build machine pays once (`puzzle-screens.md` §6.1). A room with no list searches on the
player's device instead — which is survivable at half a second an attempt, and was not at three seconds.

**The climb is capped at eight nudges, and the cap is a PLAY-TIME budget rather than a quality one.** A
listed seed replays its draw and its climb when the room opens (`generatePuzzle` builds from the seed, not
from a stored board), and a nudge costs a bounded search of about a tenth of a second — so a budget of thirty
made a wizard room think for three seconds before it drew anything. Eight keeps every board under a second
and pushes the cost offline: the pass scans more seeds to find the ones that climb fast. It also means the
bands hug their floors, since a climb stops as soon as it reaches one.

**Wizard is 24 to 35, and it stops there deliberately.** The hardest board this mechanic has is 51 moves
(§7), and the human data puts the hardest instances of the classic set at around eleven minutes;
`PUZZLE_FAMILIES.md` §3.2 budgets a room at a few minutes. Twenty-four to thirty-odd moves is the top half
of the mechanic without being an evening — **played and timed at under three minutes a board** (§6), so the
band sits at half its budget with the rest as headroom.

## 4. The hint is the next move

**The search IS the hint.** There is no ladder to report, because nothing here is deduced. What a stuck
player needs is the one move that shortens the way out, and that is the first step of a shortest solution
from where they stand — recomputed from the player's own position, so a hint is never advice about a board
they no longer have.

The reason is read off that move rather than argued separately, and it is honest at four strengths:

| Key     | When                                              | What it says                                       |
| ------- | ------------------------------------------------- | -------------------------------------------------- |
| `drive` | the player's own piece, moving toward the way out | the way ahead is clear that far                    |
| `back`  | the player's own piece, moving AWAY from it       | nothing ahead will give; back out of the way first |
| `clear` | a piece standing across the player's own lane     | that one is in the way outright                    |
| `room`  | anything else                                     | nothing can move until that one does               |

**`clear` and `room` are the standard blocking heuristic** — the blockers, and the pieces blocking those
(§7) — so the hint speaks in the terms this puzzle is normally reasoned about rather than in terms of a
search nobody can see.

**`back` is separate because backing up is the move people do not try.** It is the "counter-intuitive move"
the problem-solving literature measures as a difficulty factor, and `drive`'s wording — "the way ahead is
clear that far" — is not merely vague about a leftward shove, it is wrong.

Under it, a second line names the direction ("shove it left, as far as the ring"), because a hint has to be
followable by somebody who cannot see which cell is ringed. The board rings the cells the piece would end
up on, which is what the words point at.

## 5. Theming — one face, and it is deliberately nowhere

**Blocks in a stone frame** (`app/rushHour/skins.ts`). Everything that carries meaning is geometry: a
piece's length is how many cells it owns, its long axis is the lane it may slide along, and the player's
own piece is the only one with a pointed nose — which is the signal a player who reads no hue gets, with
the amber as the second signal rather than the first.

**The family carries `puzzle` and no role tag, and that is a claim being withheld rather than an oversight.**
A tag says this family can DRESS as somewhere (`familyMeta.ts`'s `faces`), and coloured blocks in lanes are
nowhere at all. The fiction this mechanic is for is `trade` — sledges jammed in a market street, barges
warped along a quay — whose pool sits one member short of the floor a journey needs to restrict to it
(`journeys.md` §9), so the tag is worth four journeys and 187 rooms the day it is honest. It lands with the
art, not before it.

**The art is where this family differs from the rest, and the reason is the sprite plan**
(`docs/game-design/spritesheet-renderer-prep.md`). A glyph in the other families is `currentColor` at 30–45px,
recoloured by its skin and by hint state, which is why they are hand-drawn paths. A piece here is 2–3 cells
— 90–130px of real canvas — there are under a dozen on a board, and only the player's own carries a state,
which a ring can say. So painted sprites per face are a good bargain here, with two conditions:

- **Art that carries geometry has to be pixel-exact.** A piece's length IS the rule. A painted hull whose
  ends stop short of the cell boundary makes a 3 read as a 2, and the player then deduces wrongly. Sprites
  are authored against the grid, ends on the lines.
- **The count multiplies**: face × length (2, 3) × axis (along, across). One rotated sprite per length
  serves both axes only if the art has no directional lighting.

### 5.1 The way out is drawn outside the board

**The board gives up 8% of its width so the way out can stand beside it rather than inside it.** A marker
on the east edge is covered by whatever piece occupies the last column, which is most of the time — and the
one thing on this board that every move is aimed at is then the one thing a player cannot see. The gutter
belongs to no lane, so nothing can ever stand in front of it.

It is a chevron rather than a bar, because a marker that says WHICH WAY as well as where is the same signal
the player's own nose gives (§5), and the two point the same direction.

**The frame still clips**, which is what the gutter does not change: the completion run drives the player's
piece past the east edge and it has to disappear behind the wall it went through rather than paint over the
screen around it. So the marker is drawn in an unclipped twin of the frame's box — same width, same
percentages, no `overflow-hidden` — which is what lets it speak in cells without knowing any pixels.

## 6. Open questions

1. ~~**Does wizard now play as a wizard?**~~ **Answered by play, 2026-08-28: yes, and it is fun.** Boards
   in the 24–31 the generator delivers came in **under three minutes** each — half of `PUZZLE_FAMILIES.md`
   §3.2's six-minute budget, and enjoyable rather than a grind, which is the half of the question a
   stopwatch cannot answer.

   **So the band stays where it is, and the headroom is deliberate.** There is room to push toward 35 and
   beyond (the mechanic's own ceiling is 51 — §7), and no reason to spend it: a tier that fits the budget
   twice over and plays well is not a tier with a problem. If wizard is ever wanted harder, raise the
   floor rather than the ceiling, and expect the cost per seed to rise with it (§3.2).

2. **Does a starter board teach the rule without words?** Three moves and seven pieces was chosen so the only
   pieces that CAN move are the ones that need to. Whether a first-time player reads "this one is mine" off
   the nose alone is a playtest question.
3. **Is one wall at master the right place for walls?** They buy depth on a board with room and cost it on a
   full one, and only master was measured with them. Two at expert may be better than one at master.
4. **Is the climb worth more nudges?** Thirty per attempt is where the measured yield stopped improving, but
   that was measured against reaching the band rather than against filling it. A longer climb may deepen
   wizard further, at a cost that rises with it.

## 7. What the research says, and what we took from it

Rush Hour is one of the few puzzles in this catalogue with a published literature. Three findings shaped the
design above, and one is the reason the tier ladder is what it is.

**Shortest-solution length predicts human difficulty here — and it does not everywhere.** Jarušek and
Pelánek collected 55 hours of human solving over 45 Rush Hour instances (6×6, 1×2 and 1×3 cars, state spaces
600–80,000 positions) and compared candidate difficulty metrics against real solving times:

| Puzzle             | shortest path (Pearson / Spearman) | their random-walk/optimal-walk model |
| ------------------ | ---------------------------------- | ------------------------------------ |
| **Rush Hour**      | **0.77 / 0.90**                    | 0.75 / 0.90 — no improvement         |
| Sokoban            | 0.19 / 0.41                        | 0.39 / 0.61                          |
| Replacement puzzle | 0.28 / 0.21                        | 0.57 / 0.49                          |

So §3's choice — the tier IS the move count — is the metric the data supports for this mechanic, and it
would have been the wrong choice for a Sokoban-shaped family. State-space SIZE showed no significant
correlation at all, which is the same result our own piece-count measurements reached from the other end.
Their proposed explanation is the property this family's generator is built on: Rush Hour's state space is
undirected — every move reversible, no dead positions to fall into.

Their instances also give an outside calibration for §3.2's ceiling: median solving time ran from 15 seconds
for the easiest instance to 11 minutes for the hardest.

**The whole 6×6 space has been enumerated, so the ceiling is known.** Fogleman's exhaustive search covers
2,577,412 distinct puzzles over 9.7 billion reachable positions: the commonest board is **11 moves**, the
hardest with no walls is **51**, and the hardest with one wall is **60**. Two things follow. Wizard's 24–35
asks for roughly the top half of what the mechanic can do rather than for the extreme; and `walls` is a real
knob rather than decoration, which is why it exists (§3.2). The often-quoted "93" is the same hardest board
counted in single-cell STEPS rather than moves — Collette, Raskin and Servais classified all 3.6 × 10¹⁰
configurations by symbolic model checking. We count a slide of any distance as one move, so 51 is our
ceiling.

Fogleman also generated by enumerating **clusters** — one representative per set of mutually reachable
positions — which is the same observation §3.1 rests on, arrived at exhaustively where we sample.

**The blocking heuristic is the hint's vocabulary.** The standard solver heuristic for this puzzle is one
plus the number of pieces blocking the way out, and its advanced form is two-level: the blockers, plus the
minimum number of pieces blocking THOSE. That is `clear` and `room` (§4) — so the hint speaks in the terms
the mechanic is normally reasoned about, rather than in terms of a search nobody can see.

**Counter-intuitive moves are a measured difficulty factor**, which is why `back` is its own sentence rather
than folded into `drive`. Moving away from the goal is what a stuck solver will not try; a hint that names
the move without saying it is a retreat is describing the wrong thing.

### Sources

- Jarušek & Pelánek, _What Determines Difficulty of Transport Puzzles?_, FLAIRS 2011 —
  <https://cdn.aaai.org/ocs/2518/2518-11200-1-PB.pdf>
- Fogleman, _Solving Rush Hour, the Puzzle_ (2018) — <https://www.michaelfogleman.com/rush/>
- Collette, Raskin & Servais, _On the Symbolic Computation of the Hardest Configurations of the Rush Hour
  Game_ (2006)
- Flake & Baum, _Rush Hour is PSPACE-complete_ (2002); Hearn & Demaine, _PSPACE-completeness of
  sliding-block puzzles_ — <https://erikdemaine.org/papers/NCL_TCS/paper.pdf>. Generalised Rush Hour is
  PSPACE-complete; at 6×6 this is a curiosity, but it is why no closed-form difficulty rule exists.
- Princeton COS 402, A\* Rush Hour assignment (the blocking heuristic) —
  <https://www.cs.princeton.edu/courses/archive/fall07/cos402/assignments/rushhour/>
