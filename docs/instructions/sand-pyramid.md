# The sand pyramid — plan

A plan for later. The designer asked for the design and its impact now. The slices at the end say what to
build when the work is picked up.

## The design

**wizard_3, the Chamber of Ma'at, opens buried.** Sand fills the journey from its first pyramid's arrival
onward. The player can walk in, see the sand and walk out. Because a journey's pyramids stay in order,
wizard_3's later pyramids wait behind the sand.

**The sand recedes a stretch per lever.** A heap of sand, a **pot**, lists its levers and where its front
stops after each pull. The first lever pulled, whichever it is, clears up to the first stop; the second, up
to the second. The front always recedes from the arrival, in any pull order. Levers stand in pyramids of any
wizard journey, wizard_3's own among them, and one lever counts for every pot that lists it. Clearing is
one-way: cleared sand never comes back.

**Keys open named places.** What the sand gave up opens sealed places elsewhere: a stretch of a main path, a
side hall, a door inside another floor's lock. The player goes back and forth between journeys. This is the
ward-gate shape the game already has (a gate here, its key from elsewhere), with both ends inside one tier.

**The sand lies inside the floor locks too.** A wizard floor lock can cover almost a whole floor. A front that
stops inside one gives the lock a door it did not write: an owner on a corridor between two regions, or a
buried region. Where the designer wants sand at an exact place inside a lock, the lock declares an **outside
input** and the web binds it.

**Any play order works, and a tool proves it.** The wizard journeys open together, so the player may pull the
levers in any order. A pot counts pulls, not names, and every door only opens, so what a player holds depends
on which levers they pulled, never on the order. The web walker proves the tier finishes from every set of
pulls a player can reach.

**The order between wizard journeys is free; inside a journey it stays.** Holding the wizard tier key opens
wizard_1 to wizard_4 at once. Inside a journey the `levelNr` cursor stays.

**The lever looks different from the floor lever.** A floor lever (`toggle`) swings both ways and works on
its own floor. A sand lever is pulled once, never goes back, and works on another site. The player should
see that before they touch it.

## One mechanism

Under the sand is one mechanism: **a door on a floor whose key is held from outside the floor**, a key under
the `web:` stem that only ever arrives. `floorLock` reads a whole floor as a lock (`src/game/floorLock.ts`),
side sections and lock ground alike, so to the floor walker every such door is the same thing: an outside
input of the floor.

The web writes three kinds of door, and the bake lays each where it stands:

| Written                         | Its key                                     | On ground no lock owns            | Inside a floor lock                                    |
| ------------------------------- | ------------------------------------------- | --------------------------------- | ------------------------------------------------------ |
| a pot's stop (`sand ... by`)    | `web:<pot>#<n>`: n of the pot's levers held | a gate on a main-path seam        | an owner added to a corridor, or a region buried whole |
| a named gate (`X opens ...`)    | `web:<X>`                                   | a main-path seam, a section mouth | as a pot's stop                                        |
| a bound input (`sand L.A by X`) | `web:<X>`                                   | —                                 | the lock's own gates naming `A`                        |

All three share one proof, one save and one held-keys provider. A floor without a lock does not need a
trivial lock to carry sand: a seam gate is the same door.

## The lock side: outside inputs

A lock declares an input with a line of its own, and names it on its gates like any owner:

```
A outside                       an outside input: held or not, never on this floor's controls
in -[A]- court                  open once A is held
court -[R|A]- east              the lever or the input
scale -[p1+A]- out              a stone on p1 and the input
hall -[A]                       a buried region: hall impassable until A is held
```

A front stopping inside a lock adds an input the lock did not write (below, "Where a stop lands"). The bake
adds it as `W outside` with the added owner, and the lock's checks walk it like a declared one.

**The rules, each refused by name when broken:**

1. **An input is named bare.** `-[A:off]-` would open while the input is missing and shut when it arrives,
   which makes arrival a loss. Refused: `outsideState`.
2. **An input owns at least one gate** (the existing "owns no gate" refusal).
3. **An input is not a draft.** An owner nothing declares stays a draft, refused as "not placed yet", as today;
   `outside` is the declaration that says the owner is meant to come from off the floor.
4. **A lock carries at most three inputs**, declared and added together. Each doubles the walk's states
   (below). Refused: `outsideTooMany`, naming the pots whose stops added them.

An input may own a region barrier, `hall -[A]`: the region is buried until the input arrives. While it lies, a
torch in the region is doused (`douseTorches`, `src/game/mechanismDoors.ts`), as under water; once the sand
clears the torch can be lit again. The walk below models that, so it needs no rule of its own.

**In the walk an input is a one-way mechanism**: states `missing` and `held`, starting `missing`, opening its
gates in `held`. Its one move, `missing → held`, is an **arrival**: a move the walk may make from every state,
wherever the player stands, never a choice made in a region. That is exact. A key arrives while the player is
elsewhere, and the player comes back to the state they left: the save keeps where the player stood in each
pyramid, so a pyramid re-entered from the travel map comes back there (below). An arrival mid-visit, from an
activator on another floor of the same pyramid, is a state the player left too.

So the walk has every order of arrival in it, and every check runs over all of it: a torch doused under sand and
then the sand cleared is a state like any other, and from it the way out must still be reachable and no region
lost. The walk counts an arrival as a way out of a state: a pocket whose way out waits on a missing input is not
a strand on the floor. Whether that input can be fetched without finishing this pyramid is the web's question
(below).

