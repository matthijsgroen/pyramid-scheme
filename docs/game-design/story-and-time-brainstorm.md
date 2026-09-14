# story-and-time-brainstorm.md

Status: **Parts 1 and 2 are exploration — nothing decided, nothing scheduled. Part 3 is built** and
describes what the game does today.
Companion to `PUZZLE_FAMILIES.md` (family catalogue), `TRAP_FAMILIES.md` (time limits),
`game-loop.md` (the three nested loops + the mosaic).

Two threads explored in one session, kept together because they meet: **puzzles that fuse logic, time
and mathematics**, and **a story that motivates across the whole game while the existing per-area
stories start showing up in the content**. The second thread produced the five-panel mosaic, which is
now the shipped mechanic.

Nothing in Parts 1 and 2 is a commitment. Their value is the inventory, the framings, and the named
tensions.

---

## Part 0 — the one hard constraint, stated correctly

`PUZZLE_FAMILIES.md` P2 is about **solving**, not about prose:

- the player never _produces_ language (taps, toggles, glyph placement — never typed words), and
- a board must be **solvable from its own state**, with instruction text as a hint layer only.

This game is text-rich by design — Fez speaks, areas have blurbs, tableaux carry vignettes. So story
prose is entirely in bounds. What's ruled out is a **puzzle whose input or clues are words**. A
zebra-style deduction puzzle fails that test: its clue list _is_ the input. Icon-pair clues fix it.

Translation effort is a production cost to manage, not a design principle to design around.

---

# Part 1 — fusing logic, time and mathematics

## 1.1 Which "time"? Five senses, four usable

`PUZZLE_FAMILIES.md` owns _time as subject_ — but all three families this section was written around
were dropped and now sit in its §4.99: sundial (§4.3), water clock (§4.4) and clock-arithmetic (§4.5).
Time as a subject is served by **procession** (§4.29, built) for duration and by the **`clock-reflex`
trap** (`TRAP_FAMILIES.md` §5.2, built) for reading a dial. The unused senses are where fusion lives:

1. **Time as subject** — read a dial, compute a duration. _Built/specced._
2. **Time as ordering** — before/after, precedence. Pure logic; becomes arithmetic once durations attach.
3. **Time as state evolution** — the board advances; you reason about a future or past state. _Richest._
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

- Fuses: the _axis_ is time, the _constraint_ is arithmetic, the _method_ is elimination.
- Cost: low — a rules overlay on the grid engine (§5) plus the uniqueness verifier every grid family
  needs. No new interaction vocabulary.
- Themes: Scribe's Academy (roster), Valley of the Artisans (work gangs), Karnak (watch rotation).
- Failure mode: degenerating into "kakuro with a clock skin". The precedence clues must be load-bearing —
  some cells only deducible _through_ the ordering.

### B. Clockwork — a cross-family modifier, not a family

The board **ticks**: set an initial configuration, it advances N steps by fixed rules, hit a target state
at tick T. Sandstorm (§12) hides clues in _space_; Clockwork moves them in _time_ — same architectural
shape, so it wraps families that already exist.

- **Decan rings** — three star-rings advancing 1/2/3 per hour; aligning them is an LCM/modular argument
  wearing a star chart.
- **Obelisk shadow** — the shadow sweeps one column per hour. With the specced mirror/lightbeam family
  (§4.15): light the shrine _at the fifth hour_, not merely eventually — same tiles, new problem.
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

| Surface                    | Today                                                                                                                                                                                                         | Where                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Journey name + description | 29 authored blurbs; read once on the travel card, never referenced again                                                                                                                                      | `public/locales/*/journeys.json`                  |
| Fez the companion          | A working conversation system keyed by moment — but every line is _tutorial_                                                                                                                                  | `src/app/fez/`, `fez.json`                        |
| Tableau vignettes          | Real micro-fiction bound to content, per tomb _and position_: "Trade Blessing" / "The merchant is granted an ankh, sealing a prosperous deal." Tombs only.                                                    | `tableaus.json` `storyTemplates` / `descriptions` |
| The mosaic                 | 298 pieces revealing one **abstract** stained-glass window (200×343 SVG polygons), ring-by-ring outside-in. `game-loop.md` calls the finished picture "the natural ending — no additional final boss needed". | `src/mods/mosaic/`, `mosaicPieces.generated.ts`   |
| The tier ladder            | starter → wizard, each tier unlocked by the previous tomb's key/perk. Structure with no stated _why_.                                                                                                         | `journeyStructure.ts`, treasure perks             |

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
  per tomb opening — 29 beats and the spine is spoken. Cheapest _told_ story and the only vehicle that can
  state what a picture can only imply. Given the game already carries micro-stories everywhere, this is
  arguably the most native vehicle, not a fallback.
