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

## Suggested order

**1 → 3 → 4 → 2.** The first makes the story writable, the third is ten minutes, the fourth fixes three
things that are wrong regardless, and the second unblocks a whole document's worth of design.

5 and 6 are the ones to do when the writing stalls and something visible would help.
