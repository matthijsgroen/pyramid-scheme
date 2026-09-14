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

### 3. Props

| id | what it is | drawn / written | currency? | status |

**`currency?` is load-bearing.** A prop declared as a gating currency is registered with the solver and its
reachability is proven. A prop that merely looks like one — a fake — must be plain loot, or the solver
counts it as supply and certifies a world that cannot be finished (Part 4 §4.6).

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

### 7. Impact

The reason this format exists rather than a prose file. Four columns, so two arcs can be compared before
either is written.

| Axis          | What to record                                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Structure** | Every `structural?: yes` place. Whether any floor is re-carved, and so whether this needs a save migration to ship with it                                                      |
| **Systems**   | New currency; new encounter kind; new loot kind; any change to `isTierUnlocked`; any new UI surface. Each of these has a known cost written down in Part 4                      |
| **Content**   | Counts: places, props, beats, dialogue lines × 2 locales, drawn assets. This is the number that decides whether an arc is a weekend or a quarter                                |
| **Payoff**    | What the player gets, on which rail it lands, and whether it feeds the drum (something visible per solve) or only the seams. An arc with no payoff row is a cost with no return |

### 8. Open

Numbered decisions, each with its options and what each option costs. Same shape as
`story-and-time-brainstorm.md` — the file is for steering, so unresolved questions stay visible rather
than being quietly settled by whoever writes the next section.

## The index

`docs/game-design/story/README.md` carries one line per arc: name, status, and its Impact row collapsed to
four cells. That table is the overview — which arcs are cheap, which re-carve floors, which are pure copy,
and which actually pay the player.

## What would keep this honest later

A spec that reads these files and asserts every address resolves against the generated world, every prop id
a beat names exists, and no beat on an unordered rail declares `assumes`. Not built, and not worth building
until one arc is real — but the format is shaped so it could be.
