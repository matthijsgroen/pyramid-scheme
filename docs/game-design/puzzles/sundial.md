# Sundial

Family doc. The catalogue entry (tier debut, weight, theme fit) lives in
`docs/game-design/PUZZLE_FAMILIES.md` §4.3; the screen bar every family must
clear lives in `docs/instructions/puzzle-screens.md`. This doc holds what is
specific to the sundial: what the player is actually deducing, its technique
ladder, and how its two pieces of evidence fit together.

> **Nothing here is built or measured.** Every number in this document is a
> target or an estimate, and is marked as such. The families that ship carry
> measured figures; this one carries none yet, and no reader should treat a
> figure below as a finding.

## 1. Rules

An obelisk stands on a graduated floor. The sun casts its shadow across the
marks. Somewhere on the rim is the hour the shadow is telling — the player
places a marker on it.

Two things about a shadow carry information, and the family turns on both:

- **Where it points** gives the hour, but only within the half-day — the same
  direction serves a morning hour and an afternoon one.
- **How long it is** says how high the sun stands, which picks between them. A
  short shadow belongs to the middle of the day; a long one to its edges.

That is the entire rule, and a board carries no language: the marks are
countable, the shadow is drawn, the marker is dragged.

## 2. Why this family, next to the ones we have

**Every family we own is a lattice of cells.** Sumplete, futoshiki, lightbeam and
balance scale are four rule sets on one shape of screen. A player three rooms
into a floor has been asked to scan a grid four times. The sundial is the first
**analog** board — an angle, an arc, a length — and the freshness that buys is out
of proportion to what it costs, because it is freshness of _form_ and not of
rules.

It is also the first family under a minute. §11.2 weights every family we have at
Med or higher; §8 wants short rooms between long ones and we currently have
nothing to put there. A room cleared in twenty seconds is not a lesser room, it
is the one that lets the floor breathe.

And it is the cheap one: generation is enumeration over a handful of candidate
hours, with no thinning loop and no rejection gate. Compare futoshiki's ~300ms
wizard board.

## 3. The problem this family has to solve first

Read literally, `PUZZLE_FAMILIES.md` §4.3 describes a **reading exercise**: the
shadow falls somewhere, that reading _is_ the value. That is not deduction, and
it would make this the catalogue's first family to break **P1** — "recover the
hidden state by reasoning from constraints".

So the family is not "what time is it". It is **"which hour is consistent with
everything the floor shows you"**, and the shadow's two facts are what make that a
question worth asking: direction alone always leaves two answers, and something
else has to settle it.

This also settles **P2** by construction. A dial the player must _read_ demands
that they already know how clocks work — cultural knowledge, and exactly what
P2's pre-literate-kid bonus rules out. A dial where evidence must be _reconciled_
is solvable by counting marks and comparing two lengths, in any language or none.

## 4. The deduction ladder

Ordered the same way futoshiki's is: by how well the reason explains itself, not
by how much it decides. Every rung has to be a sentence the player could repeat
back.

| #      | Technique           | Fires when                                            | Decides                           |
| ------ | ------------------- | ----------------------------------------------------- | --------------------------------- |
| **T0** | Direct strike       | The shadow lies along a graduation                    | That mark is the hour             |
| **T1** | Between marks       | The shadow falls between two graduations              | The finer scale divides them      |
| **T2** | Length picks a half | Direction leaves two candidate hours                  | The shadow's length rules one out |
| **T3** | Shadows agree       | A second gnomon stands at a different height or place | Only one hour suits both          |
| **T4** | Wrap                | Counting runs off the end of the marks                | It begins again at the first      |

### 4.1 T2 is the family, not a rung on it

T0 and T1 exist so that the board can teach itself — a first encounter (P5) is a
shadow lying flat on a mark and nothing else. But a board that never reaches T2
is the reading exercise §3 rejects, so **every tier above the debut must demand at
least T2**. The `requires` gate futoshiki grew for exactly this purpose is the
mechanism, and this family should carry it from the first commit rather than
discovering the need later.

### 4.2 T3 is where the family scales

Two shadows is the knob that keeps working: a second gnomon adds evidence without
adding rules, and the player already knows how to read one. It is also the point
where the board stops being answerable at a glance, which is what earns the tier.

### 4.3 What is deliberately absent

**Minutes.** Precision finer than a quarter-hour turns the puzzle into
protractor-reading, and the tap-target bar (§9) would not survive it.

**Modular arithmetic as such.** Clock arithmetic is its own family (§4.5) at T4–T5
and reuses this dial face. T4 above is the wrap a _reading_ runs into, not "the
ritual lasts six hours, when does it end" — that question belongs to the other
family and should stay there.

## 5. Generation

Enumeration, not construction:

1. Pick the answer hour, seeded.
2. Compute the shadow it casts — direction from the hour, length from the sun's
   height at that hour.
3. Choose what the board shows: the graduation count, whether length is drawn,
   how many gnomons.
4. **Solve it with the technique ladder.** Enumerate every hour the marks admit
   and keep only the ones consistent with the drawn evidence. Exactly one
   survivor, reached within the tier's cap, or discard and redraw.

Uniqueness is not assumed from construction — it is checked, because step 3 can
easily show too little. A board where direction is drawn and length is not has
two answers, and that is a bug rather than a difficulty.

The candidate space is a couple of dozen hours, so the whole solve is trivial.
This family has no generation-cost section worth writing, which is itself part of
the pitch.

