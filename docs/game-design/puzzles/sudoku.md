# Sudoku — Six Chambers

Family doc. The catalogue entry (tier debut, weight, theme fit) lives in
`docs/game-design/PUZZLE_FAMILIES.md` §4.8; the screen bar every family must clear
lives in `docs/instructions/puzzle-screens.md`. This doc holds what is specific to
this family: the grid it is authored at, its generation rules, its deduction
techniques, how notes and undo work, how hints are phrased, and the two faces the
same board wears.

**Not in the world yet.** The family is built, registered and playable in the puzzle
lab at every tier and in both faces, but it is deliberately absent from the puzzle
mod's family list (`src/mods/puzzle/index.ts`), which is what puts a family into real
rooms. So a release can be play-tested on the bench before the world is re-cut around
it — and what the bench cannot answer, whether a 6x6 still holds up on the twentieth
room of a journey, is exactly what that play-testing is for. Switching it on is
listing `SUDOKU_META` there and running `yarn generate-world && yarn generate-seeds`.

Held back, it has no seed lists either — nothing asks for a bucket — so every board
it builds takes the miss path and searches live (`puzzle-screens.md` §6.1). That is
the documented fallback and it works, but it is worth knowing while bench-testing the
top tier: measured over 12 rerolls, wizard takes a median of 1.0s and at most 1.2s a
board, and 4 of those 12 came back a **nearest miss** — solvable by a hidden single
rather than genuinely needing the chamber-line rung (§3.1). So the top tier's
character is not something to read off one or two rolls. Both costs disappear the
moment the family is authored and the lists are filled.

## 1. Rules

A `6×6` grid, cut into six **chambers two squares wide and three tall** — three
chambers across, two down. Every row, every column and every chamber shows each of
the six values exactly once. A few squares are already filled in. That is the
entire rule, and a board is readable without any text.

**The chambers stand upright, and that is the shape this family is authored at.**
The same 36 squares cut the other way — chambers three wide and two tall — is a
different puzzle to solve and a different one to look at: an upright chamber spans
three rows and two columns, so a chamber argues with three lines across and two
down rather than the reverse. Nothing in the code assumes the shape (a board
carries its own `boxWidth`/`boxHeight`), and nothing else ships one.

## 2. Why this family, next to the ones we have

Futoshiki is the catalogue's Latin square entered from its cheap side: signs do
the work regions do here, so a 4×4 is already a real puzzle and no region shapes
have to be authored. Sudoku is the same slot entered from its own side — **the
region IS the third group**, and it is the one thing on this board that a row and
a column cannot say. Every deduction that involves a chamber is a deduction
neither of the other two families can teach.

It is also the most familiar puzzle in the world, which is worth something in a
game whose boards are otherwise all new to the player: a room they recognise at a
glance is a room they can start without reading anything.

## 3. Generation

Fill first, then take away everything the board turns out not to need:

1. Draw a full grid by seeded backtracking — every value once per row, per column
   and per chamber.
2. Take squares out one at a time, in a random order, keeping a removal only where
   the tier's own technique ladder still finishes the board without it.
3. Stop at the tier's floor of given squares, or where nothing more can come out.

Every intermediate board is settled by deduction, so the one that ships is too —
and that settles uniqueness with it, since every step along the way was forced. No
separate solution counter has to run.

### 3.1 The dig has to seek the tier's rung, not hope for it

A plain random dig on a 6×6 practically never produces a board that needs more
than a single: measured over 60 digs at the top cap, **one** needed the
chamber-line rung. The grid is too small for the harder reasons to be forced by
accident — when the singles stall on a 6×6, the board is usually genuinely
ambiguous rather than merely harder.

So while the gentler ladder can still finish the board, the dig looks for a
removal that stops it, and takes an ordinary removal only when the look comes up
empty. Once a board is beyond the gentler ladder it stays beyond it — squares only
ever come out — so the search stops at the first such removal and the rest of the
dig is plain.

That raises the top tier's yield from about one dig in sixty to about one in
fifty per _attempt_, and the attempt ceiling (60) turns that into roughly seven
boards in ten. **The remaining sixth is a nearest miss, not a failure**: a board
solvable by the tier's own ladder, unique, dug to the same floor, which simply
fell to a gentler reason. `grade` is what tells the two apart, so the offline seed
pass lists only the boards that hit (`puzzle-screens.md` §6.1) and a room whose
bucket is missing gets a slightly gentler board rather than none at all.

