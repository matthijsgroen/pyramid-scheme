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

| Status    | Means                                                            |
| --------- | ---------------------------------------------------------------- |
| `sketch`  | the idea, no address, no copy — safe to change freely            |
| `placed`  | address chosen and checked against the world; copy still missing |
| `written` | copy exists in both locales                                      |
| `built`   | authored in the DSL / the story mod, and playable                |

An arc is only as built as its least-built row, and the impact ledger is only trustworthy from `placed`.

## The sections

### 1. Premise

One paragraph, and one sentence of tone. What the player is after and why now.

### 2. Cast

| id | who | where they speak | voice |

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
(unordered). `assumes` lists beat ids this one depends on having fired — **and a beat on an unordered rail
may not assume anything.** That constraint is the reason this column exists rather than being remembered.

### 6. The chain

| lock | scope | demands | supplied by | placed at | status |

`scope` is `room`, `journey` or `global`. This table is the arc's actual mechanism; sections 2–5 are how it
is dressed. If this table is empty, the arc is flavour — which is a legitimate thing for an arc to be, but
it should be said out loud.

### 7. Waypoints — how the player is steered there

| id | prop/place it points at | mechanic | precision | gated by | status |

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

### 8. Impact

The reason this format exists rather than a prose file. Four columns, so two arcs can be compared before
either is written.

| Axis          | What to record                                                                                                                                                                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Structure** | Every `structural?: yes` place. Whether any floor is re-carved, and so whether this needs a save migration to ship with it                                                                                                                                      |
| **Systems**   | New currency; new encounter kind; new loot kind; any change to `isTierUnlocked`; any new UI surface. Each of these has a known cost written down in Part 4                                                                                                      |
| **Content**   | Counts: places, props, beats, dialogue lines × 2 locales, drawn assets. This is the number that decides whether an arc is a weekend or a quarter                                                                                                                |
| **Payoff**    | What the player gets, on which rail it lands, and whether it feeds the drum (something visible per solve) or only the seams. An arc with no payoff row is a cost with no return                                                                                 |
| **Steering**  | Every waypoint the arc relies on, at what precision, and **what unlocks it**. A waypoint gated by a perk from an unrelated treasure is the failure this row exists to catch — the player who lacks it cannot see the arc at all, and nothing will tell them why |

### 9. Open

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
