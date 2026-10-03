# floor-as-puzzle-brainstorm.md

Status: **exploration — nothing decided, nothing scheduled.** An inventory of ways a pyramid floor
could itself be played, sorted by what each would cost a run in progress.
Companion to `pyramid-interior-design.md` (the floor system, §6–§7), `world-spec-stability.md` (the
cost tiers this page sorts by), `PUZZLE_FAMILIES.md` (which families can carry a door), and
`../mods/floor-topology-design.md` (how these become mods that can be taken back out).

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

| Tier      | What it means                                                          | What a run loses                                              |
| --------- | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| **free**  | Content-side. Encounter, reward, gate key, drawing. Walls do not move. | nothing                                                       |
| **carve** | Walls move, no room is added or removed.                               | nothing — corridors relight to each section's high-water mark |
| **rooms** | The authoring adds, removes or replaces a room.                        | those rooms, and any chest in them, come back unexplored      |

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

| Kind                  | Layer it would dispatch                                                                                     | Tier          |
| --------------------- | ----------------------------------------------------------------------------------------------------------- | ------------- |
| `flooded`             | A3 two walkable shapes; corridors below the waterline closed until drained                                  | carve         |
| `overgrown`           | C1 roots over the inscriptions — the layout must be deduced                                                 | free          |
| `sand-choked` _(new)_ | A1 ramps; sand is what a one-way slide is made of                                                           | carve         |
| `collapsed` _(new)_   | A2 bars liftable only from behind, A5 corridors closing as you pass                                         | rooms / carve |
| `undisturbed` _(new)_ | B-class door puzzles and E3's sequence door — nothing has broken in, so the builders' own locks still stand | free          |

---

## A. Geometry — the floor is shaped against you

| #   | Idea                                                                                                                                | Leans on                                                            | Tier  | Build |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----- | ----- |
| A1  | **One-way ramp.** A real corridor, passable downhill only, landing at an authored room upstream. Seen on arrival, not from the map. | maze carving, `sealed`, the `hidden` mask for the unmask-on-arrival | carve | M     |
| A2  | **Bar lifted from behind.** A door that opens only from its far side, then stays open forever.                                      | gates, and persistence already remembering open gates               | rooms | S     |
| A3  | **Two walkable shapes.** A lever floods or drains; the same map has a wet route and a dry one.                                      | cell masking                                                        | carve | M     |
| A4  | **Shaft between distant floors.** Floor 3 reconnects to floor 1, so deep floors stop demanding the full climb.                      | `end:{stairId}` / `entrance:{stairId}` already pair sections by id  | rooms | S     |
| A5  | **Collapse behind you.** Corridors close as you pass, for this visit only.                                                          | masking                                                             | carve | M     |
| A6  | **Rising sand.** Corridors close in a fixed, knowable order during a visit — a timer wearing geometry's clothes.                    | masking                                                             | carve | M     |
| A7  | **Rotating hub.** A chamber that turns to face different branches.                                                                  | nothing                                                             | rooms | L     |

## B. The fork becomes the puzzle

| #   | Idea                                                                                                                                                                                                | Leans on                                                                                                                               | Tier | Build |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----- |
| B1  | **Two declared solutions, two doors.** One board with exactly two legal answers, each opening its own corridor.                                                                                     | lightbeam, the uniqueness verifier with a swapped accept predicate (`count == 2`, and the two must differ in the door-bearing feature) | free | M     |
| B2  | **One board, two goals.** "Route the beam to the east shrine" _or_ "to the north" — each goal uniquely solvable, so §3.3 is untouched and the verifier needs no change.                             | lightbeam as-is                                                                                                                        | free | S     |
| B3  | **Risk fork.** The easy target opens the short branch, the hard one opens the rich branch.                                                                                                          | per-family difficulty knobs                                                                                                            | free | S     |
| B4  | **Flip without re-solving.** Once the board is solved, returning lets the player switch which door stands open. Without this, B1/B2's second door is a chore — the player already knows the answer. | —                                                                                                                                      | free | S     |
| B5  | **The same board at two forks.** Solve it once and both forks are understood; the floor reads as one object rather than a corridor with rooms on it.                                                | —                                                                                                                                      | free | S     |

Which families can carry a door at all: the answer has to _point somewhere_. Lightbeam's beam lands
on a shrine, canal's channel leaves by an edge, a loop family encloses one alcove or the other.
Most families have no such feature and simply never carry one.

## C. Knowledge is the obstacle

