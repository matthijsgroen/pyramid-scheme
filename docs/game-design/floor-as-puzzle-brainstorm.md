# floor-as-puzzle-brainstorm.md

Status: **exploration — nothing decided, nothing scheduled.** An inventory of ways a pyramid floor
could itself be played, sorted by what each would cost a run in progress.
Companion to `pyramid-interior-design.md` (the floor system, §6–§7), `world-spec-stability.md` (the
cost tiers this page sorts by), `PUZZLE_FAMILIES.md` (which families can carry a door).

---

## The question

A floor today is packaging. It holds puzzles, chests and gates, and the walk between them is
navigation, not play. `fork` is the clearest symptom: a node type with no content, a free choice
with nothing to decide. This page collects what could make the floor itself the thing being played.

---

## The constraint that sorts everything

`world-spec-stability.md` splits authoring into what moves walls and what does not, and
`worldFloorAssembly.spec.ts` sweeps every floor in the world to hold the line. Three tiers follow,
and every idea below is tagged with one:

| Tier | What it means | What a run loses |
| ---- | ------------- | ---------------- |
| **free** | Content-side. Encounter, reward, gate key, drawing. Walls do not move. | nothing |
| **carve** | Walls move, no room is added or removed. | nothing — corridors relight to each section's high-water mark |
| **rooms** | The authoring adds, removes or replaces a room. | those rooms, and any chest in them, come back unexplored |

The tier is the honest price tag. It is not the build cost — **S/M/L** is that, and the two are
independent: the cheapest idea to build can be the one that costs a player the most.

---

## Condition and patron as the dispatch

`condition` and `patron` already ride on every floor, authored on the pyramid and copied down so
they survive the climb through the ranks. Both are free today, and purely drawn: `condition` is a
mood overlay, `patron` picks `<kind>-<patron>.png` over the generic drawing. Nothing else reads
either.

That makes them the natural switch for **which floor-puzzle layer a site runs**, and it is the
reason this page is not a search for one mechanic. A floor-puzzle applied to all 85 pyramids is a
tax; applied to the sites whose condition calls for it, it is a place with something wrong with it.

`condition.amount` (0–1) is the dial the layer was going to need anyway: a damp corner is one ramp,
a 1.0 flood is a floor with two walkable shapes.

### What each axis is for

- **`condition` — what has got into this place.** It says which layer is active. A flooded site
  routes differently from a dry one.
- **`patron` — whose tomb this is.** It dresses the layer, never selects it. Horus's shrine on the
  east, Thoth's on the north; the frieze that names the true door is written in that god's voice. A
  god choosing geometry would be a drawing deciding a wall.

### The price of wiring them up

The moment `condition` selects a layer, it stops being purely drawn, and the sweep says so — it
rewrites every encounter in the world to one family and demands identical walls. Which tier it lands
in depends entirely on what it is allowed to select:

- Selects only **free** layers (which family a fork's room serves, what a frieze says, which door a
  solution opens) → `condition` stays free, the stability table needs one row rewritten, nothing else.
- Selects a **carve** or **rooms** layer (ramps, floods, extra keys) → `condition` moves to the
  "moves the walls" list and every site carrying one re-carves.

Worth keeping the two apart deliberately, rather than discovering the boundary later: a free
condition-dispatch can ship on its own and never be regenerated.

### Kinds the catalogue wants

`ConditionKind` is `overgrown | flooded` today. Adding a kind is free while it only draws, so the
vocabulary can be grown before anything reads it.

| Kind | Layer it would dispatch | Tier |
| ---- | ----------------------- | ---- |
| `flooded` | A3 two walkable shapes; corridors below the waterline closed until drained | carve |
| `overgrown` | C1 roots over the inscriptions — the layout must be deduced | free |
| `sand-choked` *(new)* | A1 ramps; sand is what a one-way slide is made of | carve |
| `collapsed` *(new)* | A2 bars liftable only from behind, A5 corridors closing as you pass | rooms / carve |
| `undisturbed` *(new)* | B-class door puzzles — nothing has broken in, so the builders' own choices still stand | free |

---

## A. Geometry — the floor is shaped against you

| # | Idea | Leans on | Tier | Build |
| - | ---- | -------- | ---- | ----- |
| A1 | **One-way ramp.** A real corridor, passable downhill only, landing at an authored room upstream. Seen on arrival, not from the map. | maze carving, `sealed`, the `hidden` mask for the unmask-on-arrival | carve | M |
| A2 | **Bar lifted from behind.** A door that opens only from its far side, then stays open forever. | gates, and persistence already remembering open gates | rooms | S |
| A3 | **Two walkable shapes.** A lever floods or drains; the same map has a wet route and a dry one. | cell masking | carve | M |
| A4 | **Shaft between distant floors.** Floor 3 reconnects to floor 1, so deep floors stop demanding the full climb. | `end:{stairId}` / `entrance:{stairId}` already pair sections by id | rooms | S |
| A5 | **Collapse behind you.** Corridors close as you pass, for this visit only. | masking | carve | M |
| A6 | **Rising sand.** Corridors close in a fixed, knowable order during a visit — a timer wearing geometry's clothes. | masking | carve | M |
| A7 | **Rotating hub.** A chamber that turns to face different branches. | nothing | rooms | L |

