# Implementation list

Work that falls out of the story documents, split by whether a story decision is in the way. **The top
section is pickable today** — none of it waits on a sentence being written.

Sizes are rough: **S** an afternoon, **M** a few days, **L** its own project.

---

## Two piles: what keeps the world, and what re-carves it

Everything in this document and in [`../map-variety.md`](../map-variety.md), sorted by the only division
that decides when a thing can ship. The rule comes from `world-spec-stability.md`: **gate presence,
`pathPuzzles`, `sidePaths` and `hiddenPaths` are structural; which key opens a gate, what dresses a room,
and what sits in a loot slot are not.** And the solver runs **structure, then loot, as two strictly
separate phases** — so placing something new in an existing slot never re-carves.

### Pile A — the world is untouched

No change to `generatedWorld.ts`'s carve. Ships whenever, in any order.

| Work                                          | Where it lives                                  |
| --------------------------------------------- | ----------------------------------------------- |
| Journey-keyed arrival conversations           | app                                             |
| Story beats exempt from the tutorial toggle   | app                                             |
| Generalise `CompassResult`                    | core types                                      |
| `notEnoughHieroglyphs` key and copy           | one string                                      |
| Rewrite the 37 pre-explorer `fez.json` keys   | strings                                         |
| Rewrite the 29 journey descriptions           | strings                                         |
| Explorer portrait, bust crop and surface      | art + app                                       |
| Reaction-rail plumbing                        | app                                             |
| The guidance layer                            | app — it reads the world, never writes it       |
| A tomb-door family                            | app: the exterior is a screen, not a floor node |
| Story currencies in existing loot slots       | the solver's loot phase                         |
| A story encounter **replacing** a puzzle node | dressing, per the node-selector vocabulary      |
| Blocked passage (catalogue 1)                 | decoration — explicitly no connectivity         |
| Window or grille (6)                          | decoration                                      |
| Informational dead end (7)                    | what sits at a dead end that already exists     |

**One of these still touches saves without touching the world: the perk reshuffle.** Saves hold perk ids,
so changing what an id grants changes what an existing save has. The world is stable; the player's
inventory is not. It wants a migration and not a re-carve — which is a different and much smaller job.

### Pile B — the floor is re-carved

Connectivity or room count changes, so saved exploration degrades. Under ordinals that is roughly **1% of a
floor's cells**, reading as unexplored rather than as a lie — but it is still a migration, and these want
to land together rather than one at a time.

| Work                                              | Why it re-carves                                  |
| ------------------------------------------------- | ------------------------------------------------- |
| Loop density dial (2)                             | adds edges                                        |
| One-way crossing (2b)                             | adds an edge                                      |
| Lever-opened shortcut (8)                         | adds an edge                                      |
| Second way into a floor (9)                       | changes how a floor is entered                    |
| Chamber bigger than one cell (3)                  | footprint, and the grid                           |
| Vertical layers (5)                               | everything                                        |
| A story place needing a new `hiddenPath`          | the offering arc's real seal is one of these      |
| A story encounter **added** rather than replacing | `pathPuzzles` — the most structural knob there is |

### What this means for sequencing

**Pile A is the whole story.** Every beat, every line, the cast, the waypoints and the tomb door can ship
without moving a wall. The story does not need a restructure to exist.

**Pile B is one release.** It is the map-variety catalogue almost exactly, plus the arc's hidden corridor —
which is the argument for finishing the catalogue before building any of it, since they share a migration
and a world regeneration. Doing them one at a time pays that cost repeatedly for no benefit.

And Pile B gets cheaper as the exploration migration lands, so there is no rush to be early.

---

## Ready now

### 1. Journey-keyed arrival conversations — S

All twenty pyramids fire the same `showConversation("pyramidIntro")` from
`useExpeditionIntro.ts`; nothing keys a conversation to which journey you entered. Every arrival beat in
`main-path.md` needs this and nothing else.

Shape: look for `story.arrival.<journeyId>`, fall back to the generic intro when a journey has no beat.
Authoring a beat is then adding a key, with no code change per journey.

**And a trap to fix while in there:** `shouldSkipConversation` skips everything when `tutorialsEnabled` is
off. A player who turns tutorials off should lose tutorials, not the story. Story beats want to be a
separate class from teaching beats, or the first thing a returning player does is switch the plot off.

**Unblocks:** all 20 arrivals, the 5 act breaks, both bond beats.

### 2. Generalise `CompassResult` — S, core