**The cost.** A lock's states are its regions times the product of its mechanisms' states, so n inputs
multiply them by 2ⁿ: three inputs, eight times. `MAX_LOCK_STATES` (50,000, `src/game/lockWalk.ts`) still
caps the walk and reports `tooLarge`; rule 4 keeps a wizard lock well inside it. A seam gate on the same
floor is an input of the floor's compiled lock too, and counts against the floor walk's ceiling, not the
lock's rule.

A lock with declared inputs is placed only where a web binds every one of them, which today is the wizard tier.

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
door is in reach only once the input has arrived is warned about (`⚠ C: its door is reached only once C is
held`), refused on a lesson. The order between levers across pyramids is the web's question, answered on the
baked floors (below).

## The web side

The tier's web is one file, `src/game/locks/wizard/chamberOfMaat.web`, in the spirit of a `.lock`: one line
per fact, `//` comments, the file opening with `// designed by: name`. The designer owns it, as they own
master and wizard locks. Claude builds the format, the walker and the placement.

### Blocks and places

A web is a list of **blocks**. A block's heading names a place in the world, and every address inside it is
relative to that place.

- **`[wNpM]`, a pyramid block:** journey `wizard_N`, pyramid M (the `levelNr`, counted from 1).
- **`[wN]`, a journey block:** journey `wizard_N`, all its pyramids. Addresses inside start with `pM`.

A web writes no journey order. The tool reads each journey's pyramids from the world: the order between
journeys is free, and inside a journey the `levelNr` cursor stays. A block naming a journey or a pyramid the
world does not have is refused, naming the line.

**The line.** A pyramid's main path, all its floors in order, is one line from 0% (the arrival) to 100% (the
last room of the main path), measured in **main-path rooms**. A journey's line is its pyramids' lines one
after another, in `levelNr` order, so 50% of a journey is halfway by rooms, not by pyramids. Ward wings and
side sections hang off the line; they are not on it.

**Places in a block:**

| Written           | Means                                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| `@end`            | the last room of the main path: the top floor's `mainEndReward`                                                      |
| `@45%`            | the main-path room nearest 45% of the line: its reward slot (a floor's `rewards[i]`)                                 |
| `@60% side`       | the end of the first side section hanging off the main path after 60%: its `endReward`                               |
| `@weighing.vault` | inside region `vault` of lock `weighing` on this pyramid: the region's reward. The region must take one (`$` or `?`) |
| `70%`             | the main-path seam nearest 70%: a door there (with `opens`)                                                          |
| `side @80%`       | the mouth of the first side section after 80% (with `opens`)                                                         |
| `f1.s4`           | side section `s4` of floor 1 and all that hangs off it; `f1.s4.0` its first sub-path                                 |
| `weighing.A`      | input `A` of lock `weighing` on this pyramid                                                                         |

A section address is the save's own (`${levelNr}:${sectionAddress}`, cells keyed `${floor}/${slot}`,
`src/app/SiteMap/cellIdentity.ts`). A lock goes by its bare file name, unique across tiers; a pyramid carrying
the same lock on two floors names it `f1.weighing`.

### Lines

```
lever reed @60% side             a sand lever, standing there
key ankh @55% side               a web key, standing there
sand by sun moon star            a pot over this block's line: equal stops, 33% 67% 100%
sand 40% 75% 100% by sun moon star    the Nth pull, whichever, clears to the Nth stop
sand from 50%: 75% 100% by reed ankh  the sand starts at 50%: the line before it is playable
sand f1.s4 by sun                a pot over one side section's own line (fine control)
sand weighing.A by moon          a lock's declared input, held once moon is pulled (fine control)
ankh opens 70%                   a door on the main-path seam nearest 70%, shut until ankh
ankh opens side @80%             a door at the mouth of the first side section after 80%
```

- **`lever` and `key` are both web activators.** The word is only the look: a lever is drawn as a sand lever,
  a key as a web key. Each name is declared once, in the block where it stands, and is unique in the web. Any
  activator may count in a pot and open named places, crosswise between journeys.
- **A pot** covers its block's line, or one side section's line (`sand f1.s4 ...`). It lists as many stops as
  levers, rising, the last 100%; `sand by` spaces them equally. Before any pull its sand lies from the arrival
  of its line onward, its first door on the first seam after the arrival; `from X%:` starts it at the seam
  nearest X% instead, and the line before it is playable. Every stop lies past the start (a stop at or before it
  is refused: `stopNotAfterFrom`); `sand from 50%: by a b` spaces them equally from the start. One pot per line: a pyramid under its journey's pot takes no pot of its own (refused:
  `potsOverlap`); a section pot inside a buried main path is another line and allowed.
- **Side sections hanging off buried main path are buried too.** They are behind the door the front stands
  at, so they need no door of their own.
- **A bound input** names one activator. The lock does the combining (`-[A+B]-`, `-[A|B]-`): a floor door folds
  all its owners under one mode (`openDoorsFor`, `src/game/mechanismDoors.ts`), so a binding with a mode of its
  own could not be laid on it.
- **`opens`** names one activator and one place. Where a place needs two keys, a lock does it with inputs.
- **The look follows the line**: a `sand` line's doors are web sand; an `opens` line's doors are a web seal.

Only activators. A web has no toggle, no torch, no sequence: everything in it only opens.

### Where a stop lands