- **Relics as chapters.** The five primary tombs already yield ward keys and perks. Say what they _are_ —
  five parts of one thing, used at the wizard tier. The ladder gains a why, using the map-piece/key loop
  as built, and the tableau vignettes become chapter text.
- **A framing question (copy only).** The pitch already says no site is done until every gate is open.
  Reframe as a mystery: someone assembled all this, and the window is their message.

## 2.4 Five premises for the arc

**A. The scribe's unfinished message.** One scribe wrote something across Egypt; the tableaux are its
lines, assembling into a readable text. Explains hieroglyph collecting (learning their alphabet), and the
tomb tableaux already emit decrypted content in position order — accumulation is nearly free.

**B. Weighing your own heart.** The wizard tier _is_ Book of the Dead → Ra's Solar Journey → Chamber of
Ma'at → Eternal Pyramid. Frame the game as the approach to judgement: each tomb treasure a deed recorded,
the mural's last panel the scale. Needs no new fiction — only saying out loud what the tier names imply.

**C. Restoring the passage.** Something is broken — the flood won't come, the barque is stuck — and each
tier repairs one system. Urgency without a timer; also the most generic of the five.

**D. The predecessor.** You follow an earlier explorer whose notes turn up in the sites. Tiny text budget
(fragments are already a reward type), Fez reacts, motivates by curiosity rather than plot delivery.

**E. Fez's own stake.** He wants something — last of his kind, a home, a debt. Cheapest of all, and
relational motivation is usually strongest for children. Doesn't explain the pyramids.

They compose: **D or E supplies the _why now_; A or B supplies the _what it means_.**

**Chapter granularity:** five tiers = five chapters, because tombs already gate tiers — a chapter ends
when a tomb opens. The 29 areas are scenes inside chapters. No premise above holds 29 beats, and
pretending otherwise is how a story becomes filler.

## 2.5 Making the existing blurbs bite — two cheap halves

**(a) Bind families to journeys.** The blurbs are written; the fix is _binding_, not authoring — one
hand-made table from each journey to family weights, read by the encounter allocator:

| Journey (existing blurb) | What it already says                    | Families it implies            |
| ------------------------ | --------------------------------------- | ------------------------------ |
| Scribe's Academy         | "learn the art of hieroglyphic writing" | cross-sum, sequence, doubling  |
| Temple of Thoth          | "god of wisdom"                         | Latin-square, logic grids      |
| Lighthouse of Alexandria | "navigate the mathematical principles"  | sundial, water clock, mirror   |
| Sacred Ibis Migration    | "patterns used to predict the flood"    | sequence, pattern, rate × time |
| Nile Delta Expedition    | "the river's annual flood"              | water clock, rate × time       |
| Valley of the Kings      | "elaborate tomb chambers"               | nonogram, kakuro               |
| Chamber of Ma'at         | "balance divine mathematics"            | balance scale                  |

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
3. Which hurts more right now — _no reason to keep going_ (§2.3/§2.4) or _every place feels the same_
   (§2.5)?
4. Do the five primary tombs want to be chapters of one story, or stay independent vaults?
5. Should the mural's story be the **player's** (an explorer's expedition) or **mythic** (the soul's
   journey)? Mythic is more beautiful; personal motivates more directly.

---

# Part 3 — the five-panel mosaic, worked out

Developed further than the rest of this doc, because the pieces already exist in code.

## 3.1 What the pipeline already does (and throws away)

