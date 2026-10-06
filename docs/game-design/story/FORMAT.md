# How a story arc is written down

One file per arc, under `docs/game-design/story/`. The point of a fixed shape is not tidiness: it is that
an arc can be **sketched, then deepened, then built** without being rewritten each time, and that at any
stage you can read off what it would cost.

Two rules make that work.

**Everything has an id, and beats point at ids.** A beat never describes a place in prose — it names one.
That is what lets a location move without the story needing a rewrite, and what lets a spec check later
that every id a beat mentions actually exists.

**Addresses use the world's own vocabulary.** A place is written the way `src/worldGen/dsl.ts` writes one,
so a designed row can become an authored rule with no invention in between. Anything else rots on contact
with world-gen.

## Addressing a place

| Level   | Written as                                        | From                          |
| ------- | ------------------------------------------------- | ----------------------------- |
| Tier    | `starter` `junior` `expert` `master` `wizard`     | `Tier`                        |
| Journey | a journey id (`expert_3`, `master_treasure_tomb`) | `src/data/journeys.ts`        |
| Pyramid | `first` `last` `middle` `2` `2-3` `last-1`        | `PyramidSelector`             |
| Floor   | floor index, or `main` / a side section           | `FloorConstraint`             |
| Node    | `first` `last` `4` `{every: 3}`                   | `NodeWhere`                   |
| Behind  | `wardPath` `wardChest` `sidePath` `hiddenPath`    | the DSL's path/chest builders |

Written together: `expert_3 / floor 2 / hiddenPath / where: last`. An empty field means "not chosen yet",
which is different from "anywhere" — say `any` when you mean anywhere.

## Status, so a file can be half-designed on purpose

Every row carries one. This is the whole mechanism for filling detail in over time.

| Status    | Means                                                                  |
| --------- | ---------------------------------------------------------------------- |
| `sketch`  | the idea, no address, no copy — safe to change freely                  |
| `placed`  | address chosen and checked against the world; copy still missing       |
| `written` | copy exists in both locales                                            |
| `built`   | authored in the DSL and in whichever mods own the pieces, and playable |

An arc is only as built as its least-built row, and the impact ledger is only trustworthy from `placed`.

## The sections

### 1. Premise

One paragraph, and one sentence of tone. What the player is after and why now.

### 2. Cast

| id | who | where they speak | voice |

Who these people are lives in [`cast.md`](cast.md), not here — this table is only who appears in THIS arc.

Speaking is a rail, not a place — arrival, tier crossing, link completion. A character who needs a _scene_
is a red flag: the game has no surface for one (Part 4 §4.11 Q5).

### 3. Props — things carried, and things known

| id | what it is | kind | drawn / written | currency? | seen? | status |

**`kind` is `item` or `knowledge`**, and mechanically they are the same thing: a precondition the player
either has or does not. Adventure-game dependency diagrams have always treated them alike, and this world
already can — a currency's key role and its collection-screen visibility are independent metadata, and all
three combinations ship today (fragments key + seen, map pieces key + unseen, mosaic tiles seen + not a
key). Knowledge is a currency that is not carried.

**`currency?` is load-bearing.** A prop declared as a gating currency is registered with the solver and its
reachability is proven. A prop that merely looks like one — a fake — must be plain loot, or the solver
counts it as supply and certifies a world that cannot be finished (Part 4 §4.6).

**`seen?` is how knowledge avoids being worse than a locked door.** An invisible precondition satisfied
silently is the hardest failure in this family: the player may never learn that they now know something. A
knowledge prop should almost always be `seen`, rendered as _what you have worked out_ rather than _what you
carry_. Saying no is a deliberate choice to hide a thread, not a default.

Where a prop is **acquired** is a place row like any other — including "by solving this node". The solver's
slots are `end` or `puzzle`, and a currency placed on a `puzzle` slot is granted by solving it. That is
exactly "knowing something after encounter 1", and it needs no new machinery.

### 4. Places

| id | address | what is there | structural? | status |

**`structural?`** answers one question: does putting this here re-carve a floor? Gate _presence_ is
structural, which key opens it is not; `hiddenPath` and `sidePath` are structural; dressing a node is not
(`world-spec-stability.md`). A structural row invalidates saved exploration for that floor, so it has to
ship with the migration, not after it.