`src/game/siteTypes.ts` — the result carries `hieroglyphId` and `pieceIndex` beside its address, so the
scanner seam is generic going in (`registerCompassScanner` takes an opaque target string and core names no
reward type) and hieroglyph-shaped coming out. Nothing else can register a scanner honestly until those two
fields are not about hieroglyphs.

**Unblocks:** every waypoint in `../waypoints.md`, and the story's own steering.

### 3. `notEnoughHieroglyphs` says the wrong thing — XS

The key says the player is short of hieroglyphs; the copy says _"You can always stop this expedition by
returning to the travel screen."_ It is also the line the casual-mobile review quotes as the whole of Fez's
character. Rename or rewrite; it is one string.

### 4. Perk reshuffle, the mechanical half — S

`src/mods/tombTreasure/game/treasurePerks.ts`, one file, no world regeneration (key ids are core structure;
what an id grants is mod data). Independent of any story decision:

- **junior's four blank floors** — the only tier with no new verb, and where a new player decides to stay
- **compass L2 out of master** — L1 is the second thing earned and does not improve for three tiers
- **detection out of `master_b_5`** — hidden corridors are unfindable-by-tool for three and a half tiers

Story-led placement (`../progression-route.md`) can refine which verb lands where later; these three are
wrong on their own terms.

**Watch:** saves hold perk ids, so changing what an id grants changes what an existing save has. Migrate.

### 5. A surface for the explorer portrait — S

Two full-body images exist, one neutral and one grinning. Needs a head-and-shoulders crop (the expressive
part, and phone width) and somewhere to render — conversations first. The full body is for the journey card
and the title.

**Not** the site map: the explorer stays a dot there, because that screen is about the floor.

### 6. Reaction-rail plumbing — S

Fire a conversation on what the player did rather than where they are. Every trigger exists:
`PuzzleFamilyShell` tracks `hintsUsed` and already distinguishes a board solved unaided; the claim knows a
wrong answer; loot knows it was found.

Build the firing, not the content — the content is two lines in `script-act-1.md` and the rest is unwritten.

**Watch:** this is the rail most likely to ruin Fez. Rate-limit it in the plumbing, not in the copy.

---

## Blocked on a story decision

| Work                                        | Size | Waiting on                                                                                    |
| ------------------------------------------- | ---- | --------------------------------------------------------------------------------------------- |
| Rewrite the 37 pre-explorer `fez.json` keys | M    | mostly nothing — the voice is decided. Only `welcome*` waits on the meeting setup (`cast.md`) |
| Rewrite the 29 journey descriptions         | M    | which shape: rumour, fact, or Fez pitching (`shipped-copy.md` §journeys)                      |
| The guidance layer                          | L    | curation — one thread at a time, a standing list, or ranked (`waypoints.md`)                  |
| A tomb-door family                          | L    | one family or two, and which mechanic (`../tomb-exteriors.md`)                                |
| Story currencies and the offering arc       | M    | wall-or-choice on the tier gate (Part 4 §4.5)                                                 |

The first row is the notable one: **the Fez rewrite is nearly unblocked.** Everything except the opening
conversation can be written today, because the explorer speaks and the voice rules exist.

---

## Big rocks, not story-blocked

| Work                                 | Size | Why it is here                                                                                                                            |
| ------------------------------------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Wordless first instances, per family | L    | the review's complaint #6 and `onboarding.md`'s own "not yet built". The meeting setup makes the first one mandatory rather than optional |
| Persist in-progress boards           | M    | review #1, and the cheapest thing on its list — an interrupted board is a lost player                                                     |
| Sound on solve                       | M    | there is not one audio file in the project                                                                                                |

---

---

## Map variety

The catalogue lives in [`../map-variety.md`](../map-variety.md) — fifteen entries across six axes, with
what each one _says_ to the player, because a mechanic is storytelling vocabulary. Everything in it is
Pile B except the three decorations, which are Pile A.

Two findings from it that this list depends on:

- **Isolation constrains cut edges, not cycles.** A loop wholly inside one gated region is free of
  isolation, reachability and solver concerns. Only edges crossing a gate are constrained — and those are
  legal one-way.
- **A floor is one plane.** Any mechanic whose fiction needs height is the vertical-layers entry at its
  price.

## Suggested order, within Pile A

**1 → 3 → 4 → 2.** The first makes the story writable, the third is ten minutes, the fourth fixes three
things that are wrong regardless, and the second unblocks a whole document's worth of design.

5 and 6 are the ones to do when the writing stalls and something visible would help.