| #   | Idea                                                                                                                                                                                                                        | Leans on                     | Tier  | Build |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ----- | ----- |
| C1  | **Deduce the layout.** Inscriptions say where things lie — "two chambers east of the second fork" — and the map fills in from reasoning rather than walking. The most archaeologist-shaped idea here, and it moves no wall. | exploration masking          | carve | M     |
| C2  | **The frieze names the true door.** The others loop back. Stray maze loops become content instead of the defect `sealed` exists to suppress.                                                                                | the maze already makes loops | free  | S     |
| C3  | **Detectors reveal shape, not corridors.** Extends the detector from "a passage is here" to "the floor is this shape".                                                                                                      | detector/perk system         | free  | S     |

## D. Spend and choose

| #   | Idea                                                                                                     | Leans on                                   | Tier  | Build |
| --- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----- | ----- |
| D1  | **Fewer keys than locks.** Two floor keys, three sealed doors: pick two now, a revisit settles the rest. | `floorKeys.ts`, coloured `floor-key` gates | rooms | S     |
| D2  | **A lever elsewhere opens a door here.** Solving A reconfigures B.                                       | —                                          | carve | M     |

D1's tier is the trap: a `floor-key` gate makes the assembler grow a section to host its key, so
every extra lock is new ground.

## E. The whole floor as one board

| #   | Idea                                                                                                                                                                                                                                  | Leans on                                       | Tier  | Build |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ----- | ----- |
| E1  | **Visit-order floor.** Rooms carry the numbers or nodes; the floor is a hidato walked rather than tapped.                                                                                                                             | hidato, constellation                          | free  | M     |
| E2  | **Push the blocking stone** through the corridors to clear a path.                                                                                                                                                                    | the rushHour family, though not its navigation | rooms | L     |
| E3  | **Sequence door.** A door carries four glyphs; the same glyphs lie out in the corridors, and it opens when they are crossed in its order. A reset tile by the entrance clears a broken sequence, so a wrong step costs the walk back. | gates, the hieroglyph vocabulary               | free  | M     |

**E3 is cheap where it looks expensive.** Gate _presence_ is structural; which key opens a gate is
free. So the sequence is a currency — `gate: { type: "sequence" }` beside `floor-key` and
`tomb-key` — and no room, wall or chest moves to add one. The keys-and-locks solver asks it the
question it already asks of a floor-key: is the opener reachable, upstream, on this floor? Four
tiles instead of one chest, same answer.

**It constrains where a glyph may lie.** If crossing a glyph out of order breaks the sequence, every
glyph tile has to be avoidable — one sitting on the only corridor to somewhere else makes the door
unopenable except by luck. Two placements satisfy that: a dead-end spur, or a cell with a bypass
loop. Stray maze loops are exactly such a bypass, and this is the one place on this page that wants
what `sealed` exists to suppress.

**It is the layer the other layers modify.** A ramp can drop the player past a glyph still needed
(A1); a flood can put one under water (A3); a ward gate on the fourth glyph makes the door wait on a
treasure from another site (F). Nothing else here composes with all of them.

**Shared verb with E1, different deduction.** E1 has the player work the order out from the board;
E3 gives the order and makes reaching it the problem. §4.23's rule tolerates a shared verb and not a
shared deduction, so both can stand.

## F. Metroidvania, once A exists

Ward gates are already the locks, tomb treasures already the abilities, persistence already the
come-back-to-old-rooms loop. The half that is missing is an ability that changes **how you move**
rather than what you open.

| #   | Idea                                                                                         | Leans on        | Tier | Build       |
| --- | -------------------------------------------------------------------------------------------- | --------------- | ---- | ----------- |
| F1  | **Rope.** Climb a one-way ramp backwards; floors walked long ago re-route on the next visit. | the perk system | free | S, after A1 |

---

## G. Wizard — the scope outgrows the floor

Wizard's identity is not another mechanic, it is a larger board. Expert plays a floor, master plays
a site, and these two play the journey and the site-as-one-object. Cosmic is the right register for
it: the material is cosmic dust, the stuff constellations are made from, and putting it back is
restoring a balance rather than opening a door.

| #   | Idea                                                                                                                                                                                                            | Leans on                                                              | Tier  | Build |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----- | ----- |
| G1  | **The choked pyramid.** One pyramid in the journey is wholly buried in cosmic dust. Handles in its sibling pyramids clear it one path at a time.                                                                | the `hidden` mask, gates as currency consumers, `getUnexploredLevels` | rooms | L     |
| G2  | **The hourglass.** The upper floor is choked; a lever there sends the player down to a floor walked as a hidato, sand falling in behind them, and the path they trace below decides which corridors open above. | hidato, the stair pairing, `floorExploration`'s shape                 | rooms | L     |