The dig inspects a handful of removable squares for a breaker rather than sweeping
all 36, because a breaker cannot exist early in a dig and the sweep is nearly the
whole cost. It widens by itself as the board empties: a square that cannot come out
at all is not one of the looks.

## 4. The technique ladder

Four rungs, in the order the solver reaches for them:

| Rung           | What it says                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------- |
| `nakedSingle`  | This square's row, column and chamber have taken every other value.                               |
| `hiddenSingle` | This value fits in no other square of this row / column / chamber.                                |
| `pointing`     | Inside this chamber the value can only stand on one line, so it is off that line everywhere else. |
| `claiming`     | Along this line the value fits only inside one chamber, so it is off the rest of that chamber.    |

### 4.1 The ordering is about explainability, not power

Placements come before eliminations: writing a value in moves the board on, while
ruling one out is the bookkeeping that gets you there. The two chamber-line rungs
are ordered by which side of the argument is easier to say out loud, not by
strength — they decide the same kind of thing, and a solver that reached for the
dearest reason first would explain every board with "I eliminated candidates".

### 4.2 Both readings of the chamber-line rung earn their place

`claiming` is the mirror of `pointing`, and on the boards this family ships it is
not redundant: given only the singles and one of the two, `claiming` fires on 3 of
150 boards and `pointing` on 2. Which one turns up on a given board is arbitrary,
so a family carrying only one would leave the other's boards unexplained. They fold
into a single **demand** (§5.2) because a tier that wants a chamber-line reason
should not care which way round it turned up; the hint layer still names the exact
one, because a sentence about a chamber and a sentence about a row are different
sentences.

### 4.3 Deliberately absent

Every subset rung a larger sudoku turns on — a naked pair, a hidden pair, either
triple, an x-wing — was built, measured, and removed. **Not one of them ever
fired.** A group only six squares wide leaves a pair one step behind a single that
fires first, so every board they might have decided was already decided.

Rungs nothing can reach are not a ceiling to grow into. They are dead weight in the
ladder, and worse, a tier table that promises reasoning no board demands: a
`wizard` authored against a hidden pair generates nothing, or generates boards that
quietly fall to a single. A 9×9 would want them back; this grid does not.

### 4.4 Where the top of this ladder actually lives

The chamber-line rung is the ceiling of a 6×6, and §3.1 is why: the board that
needs it is roughly one dig in fifty, and there is no fifth rung under it waiting
to be forced. The tier table (§5) is honest about that — what separates wizard from
master is not a new kind of reasoning but the same reasoning with nothing handed
over.

## 5. Difficulty knobs

The grid never moves, so two dials are left and they answer different questions.

| Tier    | Cap            | Demands        | Given floor | What the tier is                                         |
| ------- | -------------- | -------------- | ----------- | -------------------------------------------------------- |
| starter | `nakedSingle`  | —              | 16          | what is left in this square, with nearly half given      |
| junior  | `hiddenSingle` | `hiddenSingle` | 14          | the value's only home in a row, column or chamber        |
| expert  | `hiddenSingle` | `hiddenSingle` | 12          | the same rung against less of the answer                 |
| master  | `hiddenSingle` | `hiddenSingle` | 0           | dug as far as the singles reach — about ten squares left |
| wizard  | `boxLine`      | `boxLine`      | 0           | the board that needs a chamber against its lines         |

Measured over 30 seeds a tier: 16 / 14 / 12 / 10.2 / 10.3 given squares, 20 / 22 /
24 / 26 / 28 forced steps, and 2ms / 64ms / 26ms / 24ms / 1448ms to generate.

### 5.1 The floor is on the dig, not a gift afterwards

`minGivens` stops the digging early rather than handing squares back once it is
done. A gentle tier is not a board thinned to the bone and then propped back up —
it is a board that was never thinned that far. Handing squares back afterwards
would also retire the very rung the tier asked for: every extra given is a reason
the player no longer has to find.

### 5.2 The demands: what a tier is allowed to say

Three demands — `nakedSingle`, `hiddenSingle`, `boxLine` — over four techniques.
The fold exists so a tier can say "this board needs a chamber-line reason" without
caring which side of it fired (§4.2).

### 5.3 Demanding a rung means the ladder below it stalls