A stop is a point on its line. It resolves to a main-path room by counting rooms, and lands on the **nearest
main-path seam** (the corridor between two consecutive main-path rooms of one floor; a stop nearest a stair
lands on the nearer seam either side of it). Ties go toward the arrival, burying more. What the seam is decides
the door, read off the seam's **last step**, the one into its second room, so every side section hanging on the
seam hangs before the door:

- **On ground no lock owns**, a gate on that seam asking for `web:<pot>#<n>`, on the corridor cell right before
  the second room. A last step that enters a lock from outside it takes no door: refused `stopOffGround`.
- **A seam between two regions of a floor lock**, a corridor of the lock: the bake adds an outside owner to
  every corridor between those two regions and walks the lock again with it as a one-way arrival (the exact model
  above). A plain
  corridor becomes `-[W]-`; a gated one gains the owner under `+` (`-[K+T]-` becomes `-[K+T+W]-`). A corridor
  gated with `|` cannot carry it, since its other owner would open the sand: refused `frontOnAnyGate`, naming
  the stop.
- **A seam inside one region** of a floor lock: the front falls inside the region, which is buried whole, a
  region barrier `region -[W]`. A torch in it is doused until the sand clears and can be lit again, which the
  walk already allows.

Everything past a front must stay behind it. A place past the front that the walk reaches without the front's
key, round a lock's side corridor or through a side section looping back, is refused: `frontLeaks`, naming the
place and the way round.

