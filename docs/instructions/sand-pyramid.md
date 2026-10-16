# The sand pyramid — plan

A plan for later. The designer asked for the design and its impact now. The slices at the end say what to
build when the work is picked up.

## The design

**wizard_3, the Chamber of Ma'at, opens on a pyramid full of sand.** Its first pyramid is buried past the
arrival. The player can walk in, see the sand and walk out. Because a journey's pyramids stay in order,
wizard_3's later pyramids wait behind it.

**The sand clears through work done elsewhere.** Levers stand in the pyramids of the other wizard journeys.
Each lever has a name and clears the sand of that name, and nothing else. Clearing is one-way: cleared sand
never comes back.

**The sand lies inside the floor locks too.** A wizard floor lock can cover almost a whole floor, and wizard is
where the most complex locks belong. So a lock may declare **outside inputs**: doors of its own whose owner is
not on the floor. The web says which lever each input waits for. Sand that buries a lock's forecourt, a
shortcut that opens when a far lever is pulled, an exit that also waits on another journey: all are the lock's
own gates, and the lock's walk proves them.

**Any play order works, and a tool proves it.** The wizard journeys open together, so the player may pull
the levers in any order. The web walker (below) walks every order and proves each one finishes, so nothing
has to force the sand to clear from the front to the back.

**The sand works both ways.** Places freed in wizard_3 hold keys that open things in the other journeys'
pyramids: a deep floor, a sealed side hall, a door inside another floor's lock. The player goes back and forth
between journeys. This is the ward-gate shape the game already has (a gate here, its key from elsewhere),
with both ends inside one tier.

**Sand may lie in any wizard_3 pyramid.** The first worked example is wizard_3 pyramid 1 buried: its arrival
floor under sand and its hub floor's lock waiting on two levers. Once its exit is clear the pyramid can be
finished, and pyramid 2 opens. Places still under sand are things to come back for.

**The order between wizard journeys is free; inside a journey it stays.** Holding the wizard tier key opens
wizard_1 to wizard_4 at once. Inside a journey the `levelNr` cursor stays.

**The lever looks different from the floor lever.** A floor lever (`toggle`) swings both ways and works on
its own floor. A sand lever is pulled once, never goes back, and works on another site. The player should
see that before they touch it.

## Two layers, one mechanism

There is one mechanism under the sand: **a door on a floor whose key is held from outside the floor**, a named
key `web:<id>` that a web activator mints and that only ever arrives. `floorLock` reads a whole floor as a lock
(`src/game/floorLock.ts`), side sections and lock ground alike, so to the floor walker every such door is the
same thing: an outside input of the floor.

It is written in two places, by who owns the ground the door stands on:

- **Inside a floor lock**, the lock declares the input and uses it on its own gates; the web binds the input to
  an activator. Only the lock can say where a door stands among its regions, and the carve decides which
  side sections hang in which region (`../game-design/regions-and-containers.md`), so the web cannot point
  into a lock's ground by section.
- **On ground no lock owns**, the web buries a section by its address: a whole floor past its arrival, a side
  section's mouth. A lock cannot do this: it cannot reach a section the carve hung outside its regions, nor
  ground before its `in` or after its `out`, nor a stair section leading to a ward wing.

A floor without a lock does not need a trivial lock to carry sand: the section gate is the same door. Both
writings share one proof, one key, one look and one save.

## The lock side: outside inputs

A lock declares an input with a line of its own, and names it on its gates like any owner:

```
A outside                       an outside input: held or not, never on this floor's controls
in -[A]- court                  open once A is held
court -[R|A]- east              the lever or the input
scale -[p1+A]- out              a stone on p1 and the input
hall -[A]                       a buried region: hall impassable until A is held
```

**The rules, each refused by name when broken:**

1. **An input is named bare.** `-[A:off]-` would open while the input is missing and shut when it arrives,
   which makes arrival a loss. Refused: `outsideState`.
2. **An input owns at least one gate** (the existing "owns no gate" refusal).
3. **An input is not a draft.** An owner nothing declares stays a draft, refused as "not placed yet", as today;
   `outside` is the declaration that says the owner is meant to come from off the floor.
4. **A lock declares at most three inputs.** Each doubles the walk's states (below). Refused: `outsideTooMany`.

An input may own a region barrier, `hall -[A]`: the region is buried until the input arrives. While it lies, a
torch in the region is doused (`douseTorches`, `src/game/mechanismDoors.ts`), as under water; once the sand
clears the torch can be lit again. The walk below models that, so it needs no rule of its own.

**In the walk an input is a one-way mechanism**: states `missing` and `held`, starting `missing`, opening its
gates in `held`. Its one move, `missing → held`, is an **arrival**: a move the walk may make from every state,
wherever the player stands, never a choice made in a region. That is exact. A key arrives while the player is
elsewhere, and the player comes back to the state they left: between journeys the save keeps the position, and
a pyramid re-entered from the travel map comes back at its entrance, which re-entry models (below). An arrival
mid-visit, from an activator on another floor of the same pyramid, is a state the player left too.

So the walk has every order of arrival in it, and every check runs over all of it: a torch doused under sand and
then the sand cleared is a state like any other, and from it the way out must still be reachable and no region
lost. The walk counts an arrival as a way out of a state: a pocket whose way out waits on a missing input is not
a strand on the floor. Whether that input can be fetched without finishing this pyramid is the web's question
(below).

