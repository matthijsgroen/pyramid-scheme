# Sudoku — Six Chambers

Family doc. The catalogue entry (tier debut, weight, theme fit) lives in
`docs/game-design/PUZZLE_FAMILIES.md` §4.8; the screen bar every family must clear
lives in `docs/instructions/puzzle-screens.md`. This doc holds what is specific to
this family: the grid it is authored at, its generation rules, its deduction
techniques, how notes and undo work, how hints are phrased, and the two faces the
same board wears.

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
ever come out — so the search stops at the first such removal and the rest of the dig
is plain. It looks at a handful of removable squares rather than sweeping all 36,
because a breaker cannot exist early in a dig and the sweep is nearly the whole cost;
the look widens by itself as the board empties.

The top tier then lands about one attempt in fifty, and the attempt ceiling (60) turns
that into roughly seven boards in ten. **The rest come back a nearest miss rather than
a failure**: a board solvable by the tier's own ladder, unique, dug to the same floor,
which simply fell to a gentler reason. `grade` tells the two apart, so the offline seed
pass lists only the boards that hit (`puzzle-screens.md` §6.1) and a room whose bucket
is missing gets a slightly gentler board rather than none at all.

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

`claiming` is the mirror of `pointing`, and neither is redundant: given only the
singles and one of the two, `claiming` fires on 3 of 150 boards and `pointing` on 2.
Which one a board turns up is arbitrary, so a family carrying one would leave the
other's boards unexplained. They fold into a single **demand** (§5.2), because a tier
wanting a chamber-line reason should not care which way round it fired; the hint layer
still names the exact one, since a sentence about a chamber and a sentence about a row
are different sentences.

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

The chamber-line rung is the ceiling of a 6×6 and there is no fifth rung under it
waiting to be forced, so what separates wizard from master is not a new kind of
reasoning but the same reasoning with nothing handed over.

### 5.1 The floor is on the dig, not a gift afterwards

`minGivens` stops the digging early rather than handing squares back once it is
done. A gentle tier is not a board thinned to the bone and then propped back up —
it is a board that was never thinned that far. Handing squares back afterwards
would also retire the very rung the tier asked for: every extra given is a reason
the player no longer has to find.

### 5.2 The demands: what a tier is allowed to say

Three demands — `nakedSingle`, `hiddenSingle`, `boxLine` — over four techniques, so a
tier can ask for a chamber-line reason without caring which side of it fires (§4.2).

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
grid, not an oversight: this family is authored at one size because the upright
chambers are the shape it exists to show, and the catalogue records the consequence
(`PUZZLE_FAMILIES.md` §4.8). A tier ladder that pretended otherwise would be a table
of dials with nothing behind them.

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
the move is an imperative naming the marking — "rule 𓁹 out of the hatched spaces".
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

**A wash, and it has to be.** A treatment means one thing (`puzzle-screens.md` §4.2),
and the hint owns the marks: hatching is what it settles, a bright ring what it argues
from, the strong ring the square the player stands on, a red ground a repeat. The wash
is the signal left over, laid OVER the ground rather than replacing it, so a pre-filled
square that is also a twin still reads as the puzzle's own.

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

**The six signs are characters, not drawings.** The repo subsets and precaches Noto
Sans Egyptian Hieroglyphs (`yarn generate-font`), so a sign here does not ride on
whichever fonts a device happens to carry — which on this board would not be a
decoration that failed but an unsolvable puzzle, since telling one sign from another at
a glance IS the mechanic. One character serves the squares, the pad's keys and every
sentence that names a value: a hint naming a value is asking the player to go and find
it, so the words and the board have to show one shape.

They are picked for **silhouette** rather than for meaning — an eye, the sun, an ankh,
a house, an owl, the feather of truth: a wide eye, a disc, an upright cross, a squat
box, a bird, a tall plume. Six seated figures would be authentic and unplayable. And
for **where the ink sits in the em box**, which is a question only a typed sign has to
answer: a font sets a flat sign on the baseline, so a flat sign hangs at the foot of
its square while the rest stand in the middle of theirs, and a row whose signs are not
level reads as a row of squares that are not the same.

**A face says how large it writes** (`SudokuSkin.size`), because that is a property of
the characters rather than of the places they stand in: a figure fills about half of
its em box where a sign fills nearly all of one, so the register writes larger in the
square, the note and the pad key alike. The note is the one with a ceiling — six of
them share a square three across, so a sign wider than a third of it climbs over its
neighbours — which leaves a note on this face small, the honest cost of a text glyph at
a sixth of a phone screen.

