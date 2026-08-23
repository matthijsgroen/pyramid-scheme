# Eclipse

Family doc. The catalogue entry (tier debut, weight, theme fit) lives in
`docs/game-design/PUZZLE_FAMILIES.md` §4.20; the screen bar every family must clear
lives in `docs/instructions/puzzle-screens.md`. This doc holds what is specific to
the eclipse: what the player is deducing, its technique ladder, and how generation
proves a board needs the reasoning its tier claims.

> **The top tier has been played; the rest are targets.** An 8×8 wizard board was
> timed in the lab and sits inside §3.2's budget, hints included. Every other
> duration below is a target: the lab (`src/app/dev/PuzzleLab.tsx`) plays the real
> screen and its banner reports the solve time, so timing a tier needs nothing of
> its own.

## 1. Rules

Every square holds a sun or a moon, and three rules decide which:

- **Balance** — each row and each column holds as many suns as moons.
- **No three in a row** — never three of the same mark running along a line.
- **No copies** — no two rows read alike, and no two columns either. (Rows are only
  ever compared with rows: a row reading like a column is a coincidence about a
  board, not a rule about one.)
- **Signs** — some neighbouring pairs carry a sign: `=` says the two match, `×`
  says they differ.

This is Binairo's rule set, which is what Puzzle Express serves.

Nothing else. The board carries no language: the marks are shapes, the signs are
two symbols, and the answer is entered by tapping.

## 2. Why this family

**It is the first two-state grid we own.** Sumplete keeps or strikes a number,
futoshiki writes one of six, balance scale solves for a value — all of them
arithmetic. Eclipse is pure logic on a binary cell, which is a different muscle
and a much shorter board: with two options per square, a deduction is either
available or it is not, and the player never holds six candidates in their head.

**It is also the family that scales without growing.** The knob that matters is
how many signs the board carries, not how wide it is (§6) — so a 6×6 stays a 6×6
and still has a top tier, which is exactly what §3.2's solve-time budget wants
after futoshiki had to be cut back from 7×7.

**Two marks make it the cheapest family to skin.** Sun and moon are one pair of
glyphs; a night site swaps them for star and dark, and nothing else in the board
changes.

## 3. The deduction ladder

Ordered by how well each reason **explains itself**, not by how much it decides —
the same rule futoshiki's ladder follows, and for the same reason: a hint that
always says "I reasoned by contradiction" teaches nothing.

| #      | Technique                   | Fires when                                                   | The sentence                                      |
| ------ | --------------------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| **T0** | `sign`                      | A sign has one end filled                                    | "= means the same, so ☀️"                         |
| **T1** | `noTriple` (pair, sandwich) | Two of a mark sit together, or straddle a gap                | "Two ☀️ already, so 🌙"                           |
| **T2** | `signPair`                  | A matching pair stands next to a filled square               | "Because of that ☀️, these two are 🌙"            |
| **T3** | `lineCount`                 | A line already holds half of one mark                        | "This line has its 4 ☀️, so the rest are 🌙"      |
| **T4** | `noCopy`                    | A two-gap line could be filled into a copy of a finished one | "The other way round copies the line lit up"      |
| **T5** | `linePairing`               | A sign's pair, counted against what its line has room for    | "The × pairs use up the ☀️, so the rest are 🌙"   |
| **T6** | `loneMark`                  | One mark owed, and one place it can go                       | "One ☀️ left, and only one square keeps 🌙 apart" |
| **T7** | `squeeze`                   | Taking a mark leaves counting to force the rest of the line  | "☀️ here makes the rest 🌙 — three in a row"      |

**Every rung is one step, and its sentence is one line.** That is the constraint the
ladder is built to, and it is stricter than "solvable by deduction": a reason the
player has to hold three clauses of in their head is not a reason they can check.
Both halves matter — the rung has to be a single reading of the board, _and_ the
sentence has to fit in a phone-width banner.

Sentences name the marks as glyphs and say the number they counted (`{{count}} {{mark}}`),
because "this line has its 4 ☀️, so the rest are 🌙" is checkable where "that mark is
not allowed, so it is the other one" is not.

**Every rung is a sentence, and that is the design constraint the ladder is built
to.** A board must be solvable **forwards, step by step**, and each step must be a
reason the player can check where they are already looking:

- **No board-wide guessing.** Put a mark down, follow it across the whole board,
  watch a rule break twenty moves later, rub it out: that is trial and error with
  bookkeeping. It was built, measured and removed (§3.4).
