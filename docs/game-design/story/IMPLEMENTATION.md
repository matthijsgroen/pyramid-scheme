# Implementation list

Work that falls out of the story documents, split by whether a story decision is in the way. **The top
section is pickable today** — none of it waits on a sentence being written.

Sizes are rough: **S** an afternoon, **M** a few days, **L** its own project.

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

## Considered: shortcuts, ladders and layers

**Vocabulary, not a schedule.** These are structures the storytelling can lean on; when any of them lands
is a separate decision. Kept here because the three ideas are not equally good, and because what they cost
is changing under them (see the last section).

### A lever is a floor key, and that is the good news

For **ordering within a floor** — go left, get blocked, go right first, come back — a lever and a floor key
are the same mechanic. Both say _do B before A_. The lever adds fiction, not function.

Which makes it cheap, because `world-spec-stability.md` is explicit:

> `gate.wardKeyId`, `gate.color` — Which key opens a door… Gate _presence_ is structural; which key is not.

**So replacing a floor key with a lever on a gate that already exists is a free field.** No re-carve, no
invalidated exploration, no migration. The floor graph is untouched; only what opens the door changes.

### What it buys that a key cannot: the affordance is in the room

A key is in your bag. A lever is in the world.

**An unpulled lever is a waypoint made of architecture.** It says _there is something here you did not do_
without a marker, a list, or a screen — and it self-curates, because it is only visible where the player
actually is. That is `../waypoints.md`'s hardest open question (curation: one thread, a standing list, or a
ranked top N) answered for one case by level design instead of UI.

It also reads better on the way back. Returning to an old pyramid with a late key, the player is looking
for a door. Returning to one with an unpulled lever, they can see what they left.

### The one thing that is genuinely new, and genuinely structural

A key works from either side. **A lever can be one-way** — reachable only from beyond the barrier, opening
a way back that could not have been opened coming in. That is the shortcut, it is what removes the re-walk,
and it is the half a key cannot express.

It is also the half that costs: a new connection changes connectivity, so it re-carves and ships with a
migration.

### So it is two features

| Feature                                  | Cost                                   | Buys                                                       |
| ---------------------------------------- | -------------------------------------- | ---------------------------------------------------------- |
| **Lever instead of a floor key**         | a free field, one renderer state       | fiction, and an affordance the player can see in the room  |
| **Lever opening a new one-way shortcut** | structural — re-carve plus a migration | the re-walk removed, which is what the backwards map costs |

The first is free today. The second is expensive today and much cheaper after the exploration migration —
see below.

### What "structural" costs, once exploration is ordinals

The prices above are the **pre-migration** ones. Exploration is moving from grid coordinates to
`<ordinal>@<kind>` — where a cell sits in its section's walk, and what it is — and that changes what a
corridor change costs, because a section hash comes from the authored spec rather than from the carve.

`exploredOrdinals.ts` has the measurements, from one floor of Valley of the Kings:

| Measured                                              | Cells        |
| ----------------------------------------------------- | ------------ |
| move when the carve changes                           | 548 of 676   |
| swap kind at the same ordinal — the ones that degrade | **7 of 676** |

So under coordinates, re-carving a floor loses 81% of what the player walked. Under ordinals it loses
about **1%**, and loses it honestly: the kinds disagree, the entry is skipped, and that cell reads as
unexplored rather than as a room the player never opened being marked done.

**That is what makes the structural half affordable later.** A one-way shortcut, a new gate, a re-shaped
section — all of them stop being all-or-nothing per floor and become a handful of cells forgetting
themselves. The read still accepts coordinate matches as a fallback (`useAssembledFloor`), so this is the
price _after_ the switch, not today's.

**Which is the argument for designing these now and pricing them later.** Nothing here has to be built to
be decided, and the cost of building it is on a downward curve that somebody else is already moving.

### Verticality is expensive and the want is weaker

True layers touch the renderer (the HTML port is in flight), pathing, and the section hash. And
`world-spec-stability.md` is clear that corridor structure is structural: anything changing connectivity
invalidates saved exploration for that floor, so it ships with a migration rather than after one.

A ladder as **decoration within a floor** is a different and much cheaper thing, and buys atmosphere rather
than exploration.

### Before adding generation features, measure

The review's complaint about the interior was not the maze. It was the camera — _"you built a stage and
shot it through a mail slot"_ — and the frame being mostly empty. Camera framing and lighting are being
worked on now.

**Both of those change how the same maze feels.** Adding generation variety before they land risks solving
a problem that turns out to have been light, and generation changes cost a save migration where lighting
costs nothing.

So: let the lighting and framing land, look at a floor again, and only then decide whether the maze itself
is the thin part. Not a reason to leave it undesigned — a reason not to price it yet.

## Suggested order

**1 → 3 → 4 → 2.** The first makes the story writable, the third is ten minutes, the fourth fixes three
things that are wrong regardless, and the second unblocks a whole document's worth of design.

5 and 6 are the ones to do when the writing stalls and something visible would help.
