# Balance scale

Family doc. The catalogue entry (tier debut, weight, theme fit) lives in
`docs/game-design/PUZZLE_FAMILIES.md` §4.2; the screen bar every family must
clear lives in `docs/instructions/puzzle-screens.md`. This doc holds what is
specific to the balance scale: its generation rules, its deduction techniques,
and how hints are phrased.

## 1. Rules

A stack of balance scales, every one of them level. Each pan holds stone weights
(a number is written on them) and glyph weights (a scarab, a jar — the number is
not written on them). The same glyph weighs the same on every scale.

Give every glyph a weight so that all the scales stay level. That is the entire
rule — a board is readable without any text, because a scale that is wrong tips.

Vocabulary used throughout: a scale is an **equation**, and its **reduced form**
is what is left after substituting the weights the player has already given and
cancelling glyphs that appear on both pans — written `Σ coeff·glyph = constant`,
where a positive `coeff` means "this many more of that glyph on the left".

## 2. Why we define generation ourselves

The mechanic is old (the scale-and-unknowns worksheet), the generator is not.
The obvious construction — draw random pans, read the balance off them — makes
boards with the defects this family has to avoid:

- a glyph that never appears anywhere, or appears only in ways that cancel, so it
  can never be worked out,
- scales that carry no information (`5 = 2 + 3`, or a scale that repeats another),
- boards whose only route to an answer is trying every weight, which is the
  arithmetic drill this family exists to replace.

The whole point of the family is that it walks a child from arithmetic into
algebra (`PUZZLE_FAMILIES.md` §4.2), so the acceptance gate is not "is there an
answer" but **"is there a route made of algebra steps a child can name."** That
route is what §4 defines, and generation leans on it.

## 3. Generation gates

Draw a candidate the naive way, then **reject and redraw** unless all hold:

1. **Every glyph carries a distinct weight.** Two glyphs of equal weight are
   interchangeable to look at, and the board reads as if the player got one
   wrong.
2. **Every pan holds something, and no scale is a numbers-only identity.** A
   reduced form with no glyph left in it teaches nothing.
3. **No two scales reduce to the same equation.** A repeat is board clutter
   dressed as a clue.
4. **The technique solver settles every glyph** (§4) within the tier's technique
   cap, and **the deepest technique it needed is that cap.** The first half is
   solvability; the second is what makes the tier honest — a "difference" board
   that falls to one division is a junior board wearing an expert label.
5. **No scale is redundant.** Any scale whose removal leaves the board still
   settled at the same cap is dropped before the board ships. What is on screen
   is what is needed. (This is why a tier's authored scale count and its shipped
   one can differ — asking for three scales with two glyphs ships two.)
6. **The tier's own move actually comes up.** A tier that introduces cancelling
   demands at least one cancel; the tier that introduces trading demands two
   swaps, so it is a chain rather than a single lucky trade (§5).

Gate 4 subsumes uniqueness: if the techniques alone decide every glyph, each
step was forced, so no second set of weights works.

## 4. The technique ladder

### 4.0 The rule the ladder is built on

**The solver never reasons about a row the player cannot see.**

This was learned the hard way. The first build cancelled matching glyphs silently
inside the solver and then described the result, so on a scale plainly reading
`🪲 🏺 🐍 = 🏺 9` the hint said _"🪲 is the only one left"_ — true of a row that was
nowhere on the board. A playtester counted three 🪲 on screen and asked, fairly,
how they were supposed to see it.

So every reduction the solver performs is a **move the player makes**, and its
result is a **note**: a new row under the scales, drawn in the same pieces. A
technique may only read what is drawn — a scale, or a note the player wrote.

### 4.1 The rungs

Reading rungs settle a weight. They are what a board may _demand_, and what a
tier's cap is set from.