`scripts/traceMask.ts` traces `src/assets/stained-glass.png` into polygons and hands each one to a
(journey, level) reveal step. A pixel is **leading** only when it is both dark (`THRESHOLD 45`) and
unsaturated (`LEAD_SATURATION 40`), and anything under `MIN_PIXELS 40` is dropped. Two consequences worth
holding on to: a deep lapis or oxblood fill is a cell, and so is a shape _painted_ black, because the
artwork's leading sits near 0 while painted black sits around 60. The artwork is its own mask, so there is
no second file to keep in sync. Polygons render as a dark overlay; revealing a piece makes it transparent.

Region assignment is by **horizontal register**: the image is cut into five equal bands, band _n_ belongs
to tier _n_, and within a band the regions are handed out left to right across that tier's journeys and
levels. `mosaicRevealOrder.ts` therefore reduces to canonical journey order.

Each register is fed by its own pool of loot (`MOSAIC_CURRENCIES`, one capped currency per tier, each
taking only nodes of its own difficulty), and the player sets found pieces in by hand on the mosaic
screen. So a register finishes when its tier is picked clean, in whatever order that happens — which is
what lets a completed panel fire its own beat with the player watching.

**What sets the collectible count is `journeys.ts`, not the art.** Pieces collected =
`LEVEL_STEPS.length` = every journey's `levelCount × 2`, currently 252. Traced regions (1927) are the
polygons that uncover _per step_, so tracing granularity is a **visual** dial and the art can neither
overshoot nor undershoot a loot target. The one thing that does bind: a register needs at least as many
regions as its tier has steps, or some steps uncover nothing (32/44/52/58/66; the shipped window carries
305/330/488/429/375).
`MOSAIC_TOTAL` and the tracer's `JOURNEY_LEVELS` are both derived from these sources rather than
hand-synced; when they were copies they had already drifted (298 vs 252).

The phase-3 capped pass still hard-fails if it can't place every piece, so the mosaic total has to fit
the world's free-slot supply — but that is a `levelCount` question, not an art question.

## 3.2 The constraint that picks the story shape

**Panels can complete out of order and late** — the game's own pitch is that old sites reopen with later
keys, so starter's panel may well finish last. That rules out a plot spread across registers (beat 4
before beat 2 reads as broken) and favours **self-contained scenes whose arrangement carries the arc**.

## 3.3 The five panels

### Why these five

Not "gods the blurbs happen to mention". The five are **the things the builders believed you need in order
to get through the door** — and each one is what the player actually spends that tier doing. The mural
explains the game's own systems as belief:

| Panel                     | Belief                                 | The tier mechanic it explains            |
| ------------------------- | -------------------------------------- | ---------------------------------------- |
| The Guardian at the Door  | the door is protected                  | ward gates, location keys, locked tombs  |
| The First Lesson          | you must be able to write and count    | the arithmetic families                  |
| Letting the Sun In        | you must measure the sky exactly       | sundial, water clock, mirror/lightbeam   |
| The Green King            | dead isn't finished — things come back | old sites reopening with later-tier keys |
| The Feather and the Heart | it is weighed, and it must balance     | the balance-scale family, and the finale |

Osiris ↔ _going back into a finished site with a new key_ is the strongest of the five, and it's the one
the pitch already leans on.

This also settles the player's connection: **the record is of you.** A panel completes because you cleared
that tier, so out-of-order completion (§3.2) reads as "you went back and finished it" rather than as a
broken plot.

### The panels themselves

Each panel depicts an **action**, never a portrait, and each caption names the action rather than the
god — so nothing requires prior knowledge of Egyptian myth. Fez supplies the name _after_ the player has
recognised the scene: see it → understand it → learn what it's called. The deities are all sourced from
journey blurbs that already exist.

| Panel   | Caption                   | Figure         | Sourced from                                                           |
| ------- | ------------------------- | -------------- | ---------------------------------------------------------------------- |
| Starter | The Guardian at the Door  | Bastet         | "Temple of Bastet… protection from evil spirits"                       |
| Junior  | The First Lesson          | Thoth          | "Temple of Thoth, god of wisdom and writing" + Sacred Ibis Migration   |
| Expert  | Letting the Sun In        | Amun-Ra        | "Karnak… dedicated to Amun-Ra"                                         |
| Master  | The Green King            | Osiris         | "Book of the Dead… guide souls through the underworld", Hall of Osiris |
| Wizard  | The Feather and the Heart | Ma'at + Anubis | "Chamber of Ma'at… weighs the hearts of the dead"                      |

