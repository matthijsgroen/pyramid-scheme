# story-and-time-brainstorm.md

Status: **brainstorm — exploration only, nothing decided, nothing scheduled.**
Companion to `PUZZLE_FAMILIES.md` (family catalogue), `TRAP_FAMILIES.md` (time limits),
`game-loop.md` (the three nested loops + the mosaic).

Two threads explored in one session, kept together because they meet: **puzzles that fuse logic, time
and mathematics**, and **a story that motivates across the whole game while the existing per-area
stories start showing up in the content**.

Nothing here is a commitment. The value is the inventory, the framings, and the named tensions.

---

## Part 0 — the one hard constraint, stated correctly

`PUZZLE_FAMILIES.md` P2 is about **solving**, not about prose:

- the player never *produces* language (taps, toggles, glyph placement — never typed words), and
- a board must be **solvable from its own state**, with instruction text as a hint layer only.

This game is text-rich by design — Fez speaks, areas have blurbs, tableaux carry vignettes. So story
prose is entirely in bounds. What's ruled out is a **puzzle whose input or clues are words**. A
zebra-style deduction puzzle fails that test: its clue list *is* the input. Icon-pair clues fix it.

Translation effort is a production cost to manage, not a design principle to design around.

---

# Part 1 — fusing logic, time and mathematics

## 1.1 Which "time"? Five senses, four usable

`PUZZLE_FAMILIES.md` already owns *time as subject* — sundial (§4.3), water clock (§4.4),
clock-arithmetic (§4.5). The unused senses are where fusion lives:

1. **Time as subject** — read a dial, compute a duration. *Built/specced.*
2. **Time as ordering** — before/after, precedence. Pure logic; becomes arithmetic once durations attach.
3. **Time as state evolution** — the board advances; you reason about a future or past state. *Richest.*
4. **Time as a spendable budget** — hours as a resource, each probe costing one. Pressure is arithmetic,
   not adrenaline.
5. **Time as pressure** — countdown. **Reserved for traps** (`TRAP_FAMILIES.md` §3 authors per-tier
   limits; `PUZZLE_FAMILIES.md` §12 draws the line: "if it involves a countdown, it's a trap"). Time in
   puzzles must be diegetic — the subject, not the player's clock.

## 1.2 Three mechanisms worth designing

### A. The Schedule Grid — cheapest, rides the shared grid engine
Rows are hours/watches, columns are actors (priest, water-carrier, mason, barge). Each actor once per
watch (Latin-square), each row's kept numbers hit a ration clue (kakuro/Sumplete), plus a few precedence
constraints rendered as glyph→glyph arrows.

- Fuses: the *axis* is time, the *constraint* is arithmetic, the *method* is elimination.
- Cost: low — a rules overlay on the grid engine (§5) plus the uniqueness verifier every grid family
  needs. No new interaction vocabulary.
- Themes: Scribe's Academy (roster), Valley of the Artisans (work gangs), Karnak (watch rotation).
- Failure mode: degenerating into "kakuro with a clock skin". The precedence clues must be load-bearing —
  some cells only deducible *through* the ordering.

### B. Clockwork — a cross-family modifier, not a family
The board **ticks**: set an initial configuration, it advances N steps by fixed rules, hit a target state
at tick T. Sandstorm (§12) hides clues in *space*; Clockwork moves them in *time* — same architectural
shape, so it wraps families that already exist.

- **Decan rings** — three star-rings advancing 1/2/3 per hour; aligning them is an LCM/modular argument
  wearing a star chart.
- **Obelisk shadow** — the shadow sweeps one column per hour. With the specced mirror/lightbeam family
  (§4.15): light the shrine *at the fifth hour*, not merely eventually — same tiles, new problem.
- **Rising water** — the level climbs a row per tick; arrange stepping stones so a path exists when the
  ferry arrives.
- Cost: medium but amortised — build tick/preview once, several families gain a variant.
- Hard part: legibility. The rule must be visible in the board's behaviour, so a **tick-scrub control is
  the design**, not a detail.

### C. The Nile Ledger — rate × duration, and it fills a flagged gap
Channels with flow rates (2, 3, 5 units/hour) and a flood lasting 12 hours; open and close them so every
field gets exactly its quota. Same shape as lamp oil at the Lighthouse or rations across a caravan.