| #      | Technique         | Fires when                                                 | Produces                  |
| ------ | ----------------- | ---------------------------------------------------------- | ------------------------- |
| **T0** | Alone on the pan  | A row has one glyph left without a number, on its own pan  | That glyph's weight       |
| **T1** | Equal shares      | The same, with `k ≥ 2` copies of it, `k` dividing the rest | That glyph's weight       |
| **T2** | Difference of two | Two rows are the same apart from `k` of one glyph          | That glyph's weight       |
| **T3** | Swap              | A row holds one glyph **alone** on a pan                   | A note: that glyph traded |

A weight is only claimed when it is whole and inside the board's range; outside
that the technique stays silent rather than naming a weight no stone could be.
A glyph the player has already weighed counts as part of the numbers — its chip
carries its weight, so that is readable too.

**Cancelling is not a rung.** Taking the same thing off both pans settles
nothing; it redraws a row so more can be read. It is suggested only once nothing
can be read as the board stands — on a row that can already be read, reading it
is the move, not tidying it.

**And it is withheld below the tier that teaches it, because the move does the
arithmetic.** Take the 7 off both pans of `🐈 7 = 15` and the board reads `🐈 = 8`
— which is the entire starter puzzle, done by the game. A board must not hand out
its own answer, so at starter and junior the pieces on the scales are not
interactive at all: the only move is choosing a weight, and 15 − 7 is the
player's to do. From expert on, where the board is more than one subtraction,
the move is worth more than the sum it shortcuts.

| Move           | Fires when                                    | Costs the player |
| -------------- | --------------------------------------------- | ---------------- |
| Cancel a glyph | The same glyph stands on both pans of one row | One tap          |
| Cancel stones  | Both pans of one row hold plain numbers       | One tap          |

### 4.2 A move has to get somewhere

Every cancel and every swap is judged on the row it leads to, once there is
nothing more to take off both pans: it has to be a row that can be **read**, or
one that can be **traded from** (a glyph alone on a pan). Cancelling for tidiness
fills the board with rows nobody needed — the first build did exactly that, and
a wizard board grew six notes on the way to nothing.

This is deliberately strict, and it is a rule about the **puzzles**, not about
the solver. A looser test — "fewer different glyphs than before" — lets the
solver chase three-move chains and wander. Boards whose only route needs that are
simply not generated.

### 4.3 The swap rung, and why it is a swap

A row holding one glyph **alone** on a pan says what that glyph is worth
anywhere. So a copy of it elsewhere can be lifted out and the other pan's
contents put in its place. Worked on a real board:

```
🐍 🐍 = 🦅 🪶       swap the 🐍 for what row 2 says:  🦅 1 🐍 = 🦅 🪶
🐍 = 🦅 1          then take the 🦅 off both pans:     1 🐍 = 🪶
🦅 🪶 3 = 🐍 14
```

Two things make it a swap rather than the textbook "multiply this equation and
subtract that one". It is **physical** — taking a jar off a pan and putting its
equal in its place is what a balance is for — and it is a **tap**: the player taps
the glyph they want gone, then the row that answers it. The multiplier framing
computes the same thing with a reason a child cannot picture.

Two restrictions keep it a trade rather than algebra in disguise:

- the source must hold the glyph **alone on a pan** — `🦅 🐍 = 🏺 4` is true but
  says nothing about a single 🐍 that a player could act on;
- the target copy must have **no twin across the beam** — tapping a glyph that
  also stands opposite takes both off, so the board could not start a swap there
  even if the solver wanted one.

Loose stones on a pan are added up as the swap lands: `1 14` is drawn as `15`.

### 4.4 Deliberately absent

**Search ("the only weight that fits")** — enumerate the weights and keep the one
assignment that survives. It is exact, it subsumes the whole ladder, and it was
built and then removed: it produced _"no other weight for 🐈 keeps every scale
level: it weighs 10"_, which is a verdict, not a step.

**Scaling a whole scale before subtracting** (`2×(x + 3y) − (2x + y)`) — the same
power as the swap rung for the boards it reaches, with a reason that is a
manipulation rather than an observation. If a tier ever wants it taught, it is a
different rung, not a generalisation of this one.