### G1 — a currency whose scope is the journey

The return half already ships. `getUnexploredLevels(journeyId, heldKeys)` answers "which of this
journey's pyramids still hold something I can now reach", drives the travel screen's pulse, and
names no mod — its keys are opaque ids. A dust currency is another such id, so the come-back loop
needs nothing new.

What is new is the **scope**. Every currency today is either positional (a key in a place) or spread
across the world; this one is spread across _one journey's siblings_ and consumed in _one_ of them.
§E's split between positional keys and spread currencies is the vocabulary for saying so.

**Free forward travel is the enabler, and it is a progression change.** A journey holds one
`levelNr` cursor: revisiting an earlier pyramid already works, reaching a later one out of order
does not. Without that change the choked pyramid is only a later level with dust drawn on it.

**Restoring, not unlocking.** The handles clear paths in a pyramid the player has already seen
buried, which is why this reads as balance rather than as a key.

**The dust takes the spine too.** The choked pyramid is entered and gives nothing until its siblings
are worked — not a pyramid with buried branches, a pyramid with nothing reachable. This is the one
place in the game a site is not completable on arrival, and it is safe for the reason
`../mods/floor-topology-design.md` gives: the opener lies outside the site and leaving is always
available, so the player is never stuck, only sent elsewhere.

**Balance is ma'at, and the tier already says so.** wizard_3 is the Chamber of Ma'at, and ma'at is
truth and order — the way things are supposed to be, and what the mural's finale weighs. A pyramid
choked with cosmic dust is a place fallen out of the sky's order, and the handles put it back. The
meaning is the journey's own name rather than fiction imported for a mechanic.

**Free order is per journey, not per tier.** The handles clear a pyramid among its own journey's
siblings; journeys stay reachable as they always were, and tiers still gate on tomb tableaus. That
is why the currency's scope is the journey (P5).

### G2 — the puzzle's output is a map

Every other idea on this page gates a map. This one **authors** one: the trail walked below is the
corridor layout above. That is the strongest form of "the floor is a puzzle" here, and it gives A5 a
purpose — sand closing behind you stops being a punishment and becomes the mechanism. The trail is
the answer.

**Seeing the choked floor first is the information channel.** The player climbs to the blocked floor,
reads which corridors are buried, then descends to decide where to put the sand. Reversed, it is
guesswork. So the upper floor must be enterable-and-useless rather than hidden, the same property G1
wants of its pyramid.

**The coupling is by authoring address, not by coordinate.** Floors carve independently and share no
grid, so "the sand from this cell lands in that one" cannot be geometric. Filling the section below
frees a named section above — authored, and the same keying a save already uses
(`${levelNr}:${sectionAddress}`).

**Turning the hourglass is the reset, and re-entry is the cheapest form of it.** Sand behind the
player can strand them; the flip is the diegetic remedy, and persistence already reseats a returning
player at the entrance. Space is the two floors, time is the flip — which is what makes the site read
as one object rather than two floors that happen to be stacked.

**The reset is a _turn_, never a _restart_.** The hourglass going over is the sun coming round
again — the world working, not the game offering another go. The distinction survives only if the
word does, and it will be a UI string somebody writes without thinking.

**What runs in is the desert, not a clock.** Egypt measured hours with water. Sand filling a chamber
is what happens to every one of these places; this is the one where it is mechanical. The hourglass
is the image the site makes, not an object anybody in it would recognise.

**It is Ra's night voyage, and it belongs to wizard_1.** The sun going under the world at nightfall,
twelve hours in the dark with things in the way, and coming up the other side — climb, pull the
lever, descend into the dark, trace a path while what is behind you closes. Turning the hourglass
over is the sun coming round again, which is why the reset reads as the world working rather than as
a retry button. The site is one of wizard_1's own pyramids, so the story and the mechanic are the
same object.

**Up rather than down.** The stair pairing that links floors is direction-agnostic; what calls a
transition a descent is presentation.

---

## Laddering across the tiers

The catalogue is wide enough to climb the tier ladder rather than to pick one mechanic, and the
rungs already exist — §7 gives every tier a debut of its own, so a floor layer arrives beside the
structure it needs instead of on a ladder invented for it.