**Stability.** The line counts authored rooms (each floor's `pathPuzzles` and its end room), so a percentage
resolves to the same seam however a floor carves. What that seam is (plain ground, a lock corridor, the inside
of a region) and which side section hangs first after a percentage are the carve's; placement reads them off
the baked floor and pins them by authored name: a section by its address, a lock corridor or region by the
lock's own region names. A section is not given a label for it: a label may not imitate a positional address
(`src/game/carve/sections.ts`), so "a label equal to its current address" is refused by the carve. Instead the
bake places the web on the floors at their last pins, then reads it again on the floors the search pinned, and
refuses the bake, naming each line, when anything landed elsewhere; the report says where each landed. A web
floor the search re-stamps is built again on its new pin before that check (`bakeOnSettledPins`), so the pins the
bake writes are the ones the web was placed on, and the next bake starts from them.

### The worked example

**An illustration, not a design.** The designer writes the web and the wizard locks; the names below are
placeholders. `weighing` (w2p2), `scales` (w3p1) and `pillars` (w1p3) stand for wizard locks on those floors.

```
// designed by: Matthijs   (an illustration; the real web is the designer's)
// wizard. The Chamber of Ma'at lies buried. Levers in the other journeys clear it a stretch at a time, and
// what the sand gave up opens places there.

[w3]                              // journey block: one pot, the front runs w3p1 → w3p6
sand by sun moon star lotus ibis djed

[w3p1]
lever reed @60% side              // in w3, clears sand in wizard_1
key ankh @55% side                // what the sand gave up
sand scales.B by ibis             // fine control: the east drift inside scales, a short cut, never a need

[w3p2]
lever djed @30% side              // in its own pot: clear once two other levers are pulled

[w1p3]
sand 50% 100% by reed ankh        // pyramid pot: the first pull clears to 50%, the second to the end
lever sun @end
ankh opens side @80%              // the side passage after 80% stays sealed until ankh

[w2p2]
lever moon @45%
lever lotus @weighing.vault       // inside this floor's lock: region vault of lock weighing

[w2p4]
lever ibis @end

[w4p3]
lever star @end
djed opens 70%                    // the main path from 70% on: shut until djed
```

How it plays: wizard_3 is buried from its arrival. `moon`, `lotus` and `ibis` lie open in wizard_2; any three
pulls take the w3 front to 50%, clearing w3p1, w3p2 and most of w3p3. w3p1 gives up `reed` and `ankh`, which
clear w1p3 and open its side passage; w1p3's end gives `sun`. w3p2 gives `djed`, which opens w4p3's second
half and so `star`. Six pulls, in whatever order the player came by them, clear wizard_3 to its end.

### Refusals

`yarn lock <web>` refuses, naming the line:

- **A place not in the world**: a journey, pyramid, floor, section, lock, region or input the world does not
  have, a region that takes no reward, a percentage with no side section after it.
- **A lever under its own pot's front.** A lever counting in a pot may stand in that pot's sand where the pot's
  other levers clear it; one that only its own pull could clear is refused (`ownFront`).
- **A cross deadlock**, reported with the whole chain. Had `[w3p1]` also bound `sand scales.C by star` (the scale's
  counterweight, on the way out):

  ```
  ✗ deadlock
    star (w4p3 @end) waits on djed opens w4p3 70%
    djed (w3p2 @30% side) waits on w3p1 finished, the journey's order
    w3p1 finished waits on sand scales.C by star
  ```

- **Two stops on one seam** (`stopsShareSeam`), `frontOnAnyGate`, `frontLeaks`, `potsOverlap`,
  `outsideTooMany`, and an unbound input or a binding naming no input.
- **More marks than web glyphs** (`webMarksRunOut`): a web whose pots and named keys wear more marks than
  `WEB_MARK_GLYPHS` holds (eight), since two of them would look alike.
- **One sand kind per site.** On a pyramid where web sand lies, a floor lock's region barriers owned only by
  floor controls bind to water; a lock that binds them to sand there is refused.

### What `yarn lock <web>` reports

A web is checked against one baked world: the tool reads the carved floors of every pyramid it names and
lays its doors on them as the bake would (a gate on a seam, an owner on a lock corridor, a region barrier),
without re-carving. So the designer iterates on percentages and levers against the last bake, and a bake
makes the doors real.

```
## chamberOfMaat.web   (the shape of the report; the numbers are illustrative)

✓ compiles
✓ every place is in the world: journeys read as 4, 5, 6, 6 pyramids
✓ every input is bound, and every binding names an input
✓ no lever under its own front
✓ no deadlock
✓ every pull order finishes: 8 activators, 97 reachable pull sets, each closes on all 8
✓ every buried place is seen before its lever is pulled
assumed held on the way: the ward key on w4p4's wing stairs

pot w3   w3p1 → w3p6, 138 rooms   by sun moon star lotus ibis djed
  after 1 → w3p1 77%       17%  w3p1 f1 scales hall–scale   lock corridor, owner added; 4 of 6 actions in reach
  after 2 → w3p2 80%       33%  w3p2 f1 seam 9|10
  after 3 → w3p3 86%       50%  w3p3 f2 seam 3|4
  after 4 → w3p4 91%       67%  w3p4 f1 seam 12|13
  after 5 → w3p6 0%        83%  w3p6 f0 seam 0|1, the first after the arrival
  after 6 → w3p6 open
pot w1p3   26 rooms   by reed ankh
  after 1 → w1p3 46%       50%  w1p3 f1 pillars nave        region buried whole; 2 of 9 actions in reach
  after 2 → w1p3 open
named
  ankh opens w1p3 side @80%  → f2.s5's mouth
  djed opens w4p3 70%        → f1 seam 6|7
  sand scales.B by ibis      → w3p1 f1 scales court–east
activators
  reed   w3p1 @60% side      → f1.s4's end, w3 after 1 pull
  ankh   w3p1 @55% side      → f1.s3's end, w3 after 1 pull
  djed   w3p2 @30% side      → f0.s1's end, w3 after 2 pulls
  lotus  w2p2 @weighing.vault
  …

cheapest: 21 visits, no return
  w2p1 ▸ w2p2 moon lotus ▸ w2p3 ▸ w2p4 ibis ▸ w3p1 reed ankh ▸ w3p2 djed ▸ w1p1 ▸ w1p2 ▸ w1p3 sun ▸ w4p1 ▸ …
cheapest seeing every sand first: 24 visits, 3 returns (w3p1, w1p3, w4p3)
```

What each line means:

- **after n.** Per pot, how far n pulls clear, whichever levers they were, and the stop they reach: the seam
  it landed on, or the lock corridor or region with the lock's cheapest action count and how many of those
  actions are in reach while that sand still lies.
- **every pull order finishes.** See "Why any pull order works". The walker checks pull _sets_, not orders:
  two orders reaching the same set hold the same keys. It walks every set a player can reach (adding one
  activator in reach at a time) and checks each still closes on every activator and every journey finished.
  The cost is at most 2ⁿ sets for n activators, each a memo lookup per pyramid; a floor walk runs once per
  pyramid and per distinct held set of the keys that pyramid's doors ask for, which a pot's count levels and a
  few named keys keep small. A web of more than 16 activators is refused as `webTooLarge`.
- **seen before pulled.** For each web door there is a route in which the player sees it shut before its key
  is held. A face of a pot's stop is its seam; a face of an input is a door of the lock naming it. A door that
  cannot be seen first is a warning naming the place, as on a lock that is not a lesson.
- **assumed held.** Keys outside the web that stand on the way to a web door (a tomb's ward key on a wing's
  stairs) are taken as held, the third bracket of `../authored-locks-roadmap.md`, and listed. An activator may
  never stand behind one (the bake refuses it), so the proof never leans on them.
- **cheapest.** A visit is one entry into one pyramid from the travel screen; a return is a visit to a pyramid
  already visited. The fewest visits to finish every journey, then the fewest that also stand at every web
  door while it is shut, each with a route. A Dijkstra over (pull set, each journey's cursor), dominated states
  pruned, capped like `MAX_LOCK_STATES`.

**What a visit can do under held keys H** comes from the floor walks of that pyramid with arrivals limited to
H. It **finishes** if from every state the floor walks reach under H the exit is still reachable under H, or
the keys it waits on can be had without finishing this pyramid (below); it **takes an activator** if the
activator's cell is reachable likewise.

## Why any pull order works

1. **Held keys are a function of the pulled set.** A named key is held once its activator is taken; a pot's
   n-th key once any n of its levers are. The set only grows. So the order of pulls never matters, only which.
2. **What can be taken only grows with the set.** Every web door only opens, so a larger set reaches no less.
   Every order therefore climbs to the same fixpoint, the closure from no pulls; the web is sound when that
   closure holds every activator and finishes every journey. Walking every reachable set confirms it, and
   catches a floor that can be played into waiting (below).
3. **A floor can be played into a state that waits on a key.** The floor walk counts an arrival as a way out,
   so the web proves the key arrives without this pyramid: for each pyramid and each web key some reachable
   floor state waits on, the closure with that pyramid's exit cut must hold that key. Refused otherwise, naming
   the floor and the key.

## Why the floor walk is exact

The floor's soundness gate is **one walk in which every web key on the floor is a one-way mechanism**,
`missing → held`, arriving from any state, plus today's checks (solvable, no strand, no region lost, no dead
region). A pot's stops are keys like any other: the n-th never arrives before the (n-1)-th, a restriction the
walk need not use, since it walks every order of arrival. Every order of arrival, at every point of play, is
a path in it.

**Checked case by case:**

| Case                                        | Exact?  | Why                                                                                                                                                                           |
| ------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toggles on the same door (`-[A+S]-`)        | yes     | the door folds the input's state with the toggle's, both in the config                                                                                                        |
| `\|` and `+` combinations                   | yes     | `openGates` folds every owner by the gate's mode, an input like any other                                                                                                     |
| `-[A:off]-`                                 | refused | it opens while the input is missing and shuts on arrival, which makes a lever pulled elsewhere a loss. Rule 1                                                                 |
| A region barrier naming an input            | yes     | while the input is missing the region is covered and a torch in it is doused (`dousedConfig` after every move); after the arrival it can be lit again. Both states are walked |
| A stone left in a region that later clears  | yes     | the stone's place is in the config; the arrival changes only the input                                                                                                        |
| Drops                                       | yes     | a drop is a move like any other. A pocket whose way out waits on a missing input leaves by an arrival; the web's check 3 refuses one whose key lies behind this pyramid       |
| The procession reset                        | yes     | a reset is a transition at the door; what play keeps beside it (`sequenceReads`) only grows and is outside the walk                                                           |
| Mechanism state kept between visits         | yes     | the saved config is a walk state; web keys are not in it (`mechanismStates` holds positions only), and the arrival move is what happens to the floor while the player is away |
| Keys arriving between visits, or during one | yes     | an arrival is offered from every state, so both are paths of the walk                                                                                                         |
| Coming back from the travel map             | yes     | the save keeps where the player stood in each pyramid (`pyramidPositions`); leaving by the way out comes back at `in`, the walk's own move; see below                         |

**Arrivals and the checks.** An arrival counts as a way out of a state for "no strand" and "no region lost": a
player waiting on a lever is not stuck, since leaving keeps the floor. That is only true if the lever can be
pulled without finishing this pyramid, which the web walk proves. A state stranded with every input held
stays a strand.

**The cost.** n web keys on a floor multiply its states by 2ⁿ. Rule 4 holds a lock to three; a floor with
seam gates as well counts those too, and `MAX_LOCK_STATES` reports `tooLarge` past its ceiling as today.

**Coming back where the player stood.** The walk has one way of leaving and coming back: from the way out to
the way in, because "re-entering a site puts the player back where they stood" (`movesFrom`,
`src/game/lockWalk.ts`). A pyramid picked on the travel map is entered through `visitLevel`
(`src/app/state/useJourneys.ts`). The player who backed out of a pyramid to the map has their place written
down for that pyramid (`pyramidPositions`, keyed by `levelNr`), and a return puts them back on it, every
mechanism as they left it: `(place, config)` is the state they left, a state the walk already has. So a key
freed elsewhere is collected by walking on from where the player stood, and the floor walk needs no move of
its own for it.

What still starts at the entrance:

- **Leaving by the way out.** The interior closes (`setInteriorLevel(…, null)`), the pyramid's place is
  forgotten, and a return starts at `in` with the config as left. That is the walk's own move from `out` to `in`.
- **A first visit**, and an older save that remembers no place: the entrance, with the initial config or the
  one the save holds for a pyramid it never backed out of.
- **A place the carve no longer has.** A re-carve or a re-laid pyramid (`RELAID_PYRAMIDS`, which also forgets the
  remembered places there) falls back to the floor's entrance with the config as left: a state the walk may
  not have. Both are release decisions, not play.

**Re-entry, kept as an option.** The walk can still add, from every reachable state, the state at `in` with
the same config (`reentry`, `walkFloorLock`, `src/game/lockWalk.ts`): re-entry adds states, never escapes, and a
chamber a mechanism sealed is still a strand. The web no longer turns it on: `yarn lock <web>` and the bake
walk a web journey's floors with their web keys arriving only (`walkWebFloors`, `carvedVisit`). It stays for
the cases above: a release that re-carves or re-lays a web floor under players standing in it can walk that
floor with re-entry to see what a fallback to the entrance can reach.

## Seen before its control, across the layers

- **On the lock** (`yarn lock <file>`): `doorsSeenLate` in the one walk, input doors included, because an input
  starts missing and its door is shut at the start.
- **On the web** (`yarn lock <web>`): the same question with only the keys the web holds before this lever
  allowed to arrive, which accounts for doors that wait on each other across pyramids.
- **A door with an input and a floor control** (`-[p1+C]-`) is one gate with two owners; `doorsSeenLate` asks
  for it to be reached before either is worked or arrives.

## Marks and the look of a web door

A web door shows one marker per owner (`../mods/mechanic-contract.md` §3, a gate shows its own condition): the
floor owners' floor marks and its web mark. A pot's doors all wear the pot's mark with the count they wait for;
a named gate wears its activator's mark. Web marks come from a glyph set disjoint from `MARK_GLYPHS`, so two
mechanics on one floor still never share a mark and `allocateMarks` (`src/game/mark.ts`) never sees a web key.
The web hands its glyphs out itself, `allocateWebMarks`: every pot and named key it wears gets one of its own,
by name in sorted order, so two pots, or a pot and a key, never look alike, and the same web gets the same
marks on every bake. The bake writes them on the floors (`webMarks`) and on each activator (`glyph`).

A lever in several pots wears its first pot's mark, and that is enough: a lever never goes back, so the player
always pulls it, and the travel map's pulse, not the lever, says where it reached, as it does for a ward key.

A `sand` line's doors are drawn as web sand, an `opens` line's as a web seal. A region buried by a front or by
an input is web sand over the region, and conceals what was explored under it as every region barrier does.

## What the bake checks, to tie the web to the real floors

1. Every place the web names exists in the world; every pinned section carries its address as its label.
2. Every stop and every `opens` resolves to one seam, lock corridor, region or section mouth, laid as a door
   asking for its `web:` key; no other door asks for a web key. Every activator is the reward it names, one
   per reward, and counts in a pot or opens a door.
3. **Every input is bound and every binding names an input**, for every lock placed on a floor of the world.
   A lock with declared inputs on a floor no web binds is refused.
4. The lock-side rules on every placed lock, added owners included; no front leaks.
5. Every floor carrying a web door walks sound with its web keys arriving.
6. The world solver, run with the web's keys and the order inside each journey, agrees with the web walk:
   every activator reachable, every door opened, every journey finished. No activator needs a key from outside
   the web (a ward key, a map piece), so the web walk's assumptions are exact.
7. `yarn lock <web>` passes on the baked world.

## State and save

**The record is the pulled set: `webPulled: Record<name, true>` in the topology mod's own state**, beside the
tomb-treasure mod's `tombKeys` (`useModState`). It has an add and no remove. The front is never stored: a
held-keys provider (`registerHeldKeysProvider`, `src/app/SiteMap/keyProviders.ts`) derives `web:<name>` for
each taken activator and `web:<pot>#1..n` for each pot holding n of its levers, from the compiled web shipped
with the world data.

- **Mechanism state does not change.** It stays per journey, per pyramid; a web key never enters it.
- **The journey save keeps a place per pyramid** (`pyramidPositions`), so a return from the travel map resumes
  where the player stood. It is a field added with an empty default: an older save starts at the entrance as
  before. The `levelNr` cursor stays. Free order between journeys is computed, not stored.
- **A web door opens on its own** once its key is held, if its floor owners agree: the lever did the work, so
  the sand is gone when the player arrives.
- **Moving a stop or adding a lever re-derives the front** from the same pulled set, so a re-tuned web needs no
  migration. Renaming an activator does: the save keys it by name, and a rename ships with a double-write
  migration.
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

1. **Web keys are positional at both ends.** An activator is a reward at a named place, harvested through its
   currency's `bucketForReward`, never placed into free slots. A web door is a lock on one key.
2. **A pot's stop is a count.** `web:<pot>#n` is held once n of the pot's activators are reached: a threshold
   over a named set, the shape a tomb's `piecesRequired` already has, scoped to a pot's list.
3. **A web door is a real lock to the solver.** `reachableFrom` (`src/game/siteValidator.ts`) already treats a
   door asking for a key it does not hold as a discovered lock. An input's door under `all` asks for its web
   key beside the mechanism's say, which the walk counts as given.
4. **Order inside a journey enters the solver.** Pyramid N+1 is enterable when pyramid N's exit is reachable
   (`isOrderedJourney`, `src/worldGen/reachability.ts`). The rule is true of every journey, but the solver applies
   it only to a journey carrying a web door: there alone a key held from elsewhere can shut a way out, and a world
   without a web then bakes as it did. Whether applying it to every journey moves the baked world is not measured.
5. **The world check is the web's.** The web walk is the designer's check; the world solver's run is the proof
   on the carved floors, and the bake requires both to agree.

## The look

- **The sand lever**, the `lever` realisation of a web activator. The floor lever is the `handle` family
  (`src/mods/topology/game/handle/meta.ts`), drawn from `leverBaseBack`, `leverArm` and `leverBaseFront`. The
  sand lever has its own art and a pulled pose that never swings back.
- **The web key and the web seal**, the `key` realisation and the door of an `opens` line: a key whose head
  wears its web mark, and a door sealed with the same mark.
- **Web sand**, a drift in a corridor wearing the mark of its pot and the count it waits for, beside any floor
  markers its door carries.
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
- **The journey card** of a journey under sand reads "Still 60% buried" ("Nog voor 60% bedolven"): the share of the
  journey's main-path rooms, counted as the web line counts them, that still lies behind a sand front. Pots on the
  journey's pyramids, the journey pot and stops inside locks count; a `from` pot counts only from its start; `opens`
  seals are not sand. Whole percent, 1% rather than 0% while anything is buried; the line is hidden at 0% and on a
  journey without sand. It reads the authoring, so it shows before the first visit. A stop inside a lock has no seam
  in the authoring, so it counts from its floor's first room (`journeyBuriedPercent`,
  `src/mods/topology/game/web/buriedPercent.ts`).