**Negative and zero weights.** Every technique here assumes weights are at least
1, and so does the "a pan can't hold less than nothing" intuition the scale is
teaching.

## 5. Difficulty knobs

- **Technique cap** — the deepest technique a board may demand, and (per gate 4)
  the one it does demand. The honest dial.
- **Glyph count** — how many unknowns are in play at once.
- **Scale count and pan size** — how much board there is to read.
- **Weight range** — arithmetic load, and the size of the number palette.

Each tier adds **one** thing, and generation is made to prove it: the cap says
what a board must demand, and `minCancels` / `minSwaps` say the move the tier
introduces actually comes up, rather than turning up in a third of the draws.

| Tier    | Adds                    | Glyphs | Rows | Range | Cap             | Also demands       |
| ------- | ----------------------- | ------ | ---- | ----- | --------------- | ------------------ |
| starter | reading a row           | 1      | 1    | 1–10  | T0 alone        | cancelling **off** |
| junior  | sharing a number out    | 2      | 2    | 1–10  | T1 equal shares | cancelling **off** |
| expert  | cancelling + comparing  | 2      | 2    | 1–12  | T2 difference   | ≥1 cancel          |
| master  | more board, bigger sums | 3      | 3    | 1–15  | T2 difference   | ≥1 cancel          |
| wizard  | trading, in a chain     | 4      | 4    | 1–15  | T3 swap         | ≥2 swaps           |

"Cancelling off" is not only a generation setting: the pieces on those boards are
not interactive, because offering the move there would do the puzzle's arithmetic
(§4.1). Two bullets of rules at starter, five at wizard.

Measured over 200 boards a tier — pieces on the board at the start, and moves to
finish it:

| Tier    | Pieces | Cancels | Swaps | Weights read | Total moves |
| ------- | ------ | ------- | ----- | ------------ | ----------- |
| starter | 3.0    | 0       | 0     | 1            | 1.0         |
| junior  | 7.3    | 0       | 0     | 2            | 2.0         |
| expert  | 9.3    | 1.0     | 0     | 2            | 3.0         |
| master  | 13.5   | 1.3     | 0     | 3            | 4.3         |
| wizard  | 17.2   | 2.4     | 2.1   | 4            | 8.5         |

Three things fix the shape. **Below**, one glyph and one scale is genuinely the
bottom of the family's own scale (P4) — `🪲 7 = 15` is the whole board, and
cancelling is kept out of the first two tiers so that learning to read a scale is
not taxed by a second move. **Above**, the top tier is a chain: the row that comes
out of the first trade is what makes the second possible. **Sideways**, the number
palette caps the range — the player picks a weight from 1..range by tapping, and
past ~15 that row stops fitting a phone.

Wizard costs about 15ms to generate against under 2ms for the rest: `minSwaps: 2`
is a rare draw, so it takes more attempts to find one. That is a generation-time
cost on opening the puzzle, not a per-frame one.

## 6. Hints

Every technique is a hint, phrased in player language and rendered from
`{ techniqueId, glyph }` through a glyph-slot template — never a composed
sentence (`docs/instructions/puzzle-screens.md` §4).

**A hint only talks about rows on the board** (§4.0), and every sentence it says
is checkable against them. _"On the lit row, 🪲 is the only piece left without a
number on it"_ is either visibly true or the hint is broken.

**A hint names the move, never the weight.** The solver knows what every glyph
weighs at every step and says none of it: _"the two lit rows are the same apart
from the jar — compare them"_ leaves the player the deduction, where _"the jar
weighs 9"_ leaves them nothing. The arithmetic is the part worth doing, so the
hint's whole job is to point at where the next step is available, and its only
slot is the glyph it is about.

- **First duty** — a weight the player set that contradicts the answer outranks
  the whole ladder. Every technique reduces the scales using the weights already
  given, so past a wrong one the deductions are advice toward a dead end.