- Fuses: rate × time = quantity is new curriculum (proportional reasoning), logic is which combination,
  time is the slot structure.
- Cost: medium — bespoke channel × hour UI; unique-by-construction if quotas are derived from a chosen plan.
- **Fills the Water & Nile gap `PUZZLE_FAMILIES.md` §11.1 names as the weakest theme (one family).**

### Also considered
- **Temporal deduction (zebra-lite)** — great logic, but only viable if every clue is an icon pair (Part 0).
- **Hours as currency** — each probe costs an hour from a budget. Teaches information economy, but
  "you ran out of hours" is a countdown in disguise. Parked.

## 1.3 Open questions (Part 1)

1. Modifier (a fourth axis on existing families) or new standalone families? A vs B is largely that.
2. Spine (produces a value, may gate the path) or side (optional rooms)? Solve-time variance argues side.
3. Does the curriculum want rate × time at all, or is that above the arithmetic ceiling?
4. Is a ticking, replayable board within the mobile UI budget, given §4.15 is still unbuilt?

---

# Part 2 — an overarching story, and journey stories that reach the content

## 2.1 What story material already exists

| Surface | Today | Where |
|---|---|---|
| Journey name + description | 29 authored blurbs; read once on the travel card, never referenced again | `public/locales/*/journeys.json` |
| Fez the companion | A working conversation system keyed by moment — but every line is *tutorial* | `src/app/fez/`, `fez.json` |
| Tableau vignettes | Real micro-fiction bound to content, per tomb *and position*: "Trade Blessing" / "The merchant is granted an ankh, sealing a prosperous deal." Tombs only. | `tableaus.json` `storyTemplates` / `descriptions` |
| The mosaic | 298 pieces revealing one **abstract** stained-glass window (200×343 SVG polygons), ring-by-ring outside-in. `game-loop.md` calls the finished picture "the natural ending — no additional final boss needed". | `src/mods/mosaic/`, `mosaicPieces.generated.ts` |
| The tier ladder | starter → wizard, each tier unlocked by the previous tomb's key/perk. Structure with no stated *why*. | `journeyStructure.ts`, treasure perks |

The journey names already sketch an arc nobody planned: **Dawn at the Sphinx** → scribes and markets →
temples and valleys → **Book of the Dead** → **Ra's Solar Journey**, **Chamber of Ma'at**, **Eternal
Pyramid**. Sunrise → learning → tombs → judgement → eternity.

## 2.2 It's two gaps, and they need different fixes

- **Horizontal (no arc):** nothing accumulates narratively across journeys. The mosaic accumulates
  visually but says nothing, so the only through-line is "bigger numbers".
- **Vertical (content ignores its journey):** families are allocated by tier and tag, indifferent to which
  journey they sit in — so the Scribe's Academy and the Nile Delta play identically.

Conflating them is the trap: an arc won't make the Delta feel like a delta, and per-journey content won't
give a reason to keep going.

## 2.3 Delivery vehicles for the arc

- **The mosaic as a narrative mural.** A whole-game accumulator with 298 beats, already the ending, is
  carrying an abstract pattern. Make it a stela / Book-of-the-Dead composition, and every revealed slice
  is a story beat. Reveal order becomes plot order — Egyptian murals are read in registers, which maps
  onto a reveal sequence naturally. Cost: an art commitment plus a reveal-order rule
  (`mosaicRevealOrder.ts`, currently ring-based). No new state, no new loop.
- **Fez as chapter narrator.** He already speaks at keyed moments; add one beat per journey arrival and
  per tomb opening — 29 beats and the spine is spoken. Cheapest *told* story and the only vehicle that can
  state what a picture can only imply. Given the game already carries micro-stories everywhere, this is
  arguably the most native vehicle, not a fallback.
- **Relics as chapters.** The five primary tombs already yield ward keys and perks. Say what they *are* —
  five parts of one thing, used at the wizard tier. The ladder gains a why, using the map-piece/key loop
  as built, and the tableau vignettes become chapter text.
- **A framing question (copy only).** The pitch already says no site is done until every gate is open.
  Reframe as a mystery: someone assembled all this, and the window is their message.

## 2.4 Five premises for the arc