**The cost.** A lock's states are its regions times the product of its mechanisms' states, so n inputs
multiply them by 2ⁿ: three inputs, eight times. `MAX_LOCK_STATES` (50,000, `src/game/lockWalk.ts`) still
caps the walk and reports `tooLarge`; rule 4 keeps a wizard lock well inside it. A section gate on the same
floor is an input of the floor's compiled lock too, and counts against the floor walk's ceiling, not the
lock's rule.

A lock with inputs is placed only where a web binds every one of them, which today is the wizard tier.

### What `yarn lock <file>` reports for a lock with inputs

```
✓ compiles
✓ every region is reachable
✓ solvable
inputs: A, B, C, arriving in any order
✓ every shut door is seen before its control: A at in, B at court, C at scale
```

`doorsSeenLate` (`src/game/lockChecks.ts`) answers the input doors too, in the same walk. Inputs start
missing, so a door naming one is shut at the start, and the check's own rule (reach the door from `in` while
its owners are unchanged) means reaching it while its input is still missing; other inputs may arrive on the
way. An input has no control region on the floor, so nothing is forbidden but its arrival. A lock whose input
door is in reach only once the input has arrived is warned about (`⚠ C: its door is reached only once C is held`), refused on a lesson. The order between levers across pyramids is the web's question, answered on the
baked floors (below).

## The web side: the web lock

The tier's web is written one level above the floor locks: the idea and the notation of a `.lock`
(`../mods/mechanic-contract.md` §7, `yarn lock --help`), with pyramids, their sections and their locks'
inputs as the places. One web per tier; the wizard web lives at `src/game/locks/wizard/chamberOfMaat.web`.
The designer owns it, as they own master and wizard locks. Claude builds the format, the walker and the
placement.

### Notation

A web has five kinds of line.

**Journey order.** One line per journey, its pyramids in order. `>` reads "is finished before the next
opens", which is the `levelNr` cursor rule. There is no order between lines: the journeys of a web are open
together.

```
w3p1 > w3p2 > w3p3 > w3p4 > w3p5 > w3p6
```

`w3p1` is journey `wizard_3`, pyramid 1 (the `levelNr`, counted from 1). The tool checks every line
against the world: the journey exists and has that many pyramids.

**Sections.** A place on ground no lock owns is a section of a floor of a pyramid, by its authoring address:

| Written        | Means                                                            | Save key, inside `wizard_3`'s record  |
| -------------- | ---------------------------------------------------------------- | ------------------------------------- |
| `w3p1.f1`      | floor 1's main path, and so the whole floor (all hangs off main) | `1:main`, cells whose key starts `1/` |
| `w3p1.f1.s4`   | side section `s4` of floor 1, and all that hangs off it          | `1:s4`, cells whose key starts `1/`   |
| `w3p1.f1.s4.0` | its first sub-path                                               | `1:s4.0`, cells whose key starts `1/` |

This is `${levelNr}:${sectionAddress}`, the key a save already files a section's cells under
(`src/app/SiteMap/cellIdentity.ts`), with the floor added: a section address repeats on every floor, and
a cell's key carries the floor (`${floor}/${slot}`). It is also the stair id's address
(`wizard_3:p0:f1:s4`, which counts pyramids from 0). A section holds everything that hangs off it: a
ward wing's floor hangs off the stair section that leads up to it.