- **No enumeration reported as a reason.** "Every legal way of filling this line
  agrees about this square" is what a solver _does_, not something a player can
  check — it asks them to try sixty-four fillings. That rung was built, measured and
  removed too (§3.4).
- **A hypothesis about ONE line is fair game** (T7), because everything it touches is
  in front of the player: "if that were a moon, this row would need … and then three
  run together". It is the reasoning a person actually does, and it is the top rung.

### 3.1 T4 needs two gaps, not one

**A one-gap line is always decided by counting first.** A six-line with five squares filled holds three of
some mark — there is no other way to split five — so `lineCount` fires and the copy rule never gets a turn.
Written for one gap, this rung was dead code: it fired on none of 45 measured boards.

With **two** gaps it is alive, because the line still needs one of each mark, so there are exactly two ways
to fill it. If one of them copies a finished line the other is forced, and both squares fall at once. It now
fires on 11–13 of every 15 boards.

### 3.2 T5 is where a sign stops being local

T0–T3 are local: they read a square's neighbours or its line. T5 is a pair the player cannot fill yet
deciding squares that touch neither of its ends, because of what the pair must cost its line — the first
deduction in the family that feels like a discovery rather than bookkeeping.

### 3.3 T6 and T7 are counting, read two ways

Both ask what a line still owes. **T6** — the line owes one of a mark and only one
square can take it, which settles the whole stretch. **T7** — taking a mark would
leave the line owing as many of the other as it has squares left, so counting fills
the rest, and that fill breaks a rule: one square decided, two halves to check.

### 3.4 What was built, measured, and taken out

Both removals are worth keeping on record, because both looked like the obvious way
to make the top tier hard:

- **Contradiction** (assume a mark, propagate across the whole board, catch the
  break). Measured: no board's break was ever immediate — the nearest was three
  forced moves away, the furthest twenty-six — so its hint could only ever say
  "assume this and walk". And nothing needed it: with it gone, boards thinned to
  exactly the same number of signs.
- **Exact line enumeration** (fill a line every legal way, keep what they agree on).
  Strong — it settles every board — but it cannot explain itself. Diagnosing _why_
  the alternatives failed got about two thirds of its hints down to a named rule; the
  rest stayed "one rule or another". Replacing it with T5–T7 lost nothing measurable:
  8×8 boards still thin to 13–20 signs at 57–62 steps, and draw slightly faster.
- **Cross-line propagation** (each line reading what its crossing lines ruled out,
  to a fixpoint). Built as a forward-only replacement for contradiction. Identical
  sign counts on every seed, and it never fired once: one line at a time is already
  complete at these sizes.