## 6. Difficulty knobs

- **Graduation precision** — hour, then half, then quarter.
- **Whether length is drawn** — withholding it is not harder, it is _unsolvable_;
  the knob is whether length is _needed_, which means whether direction alone
  already settles the hour.
- **Gnomon count** — one, then two (T3).
- **12 vs 24 marks**, and whether the answer crosses the day/night boundary (T4).

| Tier    | Marks       | Gnomons | Requires |
| ------- | ----------- | ------- | -------- |
| starter | 12, hour    | 1       | —        |
| junior  | 12, half    | 1       | T2       |
| expert  | 12, quarter | 1       | T2       |
| master  | 24, half    | 2       | T3       |
| wizard  | 24, quarter | 2       | T3, wrap |

**Proposed, not measured.** §7's curriculum map has this family entering at T2 and
running to T5; the row above debuts it a tier earlier, at its very simplest, on
P4's grounds — a single shadow on a single mark is a self-teaching board and the
stone tier has nothing else this short. That is a change to the curriculum map
and should be argued there rather than assumed here.

## 7. Controls

A **marker dragged around the rim**, snapping to graduations. Not a tap on a mark:
at 24 marks on a 318px board the marks sit about 41px apart, under the 44px bar,
and a drag with snapping keeps one large target instead of twenty-four small
ones. Reset returns the marker to the first mark; hint and back come from the
shell, as `puzzle-screens.md` §3 requires.

The player never types and never chooses from a list of sentences.

## 8. Hints

One per rung, rendered from `{ techniqueId, params }` through numeric-slot
templates — never a composed sentence (`puzzle-screens.md` §4).

- **T0** — "The shadow lies right along this mark."
- **T1** — "The shadow falls between these two marks; the small marks divide them
  into quarters."
- **T2** — "A shadow this short belongs to the middle of the day, not its edges."
- **T3** — "Only one hour puts both shadows where they are."
- **T4** — "Counting past the last mark starts again at the first."

The hint highlights the evidence it reasons from — the shadow, the mark, the
second gnomon — so "this one is too short" has something to point at. It never
moves the marker.

## 9. Board requirements

Beyond the shared screen bar:

- **The marks are countable.** A player who cannot read a clock must still be able
  to work out which mark is which by counting from a distinguished one. That means
  one mark is visibly the first.
- **Length reads as length.** The shadow's end must be unambiguous — a soft edge
  or a gradient makes T2 a guess. This is the single hardest visual requirement in
  the family and the one most likely to fail playtest.
- **Two shadows are visibly two.** At T3 the second gnomon and its shadow must not
  read as decoration.
- **Nothing but shadow is drawn as a dark band**, the same discipline lightbeam
  keeps for its beam (§9 there).
- Live feedback: the marker snapped to a mark shows what hour it claims, wordlessly
  — by the mark it sits on, not by a number appearing.

## 10. Theming

The family emits logical state only — `mark(index, major|minor) | gnomon | shadow
(direction, length) | marker` — and the skin decides what any of it looks like.

**Two skins are already called for:**

- **Day / sun.** Obelisk on a temple floor. The default.
- **Night / decan star-clock.** `PUZZLE_FAMILIES.md` §4.3 names it, and the
  Lighthouse of Alexandria journey (`junior_4`) needs it: that journey is authored
  `background: { time: "night" }`, so a sun shadow contradicts the sky the player
  is looking at. The decan variant keeps every rule — a sighting line instead of a
  shadow, a star's height instead of the sun's — and changes only the art.

Whether the night version is a skin or a second family is **§11's first open
question**, and it is a real fork rather than a formality.

**Placement.** Filling a journey with light puzzles needs no engine work:
`placeEncounters.ts` resolves a floor as `allocate(roleOf(floor.encounter,
"puzzle"), …)`, so a floor may author a role and the allocator draws from that
tag's pool. Giving this family and lightbeam a shared `light` tag alongside
`puzzle`, and authoring the lighthouse floors with that role, is the whole
mechanism. (Note `FamilyMeta.themes` is the _skin_ list and not this — the
narrative cluster of §11.1 has no field of its own.)

## 11. Open questions

1. **Is the night version a skin or a family?** If the decan star-clock needs its
   own rules rather than its own art, this doc describes two families and they
   should be priced as two. Settle this before building, because it decides
   whether the state the component emits is one vocabulary or two.
2. **Does T2 survive contact?** "Short means midday" is a real deduction on paper.
   Whether it is a satisfying one, or a coin-flip the player makes and moves on
   from, is a playtest question and the premise of the family rests on it. Worth
   hand-authoring a dozen boards in the puzzle lab before a generator is written.
3. **Does snapping empty the puzzle?** Snap too coarsely and the drag becomes a
   choice between two visible answers. The graduation count and the snap radius
   are the same knob and cannot be tuned independently.
4. **Should this family debut at T1?** §6's table says yes on P4 grounds and §7's
   curriculum map says T2. One of them is wrong; the map is the one to change if
   the stone tier turns out to want a short room more than it wants a third
   arithmetic one.
5. **Does the obelisk shadow want to be shared with lightbeam?**
   `lightbeam.md` §11 already proposes "light the shrine at the fifth hour" — the
   same shadow sweeping one column per hour, blocked on a tick/scrub control and on
   hours-as-position. Building this family supplies both. Whether that variant then
   belongs to lightbeam, to this family, or to neither is worth deciding once both
   exist rather than now.