### 5. Beats

| id | rail | trigger | prop/place | what is said or shown | assumes | status |

`rail` is one of: **arrival** (20, ordered), **tier** (5, ordered), **link** (unordered), **found**
(unordered), and **reaction** (unordered) — the last firing on what the player DID rather than on where
they are: a board solved unaided, a wrong claim, a find. It carries what dialogue cannot observe — a board solved
unaided is not something a character can remark on having heard. It is also the easiest
to ruin: one beat per solve is a tooltip with legs, so reaction beats are rare, escalating, and remember
the last one. `assumes` lists beat ids this one depends on having fired — **and a beat on an unordered rail
may not assume anything.** That constraint is the reason this column exists rather than being remembered.

#### Every line names its speaker

A written line is always prefixed, never left to context:

```
> **Fez:** Three thousand years, and the receipts outlived the goods. Typical.
> **Ipi:** I kept these accounts for forty years. I am not leaving them in that state.
```

Unattributed copy reads fine in a draft where one character happens to be talking and then goes wrong the
moment a second one is added, a line moves between beats, or a translator opens the file with no idea who
is speaking. It is also what lets a spec later check that every speaker in a script is a `id` in the arc's
Cast table.

**Speakers that are not people are still speakers.** A carving, a ledger, a wall: `**Carving:**`. If an arc
wants stage directions rather than speech, those are italic and unprefixed — a reader can always tell what
is said from what is seen.

**The prefix is `Explorer:`, not `Player:`.** The player is the person holding the phone; the explorer is
the character in the hat, and only one of those can be written for.

##### The explorer speaks, and is a character rather than an avatar (decided)

The explorer is **not** the player. There is no customisation screen and none is wanted, so the job is a
character anybody is happy to be next to — which is a different and easier job than a blank the player is
supposed to project onto.

They speak. One-sided comedy is hard, and a companion who only ever gets reactions cannot be funny with
anyone.

**Fez is the excitable one already** — his shipped lines run to _"Wow, our first treasure! Well done!"_ So
the explorer is the dry one. That pairing is funnier against a talking lizard in a fez than the reverse,
and deadpan is the register that survives translation best: short, literal, no wordplay to reconstruct.

Four rules keep them likable to everyone, and three of them are mechanical:

- **No pronoun, ever.** Nobody refers to the explorer in the third person. Everyone addresses them as
  "you", which is what dialogue does anyway. The art reads one way; the text commits to nothing.
- **No name.** Nothing in the story needs to address them by one, and a name carries a language and a
  place with it.
- **No gendered self-description — and this is the one that bites in translation.** French, Italian,
  Polish and the rest gender adjectives and past participles, so _"I was surprised"_ forces a translator to
  pick. Keep their lines in the present tense, on questions, imperatives and observations about the world.
  _"It was a door."_ translates everywhere. _"I'm exhausted."_ does not.
- **No backstory that implies a demographic.** No family in the trade, no schooling, no home town.
  Competence, curiosity, and being unbothered are traits anyone can wear.

**The bond is now two-sided, so the reaction rail is a tool rather than the only one.** It still carries
what Fez notices about how the player _plays_ — a board solved unaided is not something dialogue can
observe — but the friendship itself can now be written as conversation.

### 5b. Nothing pays off on knowledge the game did not give

**A beat may not need a fact the player was not taught.** The history in this script is real and a good
deal of it is unfamiliar, so every fact a payoff rests on is established where it is used — in the same
scene, in the card beside it, or by somebody correcting Fez out loud. A player who has never heard of
Amenhotep III must get the whole of the Colossi beat; a player who has heard of him gets one extra smile
from the journey being titled with the wrong name. That is the right split: **prior knowledge may sharpen a
beat, never complete it.**

The device already carries most of it. **Fez is wrong once a tier and the tier's ghost corrects him** — so
Thoth turns out to be writing and counting rather than secrets, Amun and Ra turn out to be one god, Osiris
turns out to be green because he comes back, and the feather turns out to want a LIGHTER heart. The
correction is the teaching, and it is funny rather than didactic because somebody is being told off.