- **A chained hypothesis inside one line** ("try it, follow what this line then
  forces, see the rule it breaks"). It was sound and its sentences were true, but they
  ran to three clauses. Adding T2 — the one-step reading of a matching pair beside a
  filled square — took its work away entirely: **zero firings across twelve 8×8
  boards, and none of them needed it.** A simpler rung that says the same thing in one
  clause beats a general one that needs a paragraph.

## 4. Generation

Build then thin, the same shape as futoshiki:

1. Draw a full board obeying all three grid rules (backtracking, no rejection loop).
2. Write down **every** sign the answer implies.
3. Empty cells one at a time, keeping each removal only while the technique solver
   still reaches the answer unaided.
4. Then remove signs on the same terms.
5. Keep the board only if its solve actually **used** the rung its tier introduces.

**Step 3 must come before step 4, and that ordering is the whole family.** Thin the
signs first and every one of them comes off — a board still holding most of its
answer needs no signs at all, so the loop strips them and ships a grid of givens
with nothing to reason from. Empty the cells first and the signs become
load-bearing, which is what makes the later pass keep them. Boards drawn this way
carry 10–15 signs and nought to one given cell, which is the shape the family is
supposed to have.

Uniqueness is settled by the same gate: every intermediate board was solved by
forced steps, so the board that ships has exactly one answer and no solution
counter has to run.

**Cost.** Thinning is one pass over the cells and one over the signs; a second sweep
was measured and removed nothing on any tier, while doubling the bill. Drawing a board
costs about 20–190ms up to master and **0.3–1.1s at wizard**, where the quota throws
most draws away.

**The copy rule pays for itself in thinning.** A rule the solver can lean on is a
board that needs fewer signs to stay solvable: wizard boards went from 8–12 signs to
5–11, and drawing one got faster rather than slower, because a harder constraint set
makes contradiction-demanding boards easier to find.

## 5. Difficulty knobs

- **Technique cap** — how far up the ladder a board's solve may reach.
- **Required rung** — which technique the solve must actually spend, so the tier
  cannot ship a board the tier below would have settled.
- **How often it must fire** — the rung's quota. **One is not a tier**: a board of
  thirty forced sign-reads with a single hard step in the middle is the tier below
  it plus a moment of thought, which is exactly how the top two tiers read before
  the quota existed.
- **Grid size** — 4×4, 6×6, 8×8. Size buys bookkeeping rather than harder reasoning,
  so it is the knob of last resort — but at the top of the ladder it is the only knob
  left, and 8×8 is a board this family carries comfortably.

| Tier    | Size | Cap           | Requires                     |
| ------- | ---- | ------------- | ---------------------------- |
| starter | 4×4  | `noTriple`    | —                            |
| junior  | 4×4  | `lineCount`   | `lineCount` ×1               |
| expert  | 6×6  | `linePairing` | `noCopy` or `linePairing` ×2 |
| master  | 6×6  | `squeeze`     | `loneMark` or `squeeze` ×3   |
| wizard  | 8×8  | `squeeze`     | `squeeze` ×4                 |

The top two tiers share a cap: there is no deeper rung worth having (§3.4), so wizard
is more board — 8×8 at 55–57 steps against master's 30–32, drawn in 240–450ms.

Measured on four boards a tier: master 9–11 signs and 28–31 steps at 130–530ms;
wizard 13–20 signs and 57–62 steps at 340–840ms.

The starter tier caps below counting on purpose: signs and the no-three rule alone
make a 4×4 that teaches itself, which is P5's wordless first encounter.

## 6. Controls

**One tap per square, cycling empty → sun → moon → empty.** No palette and no pencil:
with two marks there is nothing to choose from, so a tap is the whole control surface
and the third state is the eraser.

**One button: undo.** The same control futoshiki puts under its board, in the same
place and the same shape — a family that moves its undo teaches its controls twice.
A tap already undoes one square, so this is for stepping back off a run of squares
filled on a wrong reading, which is the thing the cycle cannot give back. Reset stays
for starting over.

The empty state is a real answer, not just an absence — it is what the player
reasons with, and a two-state toggle would make every square look decided from the
first tap.

## 7. Hints

One per rung, keyed by technique and reading, rendered from a template
(`puzzle-screens.md` §4). The hint **names the move, never the answer**, and it
points at the squares and the sign it reasons from — so "these two must match" has
something to point to.

**Every hint is a move the player can make now.** There is no rung that says "assume
this and see what happens", so there is no hint that asks them to. The reason a hint
gives is always visible on the board it is pointing at.

**Two orders, because two jobs.** The ladder (§3) is ordered by strength: a tier's cap
is a prefix of it, and that is what decides which reasoning a board may be built to
need. A hint is ordered by **what a player spots first** — a sign with a filled end,
then a line that already holds all of one mark (it settles several squares at once),
then the local readings, and the counting arguments last. Several reasons usually
apply at once, and the one worth saying is the quickest to see rather than the
weakest. Measured on wizard boards, the hint order moves about one step in ten from
"two of these already sit together" to "this line has its four ☀️".

**A hint names the reason, never the method.** There is no rung whose reason is "I
tried every filling and they agreed", so there is no hint that asks the player to do
that. Each of T5–T7 says what the line owes and what the alternative walks into, and
lights the squares that show it — the run of three, the sign, the copied line.

**The square being decided is drawn apart from the evidence.** One ring over six
squares makes "this square" a guess; the conclusion wears a strong ring and its
evidence a faint one.

A wrong mark is reported before anything else: every technique reasons from what the
player wrote down, so once one mark is wrong the advice after it leads somewhere
dead.

**A hint is only derived once asked for.** It reads the board, and the top tier may
reason by contradiction — which tries a mark in every empty square — so deriving one
as the board changes would put that cost on every tap, for a string nobody asked to
read. (Lightbeam paid this once already; see its §11.)

## 7.1 The invariant a rung is held to

**A rung must never say something the answer disagrees with, from any state a player can be in.**

Generation solves each board once, along one path, so it only ever exercises the states that path visits. A
player reaches states it never sees: the same marks in a different order, or more of them. A rung that is
wrong only there ships a board that cannot be finished and a hint that lies — which is what happened when
propagation inside T7 re-used a stale list of empty squares, filled them twice, and reported a run of three
that was not on the board.

`soundness.spec.ts` is the guard: for every tier it fills a random subset of correct marks, walks the ladder
to the end, and checks every decision against the answer. It was written after that bug, and it catches it.

## 8. Board requirements

Beyond the shared screen bar:

- **The two marks differ in shape, not only in colour.** A disc with rays against a
  crescent — a colour-blind player, or a phone in daylight, reads outline.
- **A sign belongs to the gap between two squares**, drawn on the shared edge so it
  is never mistaken for a mark inside either one. It is **drawn rather than typed** —
  two strokes for "same", two crossed for "different" — for the reason futoshiki
  draws its chevrons: a typeface glyph is sized for prose and comes out thin against
  a stone square at arm's length.
- **Conflicts show as they happen, but not before the player has finished the square.**
  A broken rule is a fact about the board, and hiding it behind a check button turns
  deduction into submit-and-see. But a tap cycles empty → sun → moon, so the sun is a
  square being _passed through_ on the way to the moon — calling that a mistake is
  feedback about a state nobody chose. So a square goes quiet for ~600ms after a tap,
  and reds already earned on squares the player has not touched stay put rather than
  blinking off with every tap elsewhere.
- **Givens are visibly part of the board** rather than part of the answer, and
  refuse a tap.

## 9. Theming

The family emits logical state only — `mark(sun|moon) | sign(same|different) |
given` — and the skin decides what any of it looks like. Sun and moon are the
default pair; a site authored `theme: "night"` swaps in star and dark sky and changes
nothing else, which is the first thing built on the theme chain
(`worldgen-dsl-redesign.md` §"Puzzle skin") and what the Lighthouse of Alexandria serves.

**The second pair is drawn to the same rule as the first** (§8): the two marks differ in
OUTLINE — a filled star against a ring of empty sky — so the board stays readable without
colour. That rule is what makes another skin cheap; a pair that differed only in hue would
not be a skin, it would be a bug in two colours.

### 9.1 The completion run — one sweep across the board

**A solved board sweeps once, top-left corner to bottom-right, and only then reports the solve.** Each mark
swells and comes back as the wave reaches it. The shell freezes the board and starts its banner the moment it
is told (`puzzle-screens.md` §3), so the celebration happens before that word is said — the family reports the
solve a beat later, and core supplies only the clock (`useCelebration.ts`).

**A tick is a DIAGONAL, not a square.** What this board has to say at the end is "all of it is right" — every
line, in both directions, and every sign between them — and a diagonal sweep is the one motion that touches
every row and every column without pointing at any of them. Per-square ticks would also spend the whole run
on a flicker: a wizard board is forty-nine squares inside one second, where its thirteen diagonals read as a
wave.

Three constraints, the shared ones:

- **The whole run is about a second**, because the shell stops its solve-time clock when it hears "solved" and
  that number is what `PUZZLE_FAMILIES.md` §3.2's budget is measured with.
- **Input is refused while it runs** — cycling a mark mid-run would land a solve on a board that is no longer
  solved. Undo is held shut for the same beat.
- **`prefers-reduced-motion` skips it whole**, animation and wait together.

**The swell is on the mark rather than on the square**, so the wave stays inside the grid: a square growing
would push its neighbours, and this board's squares are already as close as its gaps allow. Givens take their
turn along with the rest — a given is part of the finished board even though it was never part of the answer.

## 10. Open questions

1. **Does the family want givens at all?** Generation drives them to nought or one,
   which is authentic and also means the opening move is always a counting one. A
   floor of two or three givens would let a board open with T0 instead; whether
   that is a kinder ramp or a duller board is a playtest question.
2. **Is 6×6 the ceiling?** 8×8 is a real Tango size, and the knob that grows with
   it is bookkeeping rather than reasoning — the catalogue says that is the wrong
   axis, so the burden of proof is on growing it.
3. ~~**How long does a wizard board actually take?**~~ — **Answered by play.** The
   8×8 board is 45–53 forced steps and comes in inside the budget, and it reads as a
   puzzle worth doing rather than a slog, hints included. The 6×6 fallback at quota
   ×6 stays measured-and-available, but nothing asks for it.