**A. The scribe's unfinished message.** One scribe wrote something across Egypt; the tableaux are its
lines, assembling into a readable text. Explains hieroglyph collecting (learning their alphabet), and the
tomb tableaux already emit decrypted content in position order — accumulation is nearly free.

**B. Weighing your own heart.** The wizard tier *is* Book of the Dead → Ra's Solar Journey → Chamber of
Ma'at → Eternal Pyramid. Frame the game as the approach to judgement: each tomb treasure a deed recorded,
the mural's last panel the scale. Needs no new fiction — only saying out loud what the tier names imply.

**C. Restoring the passage.** Something is broken — the flood won't come, the barque is stuck — and each
tier repairs one system. Urgency without a timer; also the most generic of the five.

**D. The predecessor.** You follow an earlier explorer whose notes turn up in the sites. Tiny text budget
(fragments are already a reward type), Fez reacts, motivates by curiosity rather than plot delivery.

**E. Fez's own stake.** He wants something — last of his kind, a home, a debt. Cheapest of all, and
relational motivation is usually strongest for children. Doesn't explain the pyramids.

They compose: **D or E supplies the *why now*; A or B supplies the *what it means*.**

**Chapter granularity:** five tiers = five chapters, because tombs already gate tiers — a chapter ends
when a tomb opens. The 29 areas are scenes inside chapters. No premise above holds 29 beats, and
pretending otherwise is how a story becomes filler.

## 2.5 Making the existing blurbs bite — two cheap halves

**(a) Bind families to journeys.** The blurbs are written; the fix is *binding*, not authoring — one
hand-made table from each journey to family weights, read by the encounter allocator:

| Journey (existing blurb) | What it already says | Families it implies |
|---|---|---|
| Scribe's Academy | "learn the art of hieroglyphic writing" | cross-sum, sequence, doubling |
| Temple of Thoth | "god of wisdom" | Latin-square, logic grids |
| Lighthouse of Alexandria | "navigate the mathematical principles" | sundial, water clock, mirror |
| Sacred Ibis Migration | "patterns used to predict the flood" | sequence, pattern, rate × time |
| Nile Delta Expedition | "the river's annual flood" | water clock, rate × time |
| Valley of the Kings | "elaborate tomb chambers" | nonogram, kakuro |
| Chamber of Ma'at | "balance divine mathematics" | balance scale |

`PUZZLE_FAMILIES.md` §11.1 already tabulates theme → families by hand; this is the same table keyed by
**journey**, which is the form an allocator can consume. That one table is the difference between 20
journeys and one journey twenty times.

**(b) A micro-story per floor, bound to the room it's in.** In the voice the tableau vignettes already
use. Pyramids have no equivalent of `storyTemplates`; copying that per-position key pattern
(`journeyId.floorN.beatM`) gives every floor a line that refers to the puzzle actually there.

Families make places **play** differently; those lines make them **read** differently. Together, that is
what "the story reaches the content" means.

## 2.6 Honest read on motivation

Story lives at the seams — arrival, completion, reveal. It buys a reason to return tomorrow and a frame
that makes repetition feel like advancement. It does not make a sum more interesting; that's the puzzle's
job. Put narrative mid-puzzle and it becomes the thing players tap through.

## 2.7 Open questions (Part 2)

1. **Discovered or told?** The mural implies an arc; Fez states one. This decides whether the work is art
   or copy — and both are legitimate (Part 0).
2. Is the mosaic's image negotiable? Making it narrative is the highest-leverage single change available,
   but it means committing to an image and re-ordering the reveal.
3. Which hurts more right now — *no reason to keep going* (§2.3/§2.4) or *every place feels the same*
   (§2.5)?
4. Do the five primary tombs want to be chapters of one story, or stay independent vaults?
5. Should the mural's story be the **player's** (an explorer's expedition) or **mythic** (the soul's
   journey)? Mythic is more beautiful; personal motivates more directly.

---

## Cheapest probes, if this ever moves

- **For Part 2, vertical:** build table (a) for five journeys only and play them back to back. If they
  don't feel like different places, the family catalogue is too narrow, not the binding.
- **For Part 2, horizontal:** write the five-chapter beat sheet for two premises against the existing
  journey names and pick from the concrete versions rather than the pitches.
- **For Part 1:** the Schedule Grid is the only mechanism that needs no new engine — one authored instance
  answers whether time-as-an-axis is actually fun before any tick machinery exists.