## Toggle-off

With the topology mod off, every gate is an open corridor (seam gates, added owners and declared inputs
alike), activators are bare nodes (the reward is empty), and the carve is identical. wizard_3 is an ordinary
journey. Free order between journeys is core progression and stays.

## Who does what

- **The designer** writes the web and the wizard locks, with their `outside` lines.
- **Claude** builds the `outside` notation and its walks, the web format and walker, `floorLock`'s arriving
  keys, the re-entry states, the doors and keys in the world, the solver edges, the travel read and the
  realisations, and places the web.
- Until the designer writes the web and the wizard locks, the slices run on made-up webs and made-up locks.
  Tests never pin the designer's; `yarn lock` is the check on them.

**The designer's workload.** A web is one block per pyramid that holds something, one line per activator, one
`sand` line per buried stretch and one `opens` line per sealed place: the illustration is fifteen lines for the
tier. Nobody reads section numbers off `generatedWorld.ts`: places are percentages, `side`, `@end` and a lock's
own region names, and the report says where each landed. Iterating is editing a percentage and running
`yarn lock <web>` against the last bake; a bake makes the doors real. Fine control (a declared input, a section
pot) is there for the few places a percentage cannot say.

**The limits.** One activator per reward: per main-path room, per section end, per lock region taking a
reward, so a pyramid holds at most as many activators as it has those. Wizard pyramids are large (wizard_3
pyramid 1's hub floor has ten side sections today); a pot's stops need a seam each, so a pot over a short line
cannot take many levers (`stopsShareSeam`). A lock carries at most three inputs, added ones counted. A web
carries at most 16 activators.

## Impact

### For the player

- When the wizard tier opens, all four wizard journeys open at once.
- wizard_3 is buried from its first room. They see the sand and go elsewhere.
- Some pyramids end a path at a sand lever. Each pull clears wizard_3 a stretch further, whichever lever it was;
  the travel screen pulses on the buried pyramid and the journey card says how much is still buried.
- A wizard lock may have sand in it: a door the front stops at, a buried hall, or a short cut that opens when a
  far lever is pulled.
- Places freed in wizard_3 hold keys that open sealed places in the other journeys, so the tier is played back
  and forth. `yarn lock <web>` says how many returns the web asks for.

### Systems and files touched

| System        | What changes                                                                                                  | Files                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Progression   | a free-order flag per tier; skip the "previous completed" check; the "next journey" offer                     | `src/app/pages/journeyAvailability.ts`, `src/data/difficultyLevels.ts` or `journeyStructure.ts`                                                                      |
| Lock notation | `X outside`; the refusals; inputs as one-way arrivals; added owners; `doorsSeenLate` on input doors           | `src/game/lockNotation.ts`, `src/game/lockAuthoring.ts`, `src/game/lockWalkSpec.ts`, `src/game/lockChecks.ts`, `src/game/lockCompile.ts`                             |
| Web format    | blocks, the line, stops landing on seams, pots, `opens`, bindings; the set walk; the report                   | new `src/game/webNotation.ts`, `src/game/webLine.ts`, `src/game/webWalk.ts`, `scripts/lock.ts`                                                                       |
| Floor walk    | `web:` keys as arriving owners; `LockSpec.arrivals`; floors with only web doors compile; re-entry states      | `src/game/floorLock.ts`, `src/game/lockWalk.ts`, `src/game/floorLockWalk.ts`, `src/worldGen/validate.ts`                                                             |
| Keys / save   | `webPulled` in topology mod state; a held-keys provider deriving named and counted keys                       | `src/mods/topology/app/`, `src/app/SiteMap/keyProviders.ts`                                                                                                          |
| World-gen DSL | seam gates, added lock owners and region barriers, activators as rewards, sections pinned by label, web bound | `src/worldGen/dsl.ts`, `src/worldGen/rewards.ts`, `src/worldGen/buildSite.ts`, `src/game/carve/chainRooms.ts`, `src/game/layLocks.ts`, `src/worldGen/spec/wizard.ts` |
| World solver  | web keys as positional keys; counted stops; the order inside a journey; agreement with the web walk           | `src/worldGen/reachability.ts`, `src/worldGen/placeFragments.ts`, topology mod descriptor                                                                            |
| Map / travel  | buried node, pulse on the current node, the card's buried percentage; `blockingKeys` counts web doors                | `src/ui/atoms/JourneyPathView.tsx`, `src/ui/organisms/JourneyCard.tsx`, `src/app/pages/Travel.tsx`, `src/app/SiteMap/floorExploration.ts`                            |
| Site map art  | sand lever, web sand, web seal and key, web marks beside floor markers                                        | `src/app/SiteMap/SiteMapView.tsx`, `src/game/mark.ts`, `src/assets/tiles/default/`, `art/masters/props/default/`                                                     |
| Story         | the buried-journey arrival is wizard_3's arrival; the clearing beat; wizard arrivals in any order             | `docs/game-design/story/`, `public/locales/*/story*.json`                                                                                                            |
| i18n          | buried node label, lever and seal prompts                                                                     | `public/locales/en/`, `public/locales/nl/`                                                                                                                           |

### Baked data that moves

- **A web door re-carves nothing.** Every web door is laid on the finished carve (`src/game/webDoors.ts`): a seam
  or mouth door on one corridor cell, a lock gate an input shares with floor owners asking for the input's key
  too, a gate only inputs own on every crossing it bars. A lock compiles without its inputs, so its walls are
  those of the lock without them. The bake refuses a door the floor walks round (`webDoorLeaks`).
- **A declared input costs nothing of its own.** Its gates are the lock's, carved with the lock.
- **Every reward holding an activator changes.** That does not re-carve. The reward it replaces (often a
  fragment slot) is placed again by the worklist and may land in another wizard room.
- **Buried sections that carry a ward gate today** lose it to another place in the journey, at the designer's
  say (open question 2).
- **No other tier moves.** Re-entry stays off (open question 5), so no floor that bakes today is refused for it.

### Risks

- **A remembered place is a save field.** It must be forgotten wherever the floor under it changes: a re-laid
  pyramid forgets it with the place the save stands at (`useRelaidFloorsBackfill`).
- **A stop's landing is read off the carve.** Inside a lock, whether a percentage falls on a corridor or inside
  a region is the carve's; placement pins it by name, and the report shows it, so the designer sees a stop
  that landed somewhere other than they meant.
- **Returns can grow quietly.** A web where every key lies behind another journey's later pyramid can ask for
  many returns and still be sound. The cheapest line is the designer's measure; nothing refuses a high number.
- **A return costs a walk.** `visitLevel` moves the journey's cursor to the pyramid picked, so after a return
  to w3p1 the player finishes it again to come back to w3p2, at its entrance. The visit count does not show
  that walk.
- **Free order changes the story's ordering.** At wizard, arrivals come in any order, so Act V's beats must not
  lean on each other's order. Where the story needs one journey finished before another, the web says so: a
  key at the end of the first opens the last stretch of the second (`key maat @end` in `[w3p6]`,
  `maat opens 90%` in `[w4p6]`).

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
5. **The web format and the line (M).** Blocks, relative places, the line in authored rooms, stops landing on
   seams, the refusals that need no walk. Tests freeze, on a made-up world: a block naming a pyramid the world
   lacks is refused; `sand by a b c` stops at a third, two thirds and the end; a stop resolves to the nearest
   seam and ties toward the arrival; a stop on a lock corridor adds an owner under `+`, one inside a region
   buries the region, one on a `|` corridor is refused as `frontOnAnyGate`; two stops on one seam are refused;
   a pyramid pot under a journey pot is refused as `potsOverlap`; `@60% side` names the first side section
   hanging after 60%; a re-carve that keeps the pinned names resolves every place the same.
6. **The web walk and its report (M, Opus).** The set walk, the closure, the per-pyramid check with its exit
   cut, the report. Tests freeze, on made-up webs: two orders of the same pulls hold the same keys; the n-th
   pull clears to the n-th stop whichever lever it was; a lever only its own pull clears is refused as
   `ownFront`; a three-lever cycle across journeys is refused naming the whole chain; a front that leaks round
   a side corridor is refused as `frontLeaks`; a floor that can be played into waiting on a key whose
   activator lies behind that pyramid is refused; a web of 17 activators is refused as `webTooLarge`; the
   cheapest visits and returns of a small web (three pyramids, one return) are counted exactly; a lever whose
   door cannot be seen first is warned about.
7. **Web doors and keys in the world (M).** Seam gates, added owners and region barriers laid on the carve,
   activators as rewards, `webPulled` and its provider. Tests freeze: a stop asks for `web:<pot>#n`; a door
   laid from `-[A]-` bound to `moon` asks for `web:moon`; the provider gives `web:<pot>#2` for any two of the
   pot's levers pulled; the pulled set only grows and a lever pulled twice counts once; with the mod off every
   web door is an open corridor and the walls are identical.
8. **The solver (M, Opus).** Web keys as positional keys, counted stops, the order inside a journey, the
   agreement with the web walk, activators behind outside keys refused. Tests freeze: pyramid N+1 is not
   reached while pyramid N's exit is shut; a stop is reached with n of its pot's activators and not with n-1;
   a world where the web walk and the solver disagree is reported; an activator behind a ward gate is refused.
9. **The look (M).** The sand lever, web sand, the seal and key, web marks beside floor markers, the
   one-sand-per-site binding rule. Tests freeze: a web mark never equals a floor mark; a door with an input and
   a lever shows two markers; the sand lever's drawing is not the floor lever's; a site with web sand that
   binds a lock's barriers to sand is refused.
10. **The travel read (M).** `blockingKeys` counts web doors, the buried node, the pulse on the current node, the
    card's buried percentage. Tests freeze: a buried pyramid's node is not drawn as current; one pull after a visit
    lights it; before any visit it does not.
11. **Placement and bake (M).** The designer's web and wizard locks bound to the wizard tier, places pinned,
    doors and activators laid, the bake, the gate in a clean worktree. Checks: `yarn lock <web>`,
    `yarn verify-content`, the world sweep. No unit test pins the web, the locks or the placement.

## Open questions for the designer

1. **A door seen only after its lever:** a warning, as on a lock, or refused?
2. **A buried or sealed section that already has a ward gate:** move the ward content (the plan), or allow one
   door with both keys?
3. **One arrival or two?** wizard_3's arrival (Fez and the scale) and the buried-journey arrival ("It is full")
   happen in the same place. Play both in order, merge them, or move the scale to the clearing?
4. **Does a pull show anything where it is pulled?** A Fez line, or the sand channel emptying and nothing said.
5. **Coming back at the entrance:** re-entry states fix a gap every floor has today, the web only makes it
   common. Turn them on for every floor once the measurement in slice 4 is in, keep them to web journeys, or
   change the save so a return resumes where the player stood in that pyramid?

   **The measurement (2026-10-18).** Walked with re-entry on (a stone in hand stays in hand), 6 of the 36
   catalogue locks and 5 of the 35 baked floors with a lock that walk sound today are refused, each as a strand
   from the way in: the locks `expert/counterweight`, `expert/keyring`, `expert/lockChamber`, `expert/relay`,
   `junior/tide` and `master/weighingOfTheHeart`; the floors junior_4 pyramid 5, expert_1 pyramid 2, expert_2
   pyramid 2, expert_3 pyramid 4 and master_2 pyramid 5, each floor 0. The rest walk sound either way. Today the
   walk has re-entry behind a flag (`reentry`, `walkFloorLock`), off in the bake; `yarn lock <web>` turns it on for
   every floor of a web journey, a journey any web names (`walkWebFloors`).

   **Decided: the save keeps a place per pyramid.** A return from the travel map resumes where the player stood
   ("Why the floor walk is exact", "Coming back where the player stood"), so the web walks its floors without
   re-entry. The flag stays in the walker, off everywhere.