The two the finale rests on are taught the same way and four acts early: **a thing written down is a thing
that happened** is Ipi's, said by a bookkeeper for whom it is not a belief but a professional fact; and
**Hori is the most ordinary name in Egypt** is Ipi's ledger complaining about four of them in one street.
Neither is explained at the Sphinx, because by then neither has to be.

**And the facts have to be true.** Eighteen metres, not twenty; the curse invented by newspapers in 1923;
ostraca because papyrus was too dear for children. A game that teaches real things is only worth the licence
if it gets them right.

### 6. The chain

| lock | scope | demands | supplied by | placed at | status |

`scope` is `room`, `journey` or `global`. This table is the arc's actual mechanism; sections 2–5 are how it
is dressed. If this table is empty, the arc is flavour — which is a legitimate thing for an arc to be, but
it should be said out loud.

### 7. Waypoints — how the player is steered there

| id | prop/place it points at | mechanic | precision | gated by | status |

Story waypoints are one client of a **guidance layer** that has to work with no story at all — motivating
the next tier, an unopened side path, a tomb two treasures short. That layer, its ranges and the curation
problem it stands on are in [`../waypoints.md`](../waypoints.md); this section is only the arc-authored
slice of it.

Two steering mechanics exist, and they point in opposite directions
(`docs/mods/collection-and-detector-design.md` §7):

| Mechanic                                    | Direction          | Levels                                                                                  |
| ------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------- |
| **Compass / supplies** — active target mode | narrows **inward** | L1 which pyramid · L2 which floor · L3 exact location                                   |
| **Corridor detector** — passive             | widens **outward** | L1 proximity · L2 somewhere on this floor · L3 pyramid marker · L4 travel-screen marker |

Inward is how an arc says _go to that corner_. Outward is the long-range version — a marker on the
journey list saying this pyramid still holds something — and it is the only tool here built for a player
returning after a fortnight.

**Precision is a reward, so an arc may withhold it.** Detector level comes from perks, which come from
treasures, so vague early and exact later is the built progression rather than a compromise. An arc that
wants a search to remain should ask for L1, not L3: pointing at the exact cell deletes the corridor that
the twist was about.

**The seam is a registry.** `registerCompassScanner` (`src/app/SiteMap/detectorScanners.ts`) takes a hook
returning `(target: string) => CompassResult[]`, core merges every registered scanner, and the hieroglyph
mod is the worked precedent. The target is an **opaque string** the registering mod interprets, and core
"names no reward type" — so pointing at a story prop needs no core knowledge of the story.

**But the result type is not yet generic, and this is the one real cost.** `CompassResult`
(`src/game/siteTypes.ts`) carries `hieroglyphId` and `pieceIndex` alongside its address. The seam is
generic going in and hieroglyph-shaped coming out, so a story scanner cannot fill it honestly. Generalising
those two fields is a **core change**, not a mod one — small, but it is the thing to do first, and it is
the answer to whether a scanner can point at a place rather than at a collectible.

Two things it already gets right, worth not rebuilding:

- **Its address is this format's address.** `journeyId`, `levelIdx`, `floorIdx`, `cell` — the same
  journey / pyramid / floor / node shape a Places row uses.
- **It already knows about gated content.** A result carries the ward keys between the floor and the
  target, and whether it sits in a hidden corridor — deliberately as raw facts, leaving the consumer to
  judge. So a waypoint pointing at something the player cannot yet reach is a solved problem rather than a
  bug waiting to happen.

**A waypoint is granted by the ask, never by the refusal (decided).** Steering starts at the moment the
player accepts the goal — not at the moment they get something wrong. Hanging it off a failure inverts the
game: a player who is careful, or lucky, never gets steered at all, and one who blunders is rewarded for
it. It also leaves the refusal free to do its own job, which is telling the player that what they are
holding is wrong — legibility, not navigation, and those are different beats that read badly welded
together.

The side benefit is robustness to order. If steering exists from the ask, a player who wanders into the
right place early finds things in a sensible sequence instead of hitting a room that means nothing yet.