A board "demands" a rung when **the ladder below it cannot finish the board**. That
is the only form of the claim that means anything: the solver is cheapest-first, so
reading back the hardest step a solve happened to take says nothing about whether
the board needed it — it reaches the dear step only where the cheap ones have run
out, which is exactly the same statement, and only stated where it can be checked.

The generator gates on it, `grade` re-checks it on the board that ships, and the
dig (§3.1) is built around producing it.

### 5.4 A 6×6 has a low ceiling, and the table says so

Four rungs and roughly six given squares separate starter from wizard. That is the
grid: the catalogue's Latin-square slot scales 4×4 → 9×9 (`PUZZLE_FAMILIES.md`
§4.8) and this family is authored at one size on purpose, because the upright
chambers are the shape it exists to show. A tier ladder that pretended otherwise
would be a table of dials with nothing behind them.

## 6. Notes and undo

A square holds a value or the values the player is still weighing up. Notes are the
same vocabulary the solver reasons in (candidates), so a hint's elimination drops
straight onto them.

**A placement never sweeps the notes it rules out.** Sweeping looks like the
bookkeeping a player does on paper, but it throws away work only undo could return:
correcting a value the ordinary way — writing a different one over it — would leave
the swept notes gone for good. The board strikes stranded notes through instead, so
a correction simply re-marks them.

Undo is a stack of whole board states, 200 deep. A refused move (a given, a note in
a square that already holds a value) records nothing, so undo never swallows the
move before it.

## 7. Hints

A reason, then a move (`puzzle-screens.md` §4.1), both drawn from the technique
solver and both worded per face (§9). The reason names what the board makes true;
the move is an imperative naming the marking — "rule 𓈖 out of the hatched spaces".
The squares a hint SETTLES are hatched and the squares it argues FROM are ringed,
because a rung here can settle four squares at once and one ring over four of them
makes "this square" a guess between them.

A wrong value or a wrong note comes first, ahead of every reason: every technique
reasons from what the player wrote down, so once a mark is wrong the deductions
that follow are advice toward a dead end. **A mistake hint asks for nothing** — the
way out of a wrong mark is the player's to find, and naming it would be naming the
answer.

The player's own notes are read as the narrowing they are, so a hint that says to
rule a value out only fires while they still hold it: following the advice is what
moves the hint on.

## 8. Board requirements

- 6×6 fits a 360×640 phone with the pad below it and the rules under that. No pan,
  no zoom, no horizontal scroll.
- Chamber walls are drawn per side, thick where two chambers meet and hairline
  inside one. **The walls are not decoration**: which six squares are one chamber is
  half of what this board asks the player to see, and a grid ruled evenly is a Latin
  square with no chambers in it.
- The pad's six keys and its three controls are each at least a thumb wide.
- A repeat shows itself the moment it is written — in the row, the column or the
  chamber alike.

### 8.1 Picking a value shows where else it stands

Tapping a square that holds a value washes **every** square holding that value, and
brightens a pencilled copy of it wherever one is still a live option. That is the
question a player is actually asking when they tap a 4: where else is the 4, and
where could it still go — one question a step apart. Tapping an empty square answers
neither, so it washes nothing.

**A wash, and it has to be**, because the rings and the hatching are the hint's
vocabulary and a treatment means one thing (`puzzle-screens.md` §4.2): hatching is
what a hint settles, a bright ring is what it argues from, the strong ring is the
square the player is standing on, and a red ground is a repeat. So this is the one
signal left that is neither — laid OVER the ground rather than replacing it, so a
pre-filled square that is also a twin still reads as the puzzle's own.

Two precedences fall out of that, and both are deliberate:

- **A struck note stays struck.** A pencilled value the board has already ruled out
  is struck through in red; when it is also the picked value, the strike wins. That
  it cannot go here is the louder of the two facts.
- **The hint stays on top.** A twin the hint happens to be about keeps its hatching,
  because the hint is the thing the player just asked for.

The wash is carried heavier on the carved board than on the register — a dark board
swallows one, which is the lesson the conflict colour learned here first.

## 9. Theming

Two faces, and the second one is more than a palette: **what a value LOOKS like is
the skin's decision**. A value is a position in this family's rules and nothing
more, so the squares, the pad and every hint sentence ask the skin for the token.

- **Six Chambers** (`default`) — figures cut into a dark chamber wall, the ground
  every other grid family in the catalogue is drawn on. A player meeting this board
  after a Sumplete or a Greater-and-Lesser one reads it without being taught
  anything.