- **Which hint** — the cheapest technique that fires on the board as it stands.
- **Tie-break** — the topmost row involved, so hints walk down the board in the
  order it is read. Among cancels and swaps, the smallest resulting row wins: a
  note is something the player has to read.
- The hint lights the rows it reasons about and the glyph it names, and never
  sets a weight or writes a note itself. **The move stays the player's.**

## 7. Board requirements

Beyond the shared screen bar:

- **The tilt is the feedback.** A scale whose glyphs all have weights tips toward
  its heavier pan and levels when the weights are right. This is the family's
  whole teaching device and must be live, not a submit-and-check.
- **A scale with an unweighted glyph reads as unknown**, not as level. A board of
  level-looking scales that is not solved would be a lie.
- **Live pan totals** where they can be computed, so the arithmetic behind a move
  is checkable at a glance.
- Setting a weight is tap-glyph-then-tap-number; tapping the weight a glyph
  already has clears it. No typing (P2).
- **Tapping a piece does whatever the other pan allows.** A piece with its twin
  across the beam comes off both pans in **one tap** — the cancel — and the board
  marks such pieces so the pattern is findable without being told. A glyph with no
  twin starts a **swap**: the rows that say what it is worth light up, and tapping
  one writes the note.
- **A tap that can do nothing says so.** "Nothing here says what one 🐍 on its own
  is worth, and nothing opposite it matches" — a tap that quietly does nothing
  reads as a broken board.
- **The rules list only the moves this board affords**, and grows with it: two
  bullets plus one for taking things off both pans at starter, up to five at
  wizard. It is read off the board itself — more than one row, a piece with its
  match opposite, a swap-capped board — not off the tier, so what the page says
  you can do and what it lets you do cannot drift apart.
- **A note is a row under the scales**, drawn in the same glyphs and stones with
  an `=` instead of a beam: it is a relation the player worked out, not a scale
  standing in the room, so there is nothing to tilt. Notes are swappable in turn,
  can be thrown away, and are cleared by reset. They are what keeps the reasoning
  on the board rather than in the player's head.

## 8. Theming

The scale is a shape and the weights are numbers, so the skin carries the theme:
what the pans and beam are made of, which glyph set the unknowns are drawn from.
The family emits the glyphs, the numbers, and each scale's `left | level | right |
unknown` state; nothing about a theme reaches the puzzle logic.

## 9. Open questions

1. **Coefficient notation.** Three scarabs in a pan are drawn as three scarabs.
   That stops scaling somewhere (a pan of eight is a mess), and `3×𓆣` is the
   notation that fixes it — but reading `3×` is a step toward the symbolic algebra
   this family is supposed to sneak up on. Left as drawn until a tier needs it.
2. **Does the tilt make guessing too cheap?** Live feedback plus a small palette
   means a starter board can be brute-forced by tapping. That is fine at starter
   (the tilt is teaching what balance means) but it is worth watching whether it
   stays true at expert, where the palette is bigger and the scales interlock.
3. **Whether a wrong-weight hint should say which glyph.** It currently lights the
   glyph. The gentler version names only the scale that tips and lets the player
   find it — same trade-off Sumplete's first duty is being watched for.
4. **Whether the notes belong to this family or to the game.** Notes here are
   derived scales; a Latin-square or futoshiki wants pencil-marked candidates in a
   cell. Both are "the player records a deduction the board would otherwise make
   them hold in their head", cleared by reset, usable by the solver. What is
   actually shared is worth extracting once the second family has one — not
   before, and not by guessing which shape wins.
5. **Does the first encounter teach the cancel?** (P5) The move is one tap and the
   board marks the pieces it applies to, but nothing yet says _why_ a scale stays
   level when the same thing comes off both pans. That is the one idea this family
   rests on, and it is the one a wordless first instance should be built around.
6. **Do notes need a cap on screen?** The solver stops at five. A player can make
   as many as the swaps allow, and each takes a row under the scales — enough of
   them and the board stops fitting a phone. Watch whether real play ever gets
   near it before adding a limit that would have to explain itself.