**The trap: perk-gating by someone else's progression.** Detectors unlock through perks earned from
treasures that have nothing to do with your arc. A waypoint the player may simply not have makes the arc
silently unreachable for them. The clean shape is for the arc's own **knowledge** prop to unlock its own
scan — then the arc owns its gating, the solver sees the whole chain, and "you now know what to look for"
and "the scan now returns something" are the same beat rather than two.

### 8. Where an arc lives — nowhere, and everywhere

**An arc is not a mod.** Mod boundaries exist to keep technology from entangling; they are not containers
for features or for fiction. So an arc has no home module. Each piece it needs lives wherever that
_technology_ already lives — a gating currency with the currency machinery, a waypoint scanner with the
detector machinery, an encounter family with the encounter families, copy in the locales, placement in the
world-gen spec.

What is left over — the premise, the cast, the order of beats — is **data and prose**, which need no module
at all. That is what this file is.

The practical consequence is for the Impact ledger below: an arc should **name the mods it leans on**,
because toggling one off will degrade the arc, predictably and by design. That is a technical boundary
doing its job, not a story bug. An arc leaning on five mods is not wrong, but it is fragile in five
directions and should say so.

### Counting copy when the game ships in a dozen languages

The target is most European languages, not the two that exist today. So **a Content row counts source
lines, never lines × locales** — multiplying by two understates a twelve-language build six times over, and
an arc that reads cheap at ×2 can be a quarter's work at ×12.

Three consequences worth having before any copy is written.

**Loose translation is granted, and its boundary is already settled.** Story prose may be adapted freely —
that is what makes a dozen locales affordable at all. What may never drift is anything the player matches
against the board, and that cannot drift because it is not words: numbers and glyphs are identical in every
locale and the player types nothing (P2). Prose adapts; mechanism does not translate.

**At this scale, drawn stops being a preference and becomes the cheap option.** A drawn story item costs one
asset whatever the language count; a written one costs a line per locale, forever, including every revision.
§4.9 asks whether drawn-not-written is a rule or a preference — the budget answers from the other side, and
both answers point the same way.

**Plural forms are a production item, not a detail.** `src/i18n/plurals.spec.ts` imports `en` and `nl`
directly and checks every `_one`/`_other` pair resolves. Slavic languages need `_few` and `_many` too, so
the authored strings and that spec's shape both want generalising before a third locale lands.

### 9. Impact

The reason this format exists rather than a prose file. Four columns, so two arcs can be compared before
either is written.

| Axis          | What to record                                                                                                                                                                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Structure** | Every `structural?: yes` place. Whether any floor is re-carved, and so whether this needs a save migration to ship with it                                                                                                                                      |
| **Systems**   | New currency; new encounter kind; new loot kind; any change to `isTierUnlocked`; any new UI surface. Each of these has a known cost written down in Part 4                                                                                                      |
| **Content**   | Counts: places, props, beats, **source** dialogue lines, drawn assets. Source lines, not lines × locales — the multiplier is heading for a dozen, see below                                                                                                     |
| **Payoff**    | What the player gets, on which rail it lands, and whether it feeds the drum (something visible per solve) or only the seams. An arc with no payoff row is a cost with no return                                                                                 |
| **Steering**  | Every waypoint the arc relies on, at what precision, and **what unlocks it**. A waypoint gated by a perk from an unrelated treasure is the failure this row exists to catch — the player who lacks it cannot see the arc at all, and nothing will tell them why |

### 10. Open

Numbered decisions, each with its options and what each option costs. Same shape as
`story-and-time-brainstorm.md` — the file is for steering, so unresolved questions stay visible rather
than being quietly settled by whoever writes the next section.

## The index

`docs/game-design/story/README.md` carries one line per arc: name, status, and its Impact row collapsed to
four cells — Steering folds into Systems there, because it only matters once an arc is being built. That table is the overview — which arcs are cheap, which re-carve floors, which are pure copy,
and which actually pay the player.

## What would keep this honest later

A spec that reads these files and asserts every address resolves against the generated world, every prop id
a beat names exists, and no beat on an unordered rail declares `assumes`. Not built, and not worth building
until one arc is real — but the format is shaped so it could be.