- **The Scribe's Register** (`papyrus`) — six signs inked across a sheet, ruled in
  reed pen, the puzzle's own signs in **red**: a scribe's rubric is exactly this,
  the fixed parts of a text set down in red against the black of the body, and on a
  sheet that carries no message of its own it is the only thing telling the two
  apart. The one light board here, so every mark on it is picked for pale ground —
  a ring drawn for a dark chamber is nearly invisible on papyrus, and an affordance
  that survives on one skin only is not an affordance.

The six signs are **drawn, not typed**, and that is not a style choice. The game
bundles no hieroglyph face — only Limelight, a display font — so every hieroglyph
anywhere in it rides on the device having a font for the Egyptian Hieroglyphs block.
The dependency is not hypothetical: `HieroglyphTile` already carries a workaround for
how its shadow doubled "on glyphs that render as a simple box (e.g. a hieroglyph
missing from the device's font)". Which platforms lack one, and at which OS version,
is not surveyed here — the point is that the game does not control it.

**What differs on this board is the cost of losing that bet.** Telling one sign from
another at a glance IS the mechanic, so a tile that shows an empty box is a
decoration that failed, while a square that shows one has taken the puzzle with it.
Strokes also mean a sign is not at the mercy of whichever face a device happens to
have, and let it be drawn as **ink** — an even reed-pen weight that holds up at a
sixth of a phone screen, which a text glyph sized to sit in a line of prose does not.

**The game now ships a subsetted hieroglyph font** (`yarn generate-font`), which
settles the tiles, the tableau and the collection — everything that used to gamble
on the device. It does not retire these six: a drawn sign is the one whose stroke
weight is ours to set, and this board wants an even reed-pen line rather than
whatever weight a text face was designed for. What the font does for this family is
make the hint sentences safe, since those name a sign as a character.

They are picked for **silhouette** rather than for meaning — water, the sun, an
ankh, a house, a mouth, the feather of truth: a flat zigzag, a disc, an upright
cross, a squat box, a flat lens, a tall plume. Six seated figures would be
authentic and unplayable.

The hieroglyph **characters** for those same six are kept for one job: a hint is a
string, and a drawn sign cannot go in one. So a sentence says 𓈖 where the board
draws it — and a device with no hieroglyph font loses a character out of an optional
sentence rather than the board it is about.

The register is reached by the `scribe` role, which no site authors yet: a themed
role needs four families in its pool before it is worth authoring
(`src/worldGen/rolePools.spec.ts`), and `scribe` has two — this family and the
hive. Until a third and fourth carry the tag, the register is reached in the puzzle
lab, by a site naming the theme outright, and by any room allocated for `scribe`
the day that pool fills.

### 9.1 The completion run — the board reads itself back

Every square holding the 1 settles at once, then every square holding the 2, to the
width of the grid. **A tick is a VALUE, not a square**, and that is this family's
own claim rather than a house style: what the board asserts is that each of the six
stands exactly once in every row, every column and every chamber, so lighting all
six homes of a value together is the rule showing itself.

The shared rules apply (`puzzle-screens.md` §3): the run happens before the shell
hears "solved", input is refused while it plays, the whole thing is under a second,
and `prefers-reduced-motion` skips it entirely — the board then is simply the answer
the player filled in.

The mark is the skin's: the carved board blooms, and the register only flares. Ink
does not swell as it dries, and a sign that grew would read as the sheet moving
under it.

## 10. Generation cost

**Human solve times are not measured yet.** The budget is `PUZZLE_FAMILIES.md`
§3.2's — ten seconds to a few minutes, never an evening — and the instrument is the
lab: pick the family and the tier, solve the real screen, read the banner's clock.
Until someone does that for all five tiers, the table in §5 is a table of forced
steps, which is what a solver can count and not what a person takes.

Every tier but the top is a handful of milliseconds to generate. Wizard is about a
second and a half,
and all of it is the rarity of its rung (§3.1) rather than the dig itself — the
generator builds a whole candidate and then judges it, which is the shape
`puzzle-screens.md` §6.1 says gets essentially free play-time generation off a seed
list. Play time runs a single attempt against a listed seed, and the attempt ceiling
is set for the fallback that runs when a bucket is missing rather than for the
offline pass, which asks for one attempt per seed either way.