| Tier    | What the tier already debuts | The layer that fits it                                                                                                                                                  | Tier          |
| ------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Starter | a line, no fork              | **none**                                                                                                                                                                | —             |
| Junior  | the first fork               | B2/B3 — the fork becomes a choice made by solving                                                                                                                       | free          |
| Expert  | seals, and a second floor    | E3 sequence door; A1 ramps                                                                                                                                              | free / carve  |
| Master  | many forks, dormant content  | A3 two walkable shapes; D1 fewer keys than locks; A4 shafts                                                                                                             | carve / rooms |
| Wizard  | every mechanic at once       | the scope grows past the floor — G1 the choked pyramid, G2 the hourglass; and composition, a ramp dropping past a glyph still needed, a fourth glyph behind a ward gate | rooms         |

**Starter gets nothing, and that is the finding.** A floor with no fork has no route to choose, so
every layer here is inert on it. Starter's play stays in the rooms.

**Expert is where the sequence door belongs** for a reason beyond having somewhere to put it: expert
debuts the seal, a lock whose key lies on the floor. A sequence door is a lock whose key _is_ the
floor. The tier teaches one and then generalises it.

**The ladder and the build order coincide.** Junior's layer is free and Expert's is half free, so
climbing the tiers from the bottom also spends the cheapest tiers first — nothing needs
regenerating until the ladder reaches ramps.

## Keeping it from repeating

Two different kinds of sameness, and only one of them is about how many layers there are.

**Between sites — a budget, not a probability.** §9 authors ward mix and fragment spread as
authorable counts, and this belongs in the same vocabulary: how many sites per journey carry a
layer, with a cap per journey and a cap per tier. The rule worth holding is **one layer per site,
never per floor** — a site is the flooded one, or the one with the sequence door, not a sampler of
everything the tier has unlocked.

The dispatch has room for it. Six floors in the world carry a `condition` today, all of them
`overgrown`; `flooded` is authored nowhere. Whatever density the budget lands on, it is growing into
empty space rather than competing with existing authoring.

**Within one layer — knobs, the way a family has knobs.** Twelve sequence doors of four glyphs each
are one door twelve times. §3.1 gives every puzzle family its knobs for exactly this, and a layer
needs the same:

- **E3** — glyph count · whether the door gives the order or a frieze implies it · whether one glyph
  sits behind a gate · how far the reset tile is from the door.
- **A1** — where the landing points, which is also where its difficulty lives.
- **A3** — which of the two shapes is the generous one, and whether the lever is on the wet side.
- **B2** — how far apart the two goals sit; two shrines a mirror apart is a different puzzle from two
  at opposite corners.

**`patron` is the third variation axis and costs nothing**, because it is already free and already
drawn. The same sequence door reads differently as Thoth's glyph order than as Sobek's. Patron is on
68 floors today and 23 of those are `maat`, so there is spread to gain before a single new mechanic
is needed.

## Tensions to settle before any of this is designed

- **Uniqueness.** §3.3 makes the verifier required infrastructure and forbids rejecting a
  legitimately valid answer. B1 survives only if both solutions are declared and both are accepted;
  an accidental second solution is still a defect.
- **Stranding.** A ramp that points upstream and gates nothing leaves the reachability solver free to
  ignore backward edges. One that can strand a player does not, and would need the solver to go
  directed.
- **The walk.** Ramps shorten the walk out, which is the direction the floor layout is already being
  pulled. A5 and A6 pull the other way — they add walking to punish a bad order.
- **A broken sequence must be visible.** E3's door showing which glyphs have been crossed is not
  decoration — without it a player cannot tell they are broken, and the reset tile is a mystery
  rather than a remedy.
- **E3 adds no arithmetic.** Fine for a lock, which is not a puzzle family and answers to no
  curriculum slot. Not fine if it displaces a puzzle room: the floor would get longer and teach less.
- **G2 needs a sand state a save can hold**, shaped like `floorExploration` but authoritative rather
  than a summary: a half-turned hourglass is a real position in the world, not a snapshot of one.
- **G1 asks whether a pyramid may be useless.** A site that can be entered and offers nothing until
  its siblings are worked is new — everything today either withholds content or gives it.
- **Where the puzzle actually lives in A1.** A ramp that never strands is a convenience. It becomes a
  puzzle only through _where landings point_: aim each at the mouth of a branch not yet taken and
  clearing a floor in one pass turns into a route-ordering problem. Landings at the entrance are
  faster exits and nothing more.

## Rejected

- **Rooms emit tokens, a floor gate consumes them** — the floor's play becomes bookkeeping carried
  between rooms, and every room's reward turns into an ingredient rather than a reward.
- **Ward keys renamed abilities** — a rename with no new play; the gates already are the
  metroidvania.