Assembled, the registers stack into the existing Anubis window: he presides, and the five scenes are his
record. **The current artwork already implies this story** — Anubis is the psychopomp who steadies the
scale — so the finale needs no new subject, only the registers.

### Scene briefs

1. **The Guardian at the Door** — night, a mud-brick doorway. A cat on the threshold, back arched, facing
   a snake retreating into the dark. Behind her, a family asleep. A bowl of milk left by the step.
2. **The First Lesson** — a scribe cross-legged, palette on knee, reed pen in hand. Behind him an
   ibis-headed figure leans in, one hand steadying the scribe's wrist — teaching, not commanding.
3. **Letting the Sun In** — dawn at Karnak between two enormous columns; a shaft of light runs the hall
   and lands on a small gold shrine. Priests stand aside, one with a censer. Sun disc between the pylons.
4. **The Green King** — a seated king, green-skinned, wrapped, crook and flail crossed. Barley sprouting
   out of the wrappings. Behind him the flood line of the Nile across a dark field.
5. **The Feather and the Heart** — a great balance: a heart in one pan, a single ostrich feather in the
   other, beam level. A jackal-headed figure steadies it; the ibis-scribe waits to write the result. A
   doorway of light behind.

### Fez's completion beats

Three lines each, matching his existing voice (first-person plural, short, practical). Every third line
turns back to what the _player_ has been doing — that's what stops it reading as a museum placard.

**Starter:** "A cat in the doorway, and a snake leaving in a hurry. That was worth a bowl of milk." /
"Egyptians loved cats for exactly this — they killed the snakes and the rats that got into the grain." /
"They loved them so much they made one a goddess. Bastet. Protector of the house, the door, everyone
asleep behind it."

**Junior:** "Look at his hand — someone's showing him how to hold the pen." / "The bird-headed one is
Thoth. Writing, counting, keeping the records — all his." / "The ibis we followed up the river? That's his
bird. Every number we've filled into a wall belongs to him too."

**Expert:** "That light isn't luck. They built the whole hall so it would land right there, on the right
morning." / "The sun is Amun-Ra — the hidden one, and the light everyone can see. Both at once." / "Anyone
who can measure the sky that precisely can measure anything. We've been solving their arithmetic all this
way."

**Master:** "Green skin, and wheat growing straight out of him. That's on purpose." / "Osiris. He was
killed, and put back together, and now he's what comes back every year when the river floods the fields."
/ "Down here that's the whole idea: dead isn't finished. Cheerful thought for a tomb, isn't it?"

**Wizard:** "A heart on one side. One feather on the other. And it's balancing." / "The feather is Ma'at —
truth, balance, the way things are supposed to be. Heavier heart than that feather and you don't go
through the door." / "The jackal steadying the scale is Anubis. He's the one who walks you here."

**Finale (all five):** "Stand back a moment. Look at what we've been carrying up out of those pyramids." /
"Every piece is part of him — the one who steadies the scale. He's been watching the whole way." / "That's
his record of us. And I'd say it balances."

≈18 short strings total.

## 3.4 Where Fez belongs

**Not painted into the mural — the voice that reads it.** Put him in a 3000-year-old stela and he's either
a god (wrecking his chatty, mercantile, present-tense register) or a gag (undercutting the one moment the
game plays straight). A completed panel is instead the natural _trigger_ for a Fez beat, which gives the
chapter narration from §2.3 a real cue and something on screen to point at.

Two ways to give him presence without making him mythic:

- **The gecko wink** — a small lizard tucked in the corner of every panel, as though it wandered into the
  artwork. Five geckos; the one in the final panel wears a fez.
- **The stall is his.** _Decided._ The shop family is `fez-shop`, titled "Fez's Stall", and he owns it. His
  arrival line today ("Ah, a shop! I always keep a bit of coin handy for occasions like this.",
  `fez.json` `shopArrival`) reads as a customer and has to change.