The register is reached by the `scribe` role. A themed role needs four families in its
pool before it is worth authoring a site for (`src/worldGen/rolePools.spec.ts`), and
`scribe` is short of that, so until the pool fills the register is reached in the
puzzle lab and by a site naming the theme outright.

### 9.1 The completion run — each face finishes its own way

**A tick is never a SQUARE.** What the board asserts is that each of the six stands
exactly once in every row, every column and every chamber, and each face says back the
half its own ground can say:

- **Six Chambers reads its values back** — every square holding the 1 settles at once,
  then every square holding the 2, to the width of the grid. All six homes of a value
  lighting together is the rule seen from the value's side. The carved board blooms
  where a register would only flare: ink does not swell as it dries, and a sign that
  grew would read as the sheet moving under it.
- **The Scribe's Register files itself** — each chamber is taken up as its own scroll,
  one after the next in reading order. A chamber holding all six is the same rule seen
  from the chamber's side, and a finished sheet is not lit, it is rolled up and put
  away.

Which run plays is decided by the skin carrying a `scroll` or not, so a face that gains
a ground of its own gains a way of finishing with it. **One board finishes one way**:
the value run rewrites what every unfilled square shows while it counts, which under a
rolling sheet would be a board changing where nobody can see it.

**Each scroll is laid back out**, and that is the constraint rather than the flourish:
the solved board is the reward and the banner sits over it readable
(`puzzle-screens.md` §3), so six chambers left rolled up would file the answer away
before the player had looked at it. The run is a wave crossing the register and leaving
it as the player filled it in.

**A roll goes two thirds up its chamber, and the run takes the full second the shell
allows.** What a roll shows is an edge travelling, and it shows nothing where it has
arrived: taken to the head of its chamber the sheet covers every square in it, and six
flat rectangles blinking in and out is a board coming apart rather than a register being
filed.

The sheets are a layer laid OVER the grid rather than the squares moving: six squares
each scaling about their own middle is six squares shrinking, not one sheet rolling.
What a taken-up chamber uncovers is the board's own ground, the table the sheet lay on.

The shared rules apply (`puzzle-screens.md` §3): the run happens before the shell hears
"solved", input is refused while it plays, the whole thing is under a second, and
`prefers-reduced-motion` skips it entirely — the board is then simply the answer the
player filled in, unrolled and unlit.

## 10. Generation cost

Every tier but the top is a handful of milliseconds. Wizard is about a second and a
half, and all of it is the rarity of its rung (§3.1) rather than the dig itself — the
generator builds a whole candidate and then judges it, which is the shape
`puzzle-screens.md` §6.1 asks for. Play time runs a single attempt against a listed
seed, and the attempt ceiling is set for the fallback that runs when a bucket is
missing rather than for the offline pass, which asks for one attempt per seed either
way.

Where no bucket is listed, every board takes that fallback and is searched live: a
median of 1.0s and at most 1.2s at wizard, with about a third coming back a nearest
miss rather than a board that genuinely needs the chamber-line rung. The top tier's
character is not something to read off one or two rolls.

**Human solve times are not measured.** The budget is `PUZZLE_FAMILIES.md` §3.2's — ten
seconds to a few minutes, never an evening — and the instrument is the lab: pick the
family and the tier, solve the real screen, read the banner's clock. The table in §5
counts forced steps, which is what a solver can count and not what a person takes.

## 11. Measured and rejected

One line each, so nothing here is rebuilt on the strength of the idea alone.

- **Subset rungs** — naked and hidden pairs, both triples, x-wing: built, measured, and
  not one of them ever fired. A group only six squares wide leaves a pair one step
  behind a single that fires first, so every board they might have decided was already
  decided. They are worse than dead weight in the ladder: a `wizard` authored against a
  hidden pair generates nothing, or generates boards that quietly fall to a single. A
  9×9 would want them back.
- **Drawing the six signs as SVG strokes** — the better ink, an even reed-pen weight
  with every sign filling its box, but the board then drew its signs while its sentences
  typed them, and the two hands do not match. A hint pointing at something not quite
  there costs more than stroke weight is worth.
- **Water and a mouth at the first and fifth values** — flat signs, which a font sets on
  the baseline, so they hung at the foot of their squares while the other four stood in
  the middle of theirs.