## B. The fork becomes the puzzle

| # | Idea | Leans on | Tier | Build |
| - | ---- | -------- | ---- | ----- |
| B1 | **Two declared solutions, two doors.** One board with exactly two legal answers, each opening its own corridor. | lightbeam, the uniqueness verifier with a swapped accept predicate (`count == 2`, and the two must differ in the door-bearing feature) | free | M |
| B2 | **One board, two goals.** "Route the beam to the east shrine" *or* "to the north" — each goal uniquely solvable, so §3.3 is untouched and the verifier needs no change. | lightbeam as-is | free | S |
| B3 | **Risk fork.** The easy target opens the short branch, the hard one opens the rich branch. | per-family difficulty knobs | free | S |
| B4 | **Flip without re-solving.** Once the board is solved, returning lets the player switch which door stands open. Without this, B1/B2's second door is a chore — the player already knows the answer. | — | free | S |
| B5 | **The same board at two forks.** Solve it once and both forks are understood; the floor reads as one object rather than a corridor with rooms on it. | — | free | S |

Which families can carry a door at all: the answer has to *point somewhere*. Lightbeam's beam lands
on a shrine, canal's channel leaves by an edge, a loop family encloses one alcove or the other.
Most families have no such feature and simply never carry one.

## C. Knowledge is the obstacle

| # | Idea | Leans on | Tier | Build |
| - | ---- | -------- | ---- | ----- |
| C1 | **Deduce the layout.** Inscriptions say where things lie — "two chambers east of the second fork" — and the map fills in from reasoning rather than walking. The most archaeologist-shaped idea here, and it moves no wall. | exploration masking | carve | M |
| C2 | **The frieze names the true door.** The others loop back. Stray maze loops become content instead of the defect `sealed` exists to suppress. | the maze already makes loops | free | S |
| C3 | **Detectors reveal shape, not corridors.** Extends the detector from "a passage is here" to "the floor is this shape". | detector/perk system | free | S |

## D. Spend and choose

| # | Idea | Leans on | Tier | Build |
| - | ---- | -------- | ---- | ----- |
| D1 | **Fewer keys than locks.** Two floor keys, three sealed doors: pick two now, a revisit settles the rest. | `floorKeys.ts`, coloured `floor-key` gates | rooms | S |
| D2 | **A lever elsewhere opens a door here.** Solving A reconfigures B. | — | carve | M |

D1's tier is the trap: a `floor-key` gate makes the assembler grow a section to host its key, so
every extra lock is new ground.

## E. The whole floor as one board

| # | Idea | Leans on | Tier | Build |
| - | ---- | -------- | ---- | ----- |
| E1 | **Visit-order floor.** Rooms carry the numbers or nodes; the floor is a hidato walked rather than tapped. | hidato, constellation | free | M |
| E2 | **Push the blocking stone** through the corridors to clear a path. | the rushHour family, though not its navigation | rooms | L |

## F. Metroidvania, once A exists

Ward gates are already the locks, tomb treasures already the abilities, persistence already the
come-back-to-old-rooms loop. The half that is missing is an ability that changes **how you move**
rather than what you open.

| # | Idea | Leans on | Tier | Build |
| - | ---- | -------- | ---- | ----- |
| F1 | **Rope.** Climb a one-way ramp backwards; floors walked long ago re-route on the next visit. | the perk system | free | S, after A1 |

---

## Tensions to settle before any of this is designed

- **Uniqueness.** §3.3 makes the verifier required infrastructure and forbids rejecting a
  legitimately valid answer. B1 survives only if both solutions are declared and both are accepted;
  an accidental second solution is still a defect.
- **Stranding.** A ramp that points upstream and gates nothing leaves the reachability solver free to
  ignore backward edges. One that can strand a player does not, and would need the solver to go
  directed.
- **The walk.** Ramps shorten the walk out, which is the direction the floor layout is already being
  pulled. A5 and A6 pull the other way — they add walking to punish a bad order.
- **Where the puzzle actually lives in A1.** A ramp that never strands is a convenience. It becomes a
  puzzle only through *where landings point*: aim each at the mouth of a branch not yet taken and
  clearing a floor in one pass turns into a route-ordering problem. Landings at the entrance are
  faster exits and nothing more.

## Rejected

- **Rooms emit tokens, a floor gate consumes them** — the floor's play becomes bookkeeping carried
  between rooms, and every room's reward turns into an ingredient rather than a reward.
- **Ward keys renamed abilities** — a rename with no new play; the gates already are the
  metroidvania.