### Fez the trader — the _why now_ (decided)

He travels with you because he's **looking for nice items to sell**. Stated once at the start of the game,
then paid off the first time a stall opens: he looks over what's on the counter and pitches it. That is
§2.4's premise E, sourced from a seam the code already has rather than new fiction, and it costs copy only.

Three beats, in his existing register:

- **Game start** — one line: he's along because pyramids have things worth selling.
- **First shop visit ever** — he owns up to the stall being his, and pitches the stock ("found this two
  tombs back…"). Per-item pitch lines make the shop feel authored instead of a price list.
- **Later visits** — the current short arrival line, shorn of the customer framing.

Implementation shape: none of it needs new state. A conversation already records whether it has been
told and reports `seen-earlier` when it has, so the first stall shows `shopFirstVisit` and every later one
falls through to `shopArrival`. Nothing in world-gen changes — this is `fez.json` and four lines of wiring.

Still unwritten: **per-item pitch lines**, so the counter reads as things he carried out of somewhere
rather than a price list. The first-visit conversation gestures at one item; a line per stock item would
do it properly.

### His arc: he prices the pieces, then stops pricing them

The stall already sells mosaic pieces, so **Fez has been feeding the window all game without knowing what
he was trading.** That is his connection to the mural, and it needs no new mechanic:

- **Early** — pieces are pretty junk with a price on them. He's pleased you keep buying.
- **Middle** — a panel completes. He notices the things he's been selling fit together, and gets uneasy
  about how cheaply he let them go.
- **Finale** — the beats already written ("That's his record of us. And I'd say it balances.") land as him
  declining to name a price. The one thing he won't sell.

That gives him the one thing he currently lacks — a change across the game — and it lands on the mechanic
he owns rather than on new fiction. It also keeps him the _reader_ of the mural, never a figure in it.

Considered and parked: Fez has a **debt**, and the scale is money-versus-merit. Thematically tighter — it
would bind the shop economy to Ma'at directly — but it moralises about money at children and needs real
fiction. Add only if the arc reads thin once the beats exist.

Avoid making Fez the _subject_ of the arc: he's the reason to come back tomorrow, Anubis is the reason it
matters. The mural can only do one of those jobs.

### When a beat fires (decided)

Pieces are set into the window by hand, on the mosaic screen, so **a panel can never complete while
the player is elsewhere** — Fez never interrupts a puzzle and a beat is never owed from earlier. That is
what the place-button bought beyond the ritual itself.

- **The cascade pauses at completion.** The piece that finishes a panel lands, the panel lights, placing
  stops, Fez says his three lines, and dismissing resumes with whatever is still in hand. Two panels in
  one tap means two pauses. Letting the cascade run past a completion wastes the moment the whole
  register was built for.
- **Within one tap, completions arrive in register order**, because placement fills the lowest register
  first. Across sessions they don't: expert can finish before starter, since starter has hidden paths a
  player may not open for a long time. That is the case §3.2 already designs for.
- **So no beat may reference another beat.** No "remember the cat in the doorway?". Each is three lines
  about the panel on screen and what the player has been doing — as written, they already are.
- **The finale stacks on the wizard beat** and orders itself: it needs all five panels, so it is always
  last. Complete wizard first and the player learns who Anubis is early, which reads fine — he is
  introduced as the one who steadies the scale, and the rest of the game assembles his record.

**Retelling is on demand, and the caption is the way in.** _Decided._ A finished register keeps its name
below the window — "The Guardian at the Door", "The First Lesson" — and that name is an **info button**:
pressing it has Fez tell the panel's beats again, in full. So the three lines fire once automatically on
completion, and after that the player asks. No auto-repeat to tap through on every mosaic visit, the beats
stay reachable rather than being a one-time miss, and the same keyed lines do both jobs — no shorter
variant to write. The replay also ignores the tutorials-off setting, as an explicitly asked-for line should.

## 3.5 If the artwork is regenerated

The window ships, so the generation prompt is gone — a prompt file that outlives its image goes stale
against the tracer and misleads the next person. Everything needed to write a fresh one:

- **The scenes** are §3.3 above: the caption table and the five briefs.
- **The composition**: one portrait image, five equal horizontal bands, a scene per band, Anubis
  presiding. Register assignment is positional, so the scenes must sit in their bands in a single image.
- **What the tracer needs** (`scripts/traceMask.ts`, and §3.1):
  - flat colour cells, no gradients or soft shading, hard edges;
  - continuous black leading closing every cell, thin — 3-4px at ~1150px wide;
  - **pure black only for the leading.** Anything meant to look black — a jackal's head, a metal scale —
    must be charcoal, clearly lighter than the leading, or it is traced as leadwork and can never be
    collected;
  - deep saturated colour is fine, however dark;
  - dense leadwork: break large fields into many cells, and the lower registers finer than the upper
    ones, since later tiers hold more reveal steps (32/44/52/58/66);
  - no hieroglyphs — the model invents convincing nonsense, and this game's glyph set is meaningful.
- **Then**: replace `src/assets/stained-glass.png`, run `yarn generate-mosaic`, and check each register's
  region count against its step count above.

---

## Cheapest probes, if this ever moves

- **For Part 2, vertical:** build table (a) for five journeys only and play them back to back. If they
  don't feel like different places, the family catalogue is too narrow, not the binding.
- **For Part 2, horizontal:** write the five-chapter beat sheet for two premises against the existing
  journey names and pick from the concrete versions rather than the pitches.
- **For Part 1:** the Schedule Grid is the only mechanism that needs no new engine — one authored instance
  answers whether time-as-an-axis is actually fun before any tick machinery exists.

---

# Part 4 — quests: the story as locks and keys

## 4.0 What this part is for

Parts 2 and 3 put story at the **seams** — arrival, completion, reveal — and §2.6 argues, correctly, that
narrative dropped mid-puzzle becomes the thing players tap through. This part is about the other place:
the 5–20 minute site visit, where the player is exploring and the story currently says nothing.

The hole, stated plainly: **exploration has no object.** Rooms are cleared and loot arrives. The player is
never _looking for_ anything, so there is nothing for stakes to attach to. Fez's premise E (§3.4) gives a
reason to come back tomorrow; it gives no reason to open this door rather than the one beside it.

**Everything below is options and consequences.** Nothing here is decided.

## 4.1 The rails, and what each one may say

Ordering is the constraint that decides what a beat is allowed to assume. The world has three rails and
they are not equally strong.

| Rail                  | Count | Ordered?                                                              | What a beat on it may assume    |
| --------------------- | ----- | --------------------------------------------------------------------- | ------------------------------- |
| Pyramid arrival       | 20    | **Yes** — within a tier each opens when the previous one is completed | everything before it            |
| Tier crossing         | 5     | **Yes** — possession of a tier-unlock treasure                        | everything in prior tiers       |
| Tomb opening          | 9     | **No** — key-gated, never sequenced against each other                | only its own tier               |
| An item found in situ | many  | **No**                                                                | nothing outside its own subject |

4 pyramids + 1–3 tombs per tier, five tiers (`src/data/journeys.ts`). The pyramid chain is in
`availablePyramidJourneyIds` (`src/app/pages/journeyAvailability.ts`), which skips non-pyramid journeys —
which is exactly why tombs are not a sequence.

**The rule that falls out: a beat may only assume what its rail guarantees.** A link-completion beat may
never say "as you now know", because the player may have finished another thread's second link first. This
is cheap to hold while writing and expensive to retrofit afterwards.

It also dissolves §2.4's objection that no premise holds 29 beats. It does not have to: **20 scenes
carrying 5 acts** is ordinary structure, and because the scenes are ordered, scene N may refer to what was
found in scene N−1.

## 4.2 What a quest is, in this world's terms

Four parts, and three of them already exist.

| Part           | Where it lives today                                                   |
| -------------- | ---------------------------------------------------------------------- |
| A chain        | the keys-and-locks solver — locks declare demand, currencies supply it |
| An identity    | mod data, the way any mod owns its own currencies                      |
| Beats          | Fez's conversation system, already keyed by moment                     |
| **Visibility** | **nothing** — the player has no way to know what thread they are on    |

Only visibility is new, and it is the part that balloons if it is allowed to.

## 4.3 Main and side, mapped onto guarantees already made

- **Main quest** — links whose keys gate progression. It inherits the solver's existing invariant
  ("reaching Wizard must never be blocked") for free, because that is already proven.
- **Side quest** — links gating a tier's ward-gated bonus content. The four tier-unlock treasures are each
  already paired to one journey of the next tier, so this structure exists and is currently unnarrated.

The consequence worth having: **a missed side link costs bonus content, never the ending.** Short threads
fail gracefully by construction rather than by care.

## 4.4 Option set A — how the player knows what thread they are on

| Option                                                                                                | What it costs                   | What it costs the player                                                                             |
| ----------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **A1 No log.** Thread state on the journey card, Fez at arrival, story items on the collection screen | copy and three small wirings    | a player who put the game down for a fortnight has to reconstruct where they were                    |
| **A2 A quest log screen**                                                                             | a new screen, and its own state | turns an adventure into a checklist; the screen most likely to make a casual game feel like homework |
| **A3 Log for the main chain only, sides invisible**                                                   | a smaller screen                | two grammars to learn; the player cannot tell which threads exist                                    |

A1 keeps story at the seams, which is the one thing Part 2 got emphatically right. A2 is the only option
that survives a **required** multi-quest gate (§4.5 B2) — if the gate can stop you, you must be able to
read why.

## 4.5 Option set B — how far the story is allowed to drive the gate

Today `isTierUnlocked` is a possession check: hold any one of that tier's four treasures
(`TIER_UNLOCK_PERK_IDS`, `src/data/treasurePerks.ts` — e.g. wizard opens on any of `master_a_1..4`). Four
to find, one to pass; all four are wanted for that tier's ward-gated content.

| Option                                                                                                | Effect on the invariant                                                                                                                                               | Other consequences                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1 The quest _produces_ the key.** The four tier-unlock treasures become the payoffs of four chains | **None.** The solver still proves "a tier-unlock treasure is reachable" — and proving that now _is_ proving the chain completable, since the treasure sits at its end | `isTierUnlocked` untouched, so the screen's copy and `worldGen/reachability.ts` cannot drift. "One to pass, four to complete" survives and stops being arbitrary. No log required. **Three of four stories go unseen on a first run.**         |
| **B2 The quest is an extra lock.** Wizard requires chains X, Y and Z complete                         | **Enlarged.** The solver must prove three whole chains completable, not one treasure reachable                                                                        | The rule changes in two places, and `journeyAvailability.ts` records that a second, different rule there is what let the two drift apart before. Forces A2. Replaces the four-treasure design rather than extending it. Adds mandatory length. |
| **B3 B1 everywhere, B2 at wizard only**                                                               | Enlarged for one gate                                                                                                                                                 | Smallest blast radius for a hard finale; still forces a log, and still needs the two rules kept in step for one tier                                                                                                                           |

**The question underneath is whether the tier gate is a wall or a choice.** Four routes through it means
replayability and no dead stop, at the price of a first-run player seeing one story out of four. Requiring
three means every player sees them, at the price of a spine, a log, and a bigger proof.

## 4.6 The fake item, and the one rule it cannot break

A fake artefact — the offering is refused, the real one is down a hidden corridor — is a good twist and has
exactly one hard constraint:

**The fake must not be declared as a currency.** If it is, the solver counts it as supply, believes the
lock satisfiable, and certifies a world that cannot be finished. The fake is plain loot wearing the
costume; the real item is the currency.

And the part that is design rather than plumbing: **the solver guarantees the real one is reachable. It
guarantees nothing about the player knowing to look.** Reachability is not legibility. A refusal with no
tell is a dead end, not a twist.

| Option for the tell                                                            | Consequence                                                                              |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| **C1 The refusal speaks** — one beat fired at the offering, pointing somewhere | One new firing site; the smallest surface that can work                                  |
| **C2 A detector** — the existing detector/perk system points at the real one   | Reuses a built system; spends a detector slot on a story beat                            |
| **C3 Fez notices** — he priced the fake once and recognises it                 | No new surface at all, and it feeds his arc (§3.4); depends on the player talking to him |

## 4.7 Placement: two routes, and the chain wants both

| Route                                                     | Guarantees           | Gives up                                                                                           |
| --------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| **Currency** — the mod registers a `CurrencyDistribution` | reachability, proven | the home drifts: a slot's placement preference is a soft tag, and preferences relax under pressure |
| **Node selector** — `nodes: [{where, encounter}]`         | the exact node       | the solver is not choosing, so reachability is the author's problem                                |

Locks are places in the story and want the node-selector route. Most keys want the currency route. The
fake/real pair wants authoring, because the hidden corridor is the point of it.

Two authoring facts that bound this (`world-spec-stability.md`):

- **Gate presence is structural; which key opens it is not.** A story may re-key an existing gate for
  free. Adding a gate re-carves the floor.
- `sidePaths`, `hiddenPaths` and `wardPaths` are authored at pyramid level (`buildSite.ts`), so a hidden
  corridor is expressible — but it comes from there, never from an encounter. An encounter may dress a
  room; it may never carve one.

## 4.8 Option set D — the shape of the chains

| Option                                                                    | Consequence                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1 One spine**, three tiers deep (gods ← offering ← pharaoh)            | Strongest single arc; a player who misses a link loses the ending, and the payoff is three tiers away from the promise                                                                                                       |
| **D2 Several short chains braided**                                       | Each fails gracefully; no single arc carries the game                                                                                                                                                                        |
| **D3 Short complete chains in starter and junior, the spine from expert** | The early ones teach the grammar — find the thing, open the thing, get the beat — on something that resolves inside a tier, so that by master the player trusts it enough for a fake to land as a twist rather than as a bug |

D3's argument is about where a new player is: a three-tier chain introduced at starter is a promise they
cannot test, and starter is where they decide whether to stay.

## 4.9 The constraint nobody has priced yet

The property the casual-mobile review singled out as rare is that **a child who cannot read yet can play
this**. P2 permits prose (Part 0), so a written story is in bounds — but a story delivered as text takes
that property back one note at a time.

This argues for story items being **drawn rather than written**: a marked-up map, a sketch of a room not
yet reached, a scratched tally. `mapPiece` already exists as a loot kind and is the precedent. It also
stops the item being flavour — a fragment that shows a sealed door two tiers up is a beat _and_ a thing to
act on.

Open either way: whether this is a hard rule for story loot, or a preference that yields where a written
line is much better.

## 4.10 Option set E — the first slice

| Option                                                                                                  | What it would tell you                                                                                 |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **E1 One side quest, two links, one tier, no new UI** — beats through Fez, question on the journey card | whether a short chain with a whimsical payoff is fun at all. If it is not, no three-tier spine will be |
| **E2 The wizard chain first**                                                                           | whether the finale lands — but it cannot be played without four tiers of progress                      |
| **E3 Copy only** — journey arrival lines on the existing 20, no items, no locks                         | whether "why this area" alone changes anything, for the price of text                                  |

## 4.11 Open questions (Part 4)

1. **Wall or choice** — B1, B2 or B3. Everything else in this part is downstream of it.
2. **Log or no log** — A1, A2, A3. Forced to A2 if B2.
3. **Chain shape** — D1, D2 or D3, and how many chains in total.
4. **Is story loot drawn or written** (§4.9), and is that a rule or a preference?
5. **Does the player ever meet the predecessor?** A funny, fallible explorer who kept getting it wrong
   fits the whimsical register better than a body at the end of a corridor, and "still down here
   somewhere" is a turn that holds for five chapters — but a living character needs a scene, and a scene
   is the one surface this game does not have.
6. **How does a thread survive a fortnight away?** Whichever visibility option wins has to answer this,
   because it is the actual failure mode of a months-long casual game.
7. **Does any of this touch generation, or only copy?** E3 is reversible; a registered story currency
   competes for loot slots with fragments, map pieces and treasures, and that is the economy the
   authorship doom loop lives in.