An unlabelled side section's address shifts when a section is authored ahead of it
(`../game-design/world-spec-stability.md`, a section's `label`). Placement pins every section a web names
by giving it its current address as its label.

**Section sand.** A section that stays impassable until its key is held, written like a `.lock` region gate:

```
w3p1.f0 -[sun]
```

On a floor's main path the gate stands at its first seam after the arrival; on a side section, at its mouth.
One owner, or `-[C+D]` (every owner) and `-[C|D]` (any owner), as in a `.lock`.

**Input bindings.** A lock's input, bound to the activator that holds it:

```
w3p1.f1.scales.A = moon
```

`w3p1.f1.scales.A` is input `A` of lock `scales` on floor 1 of `w3p1`. The lock is named because a floor can
carry several (`locks: [...]` on `.floor`), and a lock goes by its bare file name, unique across tiers. A web
names a lock's inputs, its declared interface, and never its regions, so the lock stays reusable: any web
binding the same inputs can place it.

A binding names one activator. The lock does the combining (`-[A+B]-`, `-[A|B]-`): a floor door folds all
its owners under one mode (`openDoorsFor`, `src/game/mechanismDoors.ts`), so a binding with a mode of its own
could not be laid on it. One activator may hold several inputs and several section gates.

**Levers and keys, with their site.** An activator of the web, written like a `.lock` activator:

```
moon activator @w2p2.f1
ankh activator @w3p1.f1.s4
```

An activator stands at the end of the section it names: `@w2p2.f1` is floor 1's main-path end reward,
`@w3p1.f1.s4` is the end reward of side section `s4`. It is the section's `endReward`, so it is positional
content and costs no re-carve. One activator per section end. Lever or key is the look, bound outside: an
activator whose doors stand in wizard_3 is drawn as a sand lever, one whose doors stand elsewhere as a key.

Only activators. A web has no toggle, no torch, no sequence: everything in it only opens.

### The worked example

**An illustration, not a design.** The designer writes the wizard locks and the web; the lock below exists to
show the shape, and its names are placeholders. The section numbers are wizard_3 pyramid 1 as baked today
(`src/data/generatedWorld.ts`, wizard_3 from :16326): floor 0 is one seven-room section ending at the stairs,
floor 1 is the hub (main path, ten side sections, `s7` the stairs up to the ward wing), floor 2 is the ward
wing behind `wizard_a_1`.

Floor 1 carries a lock, `scales`, built on highWater's flood-and-torch trick with a stone to carry and three
inputs. Written with each input as an activator standing at `in`, which `yarn lock` can walk today, it is
sound: 6 floor actions with every input held, 7 with the east drift still lying (the lever's way round):

```
// designed by: <designer>   (an illustration; the real wizard locks are the designer's)
// wizard. The weighing hall under the drift. The key lies past a cellar that is dry only while the torch's
// hall is flooded; the scale's pan wants a stone from the east room, behind a lever or a drift.

A outside                    // the drift across the forecourt
B outside                    // the drift in the east passage: a short cut past the lever
C outside                    // the sand on the counterweight: the exit also waits on it

in -[A]- court
court -- hall
hall -- sluice
hall -- torchHall
hall -- cellar -- vault
torchHall -[S:a]
cellar -[S:b]
hall -[K+T]- scale
court -[R|B]- east
scale -[p1+C]- out
S toggle @sluice
T torch @torchHall
K activator @vault
R toggle @scale
p1 plate @scale
p0 plate @east stone
```

The web:

```
// designed by: <designer>   (an illustration)
// wizard. The Chamber of Ma'at, buried: levers in the other journeys clear its arrival floor and the
// weighing hall's lock, and let wizard_3 go on. What it frees opens places in wizard_1 and wizard_4.

w1p1 > w1p2 > w1p3 > w1p4
w2p1 > w2p2 > w2p3 > w2p4 > w2p5
w3p1 > w3p2 > w3p3 > w3p4 > w3p5 > w3p6
w4p1 > w4p2 > w4p3 > w4p4 > w4p5 > w4p6

// sand on ground no lock owns
w3p1.f0 -[sun]                 // the arrival floor past the arrival

// sand inside the weighing hall's lock
w3p1.f1.scales.A = moon        // the forecourt: the whole lock
w3p1.f1.scales.B = star        // the east drift: a short cut, never a need
w3p1.f1.scales.C = star        // the counterweight: the exit

// the levers
sun activator @w1p1.f1
moon activator @w2p2.f1
star activator @w4p3.f1

// what the sand keeps, and what it opens elsewhere
ankh activator @w3p1.f1.s4
djed activator @w3p2.f1.s2
w1p3.f1.s3 -[ankh]             // a sealed hall in wizard_1
w4p4.f1.weighing.W = djed      // a door inside wizard_4 pyramid 4's floor lock, which declares W outside
```

How it plays: the player meets w3p1 buried at any time. `sun` (wizard_1's first pyramid) clears floor 0 and
brings them to the hall's forecourt; `moon` (wizard_2's second) clears it. Inside, the lock plays as a lock:
key, flood, torch, and a stone for the pan, fetched by the lever's way round or straight through the east
passage once `star` is pulled. `star` (wizard_4's third) also clears the counterweight, so w3p1 is finished
only after all three, and w3p2 opens. Whether `s4` and its `ankh` hang inside the lock's regions or outside
them is the carve's choice; the web walk reads it off the baked floor. `djed` stands in w3p2 and opens a
door inside wizard_4's fourth pyramid.

### What `yarn lock <web>` reports

A web is bound to one baked world. The tool reads the carved floors of every pyramid it names and walks each
floor with `floorLock` under the web keys held at that point (below), so it runs after a bake that carries
the web's gates and bindings. Before a bake, `yarn lock` on each wizard lock gives the floor-level checks.

**A visit** is one entry into one pyramid from the travel screen. **A revisit** is a visit to a pyramid
already visited. Every pyramid needs one visit, so the cost the web adds is its revisits. The walk is
breadth-first over the states (held web keys, each journey's cursor), one move per visit.

**What a visit can do under held keys H** comes from the floor walks of that pyramid with arrivals limited to
the keys in H, memoised per pyramid and per H (a pyramid's own web keys are few, so the subsets are few). A
state of that walk holds any part of H, since a key held now may have arrived at any point of earlier visits:

- **finishes** if, from every state the floor walks reach under H, the exit is still reachable under H;
- **takes an activator** if, from every such state, the activator's cell is still reachable;
- **sees a face** if some such state stands beside a door that waits on a key not in H.

The first two read "every state", not "the fresh floor": a floor may be played into a state from which its exit
waits on a key not yet held, and the web must not count on the player having avoided it. The third reads
"some state", as `doorsSeenLate` does.

```
## chamberOfMaat.web   (the shape of the report; the numbers are illustrative)

✓ compiles
✓ every place is in the world
✓ every input is bound, and every binding names an input
✓ solvable: every journey finishes
✓ every gate opens
✓ no softlock
✓ every buried place is seen before its lever is pulled
✓ no activator stands in sand only it clears
assumed held on the way: the ward key on w4p4's wing stairs

cheapest: 21 visits to finish every journey and clear everything, no revisit
  w1p1 sun ▸ w2p1 ▸ w2p2 moon ▸ w4p1 ▸ w4p2 ▸ w4p3 star ▸ w3p1 ankh ▸ w3p2 djed ▸ w1p2 ▸ w1p3 ▸ …
```

What each line means:

- **every input is bound.** Every input of every lock placed on a floor the web names has one binding, and
  every binding names an input of the lock on that floor. Either failure names the line.
- **solvable.** Some order of visits finishes every journey.
- **every gate opens.** Some order holds every web key and stands behind every web door. A door that never
  opens is loot nobody collects, the web's `deadRegions`.
- **no softlock.** Every state the walk reaches can still finish every journey and open every door. Web keys
  only arrive, so this follows from solvable on the "every state" reading above; the walk still checks it.
  It is where a floor that can be played into waiting on a key, whose activator waits behind that same
  pyramid, is refused, naming the floor and the key.
- **seen before pulled.** For each web door there is an order in which the player sees its face (in reach
  and shut) before its activator is taken. A face of a section gate is the section's mouth; a face of an
  input is a door of the lock naming it, so the lock-level check above is this one, with only the keys the web
  actually holds by then allowed to arrive. A lever whose door cannot be seen first is a warning naming the place
  (`⚠ w3p1.f1.scales.C: its door is reached only once star is pulled`), as on a lock that is not a lesson. A
  lever pulled before its sand is reached is not lost: the travel screen lights the buried pyramid once a
  visit has been made and the key is held.
- **no activator in its own sand.** An activator that is reachable only with its own key, directly or through
  the sections, floors and lock regions it lies behind, is refused by name. A longer cycle (X behind Y's sand,
  Y behind X's) is refused as not solvable, naming the chain.
- **assumed held.** Keys outside the web that stand on the way to a web door (a tomb's ward key on a wing's
  stairs) are taken as held, the third bracket of `../authored-locks-roadmap.md`. They are listed so the
  designer sees them. An activator may never stand behind one (the bake refuses it), so the cost and the
  proof never lean on them.
- **cheapest.** The fewest visits to finish every journey, and the fewest to clear everything, with one
  cheapest route. A failed check prints `✗` and the chain it found, as `yarn lock` does.

## Why the walk is exact

The floor's soundness gate is **one walk in which every web key on the floor is a one-way mechanism**,
`missing → held`, arriving from any state, plus today's checks (solvable, no strand, no region lost, no dead
region). It does not argue that the states with keys missing are covered by some other walk: it walks them.
Every order of arrival, at every point of play, is a path in it.

**Checked case by case:**

| Case                                        | Exact?  | Why                                                                                                                                                                                   |
| ------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toggles on the same door (`-[A+S]-`)        | yes     | the door folds the input's state with the toggle's, both in the config                                                                                                                |
| `\|` and `+` combinations                   | yes     | `openGates` folds every owner by the gate's mode, an input like any other                                                                                                             |
| `-[A:off]-`                                 | refused | it opens while the input is missing and shuts on arrival, which makes a lever pulled elsewhere a loss. Rule 1                                                                         |
| A region barrier naming an input            | yes     | while the input is missing the region is covered and a torch in it is doused (`dousedConfig` after every move); after the arrival it can be lit again. Both states are walked         |
| A stone left in a region that later clears  | yes     | the stone's place is in the config; the arrival changes only the input                                                                                                                |
| Drops                                       | yes     | a drop is a move like any other. A pocket whose way out waits on a missing input leaves by an arrival; the web's "every state" reading refuses one whose key lies behind this pyramid |
| The procession reset                        | yes     | a reset is a transition at the door; what play keeps beside it (`sequenceReads`) only grows and is outside the walk                                                                   |
| Mechanism state kept between visits         | yes     | the saved config is a walk state; web keys are not in it (`mechanismStates` holds positions only), and the arrival move is what happens to the floor while the player is away         |
| Keys arriving between visits, or during one | yes     | an arrival is offered from every state, so both are paths of the walk                                                                                                                 |
| Coming back at the entrance                 | **no**  | see below; the re-entry rule fixes it                                                                                                                                                 |

**Arrivals and the checks.** An arrival counts as a way out of a state for "no strand" and "no region lost": a
player waiting on a lever is not stuck, since leaving keeps the floor. That is only true if the lever can be
pulled without finishing this pyramid, which the web walk proves. A state stranded with every input held
stays a strand.

**The cost.** n inputs multiply the floor's states by 2ⁿ. Rule 4 holds a lock to three; a floor with section
gates as well counts those too, and `MAX_LOCK_STATES` reports `tooLarge` past its ceiling as today.

**Coming back at the entrance.** The walk has one way of leaving and coming back: from the way out to the way
in, because "re-entering a site puts the player back where they stood" (`movesFrom`, `src/game/lockWalk.ts`).
That holds while the player comes back to the same journey's same pyramid. A pyramid picked on the travel map
is entered through `visitLevel` (`src/app/state/useJourneys.ts`), which sets the journey's `levelNr` to it and
forgets the position: the player stands at the entrance, every mechanism as they left it. So the floor can be
re-entered at `in` from any state, a move the walk does not have, and `(in, config)` may be a state it never
reached. This is true of every floor today; the web makes it the normal way to collect what sand freed, and
it also brings the player back to the pyramid they were in at its entrance.

**The rule that fixes it: re-entry adds states, never escapes.** On a floor of a web journey the walk adds,
from every reachable state, the state at `in` with the same config (a stone in hand stays in hand, as the save
keeps it). The new states must pass every check like any other. The backward sweep for strands and lost
regions does not use the re-entry edges, so a chamber a mechanism sealed is still a strand: re-entry is a way
to start again, not a way out of a trap. Arrivals and re-entry are independent moves, so a key that arrives
while the player is away and a return at the entrance are both walked, in either order. Whether the rule
belongs on every floor, or the save should keep a position per pyramid instead, is open question 7.

**Sand cannot trap a floor lock.** Web keys only arrive, the player can always leave a pyramid with the floor's
state kept, the walk proves every state finishes once the keys it waits on arrive, and the web walk proves each
key is obtainable without finishing the pyramid that waits on it.

## Seen before its control, across the layers

- **On the lock** (`yarn lock <file>`): `doorsSeenLate` in the one walk, input doors included, because an input
  starts missing and its door is shut at the start. Reaching the door with its owners unchanged means reaching
  it before its input arrives; other inputs may arrive on the way. No separate walk per input is needed.
- **On the web** (`yarn lock <web>`): the same question with only the keys the web holds before this lever
  allowed to arrive, which accounts for doors that wait on each other across pyramids. Reported on "every
  buried place is seen before its lever is pulled", naming `w3p1.f1.scales.C`.
- **A door with an input and a floor control** (`-[p1+C]-`) is one gate with two owners; `doorsSeenLate` asks
  for it to be reached before either is worked or arrives.

## Marks and the look of an input's door

An input's door is an `and` or `any` door like any other: it shows one marker per owner
(`../mods/mechanic-contract.md` §3, a gate shows its own condition), the floor owners' floor marks and the
input's web mark. Web marks are the activators' (below), from a glyph set disjoint from `MARK_GLYPHS`, so two
mechanics on one floor still never share a mark and `allocateMarks` (`src/game/mark.ts`) never sees a web key.

A door naming an input is drawn as the web's: web sand at a wizard_3 site, a web seal elsewhere, with its
markers on it. A section gate is drawn the same way. A region barrier naming an input is web sand over the
region, and conceals what was explored under it as every region barrier does.

**One sand per site.** On a pyramid carrying any web door, region barriers owned only by floor controls bind to
water, so sand on that site always means a lever elsewhere. The illustration's flood is water already.

## What the bake checks, to tie the web to the real floors

1. Every pyramid, floor, section and lock the web names exists in the world, and every named section carries
   its current address as its label.
2. Every journey line matches the journey's pyramid count, and the web's journeys are one free-order tier.
3. **Every input is bound and every binding names an input:** for every lock placed on a floor of the world,
   each `outside` line has one binding in the tier's web; each binding names a lock placed on that floor and an
   input it declares. A lock with inputs on a floor no web names is refused.
4. Every section gate is carved: a gate room at that section's mouth (or the main path's first seam) asking
   for `web:<id>`. Every input's gates are laid asking for `web:<activator>` beside their floor owners' keys,
   under the gate's mode. No other door asks for a web key.
5. Every activator is the end reward of the section it names, one per id, and opens at least one door.
6. The lock-side rules on every placed lock; one gate per section mouth.
7. Every floor carrying a web door walks sound with its web keys arriving, and with re-entry.
8. The world solver, run with web keys as positional keys and the order inside each journey, agrees with
   the web walk: every activator reachable, every door opened, every journey finished. No activator needs a
   key from outside the web (a ward key, a map piece), so the web walk's assumptions are exact.
9. `yarn lock <web>` passes on the baked world.

## Keys, state and save

**A web key is a named key.** Activator X mints `web:X`; a door waiting on it asks for `web:X`. Every reader
that checks `heldKeys.has(id)` then works unchanged, and a door with floor owners folds it in already:
`openDoorsFor` reads a door's `requiredKeyIds` as held keys beside its mechanism's say, under the door's mode.

- **The record: `webKeys: Record<id, true>` in the topology mod's own state**, beside the tomb-treasure mod's
  `tombKeys` (`useModState`). A held-keys provider (`registerHeldKeysProvider`,
  `src/app/SiteMap/keyProviders.ts`) turns it into `web:<id>`. It has an add and no remove.
- **Mechanism state does not change.** It stays per journey, per pyramid; a web key never enters it.
- **No change to the journey save.** The `levelNr` cursor stays. Free order between journeys is computed, not
  stored.
- **A web door opens on its own** once its key is held, if its floor owners agree: the lever did the work, so
  the sand is gone when the player arrives.
- A new field with an empty default needs no migration.

## What the floor compiler needs

Today a door key that no mechanism and no chest on the floor supplies is `sealed` in `floorLock`: an owner
with one state that opens nothing. A key under the `web:` stem becomes an owner `outside <key>` instead, with
states `missing` and `held`, opening its gates in `held`. Its one move is an arrival, which `LockSpec` carries
as a field of its own (`arrivals`, a mechanism and the move), because a transition is made standing in a region
and an arrival is not; `movesFrom` offers each arrival from every state. `floorLock` takes the keys allowed to
arrive (all of the floor's for the soundness walk, H for the web walk) and starts each in `missing`. A region
barrier carrying a web key covers its region through `barrierGates` as any region barrier does, so its torches
are doused by the walk unchanged. A floor whose only gates are web doors compiles too (today `floorLock`
returns nothing for a floor with no mechanism), so the web walk can ask it what is in reach.

`openDoorsFor` and `floorLock` must agree on a door naming several keys (`../mods/mechanic-contract.md` §9,
item 6); an input's door is such a door, so that agreement is tested here.

## Free order between journeys

`availablePyramidJourneyIds` (`src/app/pages/journeyAvailability.ts:31-46`) opens a journey only when the
one before it in its tier is completed. The change is to skip that check for a tier marked free-order:
authored data on the tier, set for wizard.

- **The solver already assumes free order between journeys.** `computeReachability` treats every journey in
  an unlocked tier as enterable (`src/worldGen/reachability.ts:300-311`).
- `nextPyramidJourneyId` (`journeyAvailability.ts:50-60`) offers the next journey in the list on the
  completion screen. In a free-order tier it offers any open journey, or none.
- The tier unlock does not change. Wizard opens on any of `master_a_1..4` (`src/data/treasurePerks.ts:25-30`),
  behind `LAST_RELEASED_DIFFICULTY` (`src/data/difficultyLevels.ts:11`).

## What the world solver needs

1. **Web keys are positional at both ends.** An activator is an `endReward` like a tomb key (`RewardSpec`,
   `src/worldGen/dsl.ts:41`), harvested through its currency's `bucketForReward`, never placed into free
   slots. A web door is a lock on one named key.
2. **A web door is a real lock to the solver.** `reachableFrom` (`src/game/siteValidator.ts`) already treats a
   door asking for a key it does not hold as a discovered lock. An input's door under `all` asks for its web
   key beside the mechanism's say, which the walk counts as given; under `any` the mechanism's say opens it
   alone, which is the optimistic reading the solver takes of every floor mechanism.
3. **Order inside a journey enters the solver.** Today progressing between `levelIndex` values is outside the
   solver (`reachability.ts:73-77`). The rule to add is true of every journey: pyramid N+1 is enterable when
   pyramid N's exit is reachable.
4. **The world check is the web's.** The web walk is the designer's check; the world solver's run is the proof
   on the carved floors, and the bake requires both to agree (check 8 above).

## The look

- **The sand lever**, a new realisation of the web's activator in wizard_3's direction. The floor lever is the
  `handle` family (`src/mods/topology/game/handle/meta.ts`), drawn from `leverBaseBack`, `leverArm` and
  `leverBaseFront`. The sand lever has its own art and a pulled pose that never swings back.
- **The web key and the sealed door**, for doors outside wizard_3: a key whose head wears its web mark, and a
  door sealed with the same mark.
- **Web sand**, a drift in a corridor wearing the web mark of what clears it, beside any floor markers its door
  carries.
- **Web marks:** a glyph set disjoint from `MARK_GLYPHS`, on a sand ground in a cartouche.

**Art tasks, for `docs/instructions/art-tasks.md` (default-tier art, the same at every difficulty):**

> **sandLever** — not the floor lever: a heavy stone post, a sun-disc or star-chart head instead of the plain
> handle, a channel of sand running from its base into the floor. Two poses: set (head up, channel full) and
> pulled (head down, channel empty). Same projection and footprint as `leverBase` + `leverArm`.
>
> **webSand** — sand drifted into a corridor to the ceiling, a cartouche half out of it. One pose; a cleared
> corridor is plain floor.
>
> **webSeal** — a doorway closed by a stone slab with a cartouche on it, and the key that opens it.
>
> Masters in `art/masters/props/default/`.

## The travel-screen read

Today `JourneyPathView` (`src/ui/atoms/JourneyPathView.tsx:196-275`) has three node states: completed,
current and future. `JourneyCard` has one emerald "still treasure to find here" dot
(`src/ui/organisms/JourneyCard.tsx:127-136`).

- **A buried node.** A pyramid whose exit lies behind a web door whose key is not held: drawn as sand-filled,
  not as the amber "current" pulse. It says _this is not open yet_, which is about the world, and must not look
  like a harder pyramid (`../mods/floor-topology-design.md`, steep and buried).
- **"Sand moved" pulse.** After a pull, the buried node gets the emerald ring. This rides `getUnexploredLevels`
  and the key sets a floor saves on arrival and on leaving. Two changes:
  - `blockingKeys` (`floorExploration.ts:37-42`) counts a web door's key, as it counts a ward gate's.
  - `JourneyPathView` draws the ring on the current node as well.
- **Before the first visit** nothing has been saved, so a pull shows no ring. The arrival beat makes sure the
  player has stood in the sand once.
- **The journey card** of a journey with a buried pyramid shows the web marks its main path waits for, lit as
  each is pulled.

## Toggle-off

With the topology mod off, every gate is an open corridor (section gates and lock gates alike, so an input's
door too), activators are bare nodes (the end reward is empty), and the carve is identical. wizard_3's first
pyramid is an ordinary pyramid. Free order between journeys is core progression and stays.

## Who does what

- **The designer** writes the wizard locks, with their `outside` lines, and the web: which sections are
  buried, which inputs each lever holds, which keys the sand keeps, where each activator stands. Also the art
  and the story beats.
- **Claude** builds the `outside` notation and its walks, the format, the web walker, `floorLock`'s held keys,
  the re-entry states, the doors and keys in the world, the solver edges, the travel read and the
  realisations, and places the web.
- Until the designer writes the web and the wizard locks, the slices run on made-up webs and made-up locks.
  Tests never pin the designer's; `yarn lock` is the check on them.

## Impact

### For the player

- When the wizard tier opens, all four wizard journeys open at once.
- wizard_3 starts with a pyramid they cannot finish yet. They see it buried and go elsewhere.
- Some pyramids in the other journeys end a path at a sand lever. Pulling it clears a named stretch of
  wizard_3, a whole floor, a side hall or a door inside a floor's lock; the travel screen pulses on the buried
  pyramid.
- A wizard lock may have sand in it: a door that waits on a lever in another journey, or a short cut that
  opens when one is pulled.
- Places freed in wizard_3 hold keys that open sealed places in the other journeys, so the tier is played back
  and forth. `yarn lock <web>` says how many revisits the web asks for.

### Systems and files touched

| System        | What changes                                                                                                                         | Files                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Progression   | a free-order flag per tier; skip the "previous completed" check; the "next journey" offer                                            | `src/app/pages/journeyAvailability.ts`, `src/data/difficultyLevels.ts` or `journeyStructure.ts`                                                                      |
| Lock notation | `X outside`; the refusals; inputs as one-way arrivals; `doorsSeenLate` on input doors; the inputs line                               | `src/game/lockNotation.ts`, `src/game/lockAuthoring.ts`, `src/game/lockWalkSpec.ts`, `src/game/lockChecks.ts`, `src/game/lockCompile.ts`                             |
| Web format    | the `.web` notation with bindings, its compiler, the walk over baked floors with arrivals limited to H, the report                   | new `src/game/webNotation.ts`, `src/game/webWalk.ts`, `scripts/lock.ts`                                                                                              |
| Floor walk    | `web:` keys as arriving owners; `LockSpec.arrivals`; floors with only web doors compile; re-entry states                             | `src/game/floorLock.ts`, `src/game/lockWalk.ts`, `src/game/floorLockWalk.ts`, `src/worldGen/validate.ts`                                                             |
| Keys / save   | `webKeys` in topology mod state; a held-keys provider giving `web:<id>`                                                              | `src/mods/topology/app/`, `src/app/SiteMap/keyProviders.ts`                                                                                                          |
| World-gen DSL | a `web-key` section gate; a main-path gate at the arrival; a `webKey` end reward; input gates laid with their web key; the web bound | `src/worldGen/dsl.ts`, `src/worldGen/rewards.ts`, `src/worldGen/buildSite.ts`, `src/game/carve/chainRooms.ts`, `src/game/layLocks.ts`, `src/worldGen/spec/wizard.ts` |
| World solver  | web keys as positional keys; the order inside a journey; agreement with the web walk                                                 | `src/worldGen/reachability.ts`, `src/worldGen/placeFragments.ts`, topology mod descriptor                                                                            |
| Map / travel  | buried node, pulse on the current node, card marks; `blockingKeys` counts web doors                                                  | `src/ui/atoms/JourneyPathView.tsx`, `src/ui/organisms/JourneyCard.tsx`, `src/app/pages/Travel.tsx`, `src/app/SiteMap/floorExploration.ts`                            |
| Site map art  | sand lever, web sand, web seal and key, web marks beside floor markers                                                               | `src/app/SiteMap/SiteMapView.tsx`, `src/game/mark.ts`, `src/assets/tiles/default/`, `art/masters/props/default/`                                                     |
| Story         | the buried-pyramid arrival is wizard_3's arrival; the clearing beat; wizard arrivals in any order                                    | `docs/game-design/story/`, `public/locales/*/story*.json`                                                                                                            |
| i18n          | buried node label, lever and seal prompts                                                                                            | `public/locales/en/`, `public/locales/nl/`                                                                                                                           |

### Baked data that moves

- **Every section gate re-carves its floor.** A gate's presence is structural; it costs its own room. A floor
  buried whole gains one gate room after its arrival.
- **An input costs nothing of its own.** Its gates are the lock's gates, carved with the lock. Binding it
  changes which key the door asks for, not its walls.
- **Every pyramid holding an activator changes one end reward.** That does not re-carve. The reward it
  replaces (often a fragment slot) is placed again by the worklist and may land in another wizard room.
- **Sections the web names get labels** equal to their current address. That moves nothing.
- **Sections the web buries that carry a ward gate today** lose it to another place in the journey, at the
  designer's say (open question 2).
- **No other tier moves.** Re-entry states change no carve; if they are turned on for every floor (open
  question 7), they may refuse floors that bake today, which is why that is measured first.

### Risks

- **Re-entry is a soundness change.** It touches the floor walk every lock relies on. Review it with Opus, with
  `floorLock`'s held keys and the order inside a journey.
- **The web walk needs a bake.** Lock regions take side sections where the carve puts them, so what a web
  key frees is known only on the carved floor. The designer iterates on a web through bakes; `yarn lock` on a
  single wizard lock stays fast.
- **Revisits can grow quietly.** A web where every key lies behind another journey's later pyramid can ask
  for many revisits and still be sound. The cheapest-visits line is the designer's measure; nothing refuses
  a high number.
- **A revisit costs a walk.** `visitLevel` moves the journey's cursor to the pyramid picked, so after a return
  to w3p1 the player finishes it again to come back to w3p2, at its entrance. The visit count does not show
  that walk.
- **Free order changes the story's ordering.** At wizard, arrivals come in any order, so Act V's beats must not
  lean on each other's order.
- **wizard_4 could be finished before wizard_3.** If the story needs wizard_3 first, the web says so with a
  gate (open question 3).

## Slices, in build order (for later)

Rough sizes: S is about a day, M two to three days, L a week.

1. **Free order between journeys (S).** The tier flag, the availability check, the next-journey offer. Tests
   freeze: in a free-order tier every journey opens with the tier key; in any other tier the
   previous-completed rule holds; the offer never names a closed journey.
2. **Outside inputs in the lock notation (M, Opus).** `X outside`, the refusals, inputs as one-way arrivals
   (`LockSpec.arrivals`), `doorsSeenLate` on input doors, the inputs line. Tests freeze, on made-up locks: a
   gate naming a declared input is shut before its arrival and open after; an arrival is offered from every
   state; `-[X:off]-` is refused as `outsideState`; a fourth input is refused as `outsideTooMany`; an input
   owning no gate is refused; an undeclared owner is still a draft; a lit torch in a region an input bars is
   out until the arrival and can be lit after it; a lock that strands only after a torch was doused under sand
   and the sand cleared is refused; a pocket left only by an arrival is not a strand; an input whose door is in
   reach only once it has arrived is warned about, and refused on a lesson.
3. **`floorLock` with arriving web keys (M, Opus).** `web:` keys as arriving owners, limited to a given set, a
   floor with only web doors compiling. Tests freeze, on made-up floors: a web door is shut before its key
   arrives and open after; a key outside the given set never arrives; a door with a web key and a lever under
   `all` opens only with both, under `any` with either; a region barrier carrying a web key douses a torch in
   its region; `openDoorsFor` and `floorLock` give the same open doors for every held set and lever position.
4. **Re-entry states (M, Opus).** The re-entry move on floors of web journeys. First a measurement: how many
   catalogue locks and baked floors fail with re-entry on, reported as a number and a list, with no conclusion
   it did not measure. Tests freeze: a made-up floor that strands only after coming back at the entrance is
   refused; a chamber a mechanism sealed is still a strand with re-entry on; a floor sound today and sound
   with re-entry reports the same.
5. **The web format and its walk (M).** Notation with bindings, compile, the walk over baked floors with
   arrivals limited to the held set, the report. Tests freeze, on made-up webs over a made-up world: pyramids in one journey open in order
   and journeys in any order; an unbound input and a binding naming no input are each refused by name; an
   activator behind its own sand is refused by name; a two-key cycle is refused naming the chain; a web with
   anything but activators, sections and bindings is refused; a floor that can be played into waiting on a
   key whose activator lies behind that pyramid is refused; the cheapest visits of a small web (three
   pyramids, one revisit) are counted exactly; a lever whose door cannot be seen first is warned about.
6. **Web doors and keys in the world (M).** The `web-key` section gate, the main-path gate after the arrival,
   input gates laid asking for `web:<activator>`, the `webKey` end reward, `webKeys` and its provider. Tests
   freeze: a door laid from `-[A]-` bound to `moon` asks for `web:moon`; a web door is shut without its key and
   open with it; the held set only grows; a key taken twice is held once; with the mod off every web door is
   an open corridor and the walls are identical.
7. **The solver (M, Opus).** Web keys as positional keys, the order inside a journey, the agreement with the
   web walk, activators behind outside keys refused. Tests freeze: pyramid N+1 is not reached while pyramid
   N's exit is shut; a world where the web walk and the solver disagree is reported; an activator behind a
   ward gate is refused.
8. **The look (M).** The sand lever, web sand, the seal and key, web marks beside floor markers, the
   one-sand-per-site binding rule. Tests freeze: a web mark never equals a floor mark; a door with an input and
   a lever shows two markers; the sand lever's drawing is not the floor lever's; a site with a web door that
   binds a lock's barriers to sand is refused.
9. **The travel read (M).** `blockingKeys` counts web doors, the buried node, the pulse on the current node, the
   card's marks. Tests freeze: a buried pyramid's node is not drawn as current; one pull after a visit lights
   it; before any visit it does not.
10. **Placement and bake (M).** The designer's web and wizard locks bound to the wizard tier, sections labelled,
    gates, bindings and activators placed, the bake, the gate in a clean worktree. Checks: `yarn lock <web>`,
    `yarn verify-content`, the world sweep. No unit test pins the web, the locks or the placement.

## Open questions for the designer

1. **A door seen only after its lever:** a warning, as on a lock, or refused?
2. **A section gate on a section that already has a ward gate:** move the ward content (the plan), or allow one
   door with both keys?
3. **Is wizard_4 allowed to finish before wizard_3?** If the story needs "weighed, then closed", the web puts a
   gate on wizard_4's last pyramid whose key lies in wizard_3.
4. **One arrival or two?** wizard_3's arrival (Fez and the scale) and the buried-pyramid arrival ("It is full")
   happen in the same place. Play both in order, merge them, or move the scale to the clearing?
5. **Does a pull show anything where it is pulled?** A Fez line, or the sand channel emptying and nothing said.
6. **Outputs as well as inputs:** may a lock declare where a web activator stands inside it (a lock's `$`
   region holding the web's key), so the web names it as it names an input? Today an activator stands at a
   section's end, and whether that section lies inside the lock is the carve's choice.
7. **Coming back at the entrance:** re-entry states fix a gap every floor has today, the web only makes it
   common. Turn them on for every floor once the measurement in slice 4 is in, keep them to web journeys, or
   change the save so a revisit resumes where the player stood in that pyramid?
