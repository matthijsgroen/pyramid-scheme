# Corridors carry items, aligned: design

A lock is regions joined by corridors. The regions hold the mechanics; each corridor joins two regions and carries
an ordered list of items: gates, the narrow passage, a drop, the nest spot. The author writes those items in
sequence on one line, says with dashes how close each stands to its neighbours, and writes a second line on the same
two regions to get a second corridor beside the first. World generation adds puzzles to corridors; the author never
writes one.

Settled with the designer on 2026-10-09. This is a design, not a plan: it says what holds and what proves it, and
leaves the code to the implementer. The lock model is in `docs/mods/mechanic-contract.md` and
`docs/mods/floor-topology-design.md`; the tool side is `src/game/lockNotation.ts`, `src/game/lockAuthoring.ts` and
`src/game/lockCompile.ts`; the carve side is `src/game/lockPlan.ts`, `src/game/layLocks.ts` and
`src/game/laidFloor.ts`.

## The rules, in one place

- **Regions hold mechanics; corridors carry items.** A corridor joins two regions and carries an ordered list of
  items, read from its left region to its right one: gates (`-[A]-`, `-[A:b]-`, `-[A+B:off]-`), the narrow passage
  (`-[unladen]-`), a drop (`>>` one-way left to right, `<<` one-way right to left) and the nest spot (`-&>`).
- **One line, one corridor between each two regions on it.** `in -[Y]- >> leftLower` is one corridor carrying a gate
  then a drop. A chain, `a -[X]- b -[Y]- c`, is two corridors joined at `b`.
- **Two lines on one pair are two corridors.** `in -[Y]- leftLower` and `leftLower >> in` are parallel corridors
  between the same two regions.
- **Alignment is written with dashes** round a gate: fewer on the left aligns it left, fewer on the right aligns it
  right, two or more on each side, equal, centres it, and one on each side leaves it free.
- **Alignment is relative and a preference.** Aligned left, an item directly follows what is written to its left (a
  region or another item), with no puzzle between; aligned right, it directly precedes what is written to its
  right; centred, it has room for puzzles on both sides; free, the carve decides. Where the carve folds nothing into
  a corridor its items simply follow one another in order. Alignment never refuses a lock and never lengthens a
  corridor.
- **A drop makes its corridor one-way from where it stands.** The stretch on either side of it is walked both ways;
  the drop itself is crossed only in its own direction.
- **A corridor falls at most once.** Two drops on one corridor are refused; a region between them makes two
  corridors.
- **The nest spot is found by its region pair.** A spot on a pair with two corridors is refused (`nestSpotShared`),
  and a spot beside other items on its corridor is ignored, as before.
- **A lock that writes no alignment and no parallel corridor carves exactly as it does now.** The world bake is
  byte-identical except doubleBack's floor.

## 1. The notation

### Tokens

A connection line is regions and corridors in turn, starting and ending with a region:

```
line      := region ( corridor region )+
corridor  := "--"  |  item ( spaces item )*
item      := gate  |  ">>"  |  "<<"  |  "-&>"
gate      := dashes "[" condition "]" dashes
dashes    := "-"+
region    := \w+
```

- **Items on one corridor are separated by spaces.** Between a region and an item spaces are optional, as now
  (`in -[Y]- hall` and `in-[Y]-hall` read alike). Between two items they are required, because the dashes of two
  touching gates (`-[A]---[B]-`) cannot be shared out between them.
- **`--` is a corridor with nothing on it**, and stands alone: it never sits beside an item, and it is exactly two
  dashes.
- **A gate's dashes are the runs of `-` touching its brackets.** The run left of `[` and the run right of `]` are
  counted; nothing else is.
- **`>>`, `<<` and `-&>` carry no dashes of their own.** A dash touching `>>` or `<<` is part of a neighbouring
  gate's run or an error.
- **`<<` reads right to left.** `a << b` is a drop from `b` to `a`, and `a -[Y]- << b` is a corridor a player falls
  into from `b`, landing beside `Y`, which leads on to `a`. The drop's id names its direction of travel, `b>a`,
  as a `>>` drop's id does (`a>b`).
- **A chain stays a chain.** Every region name ends one corridor and starts the next, so `west >> east >> in` is two
  corridors, each carrying one drop.
- **A repeated pair is a second corridor**, whether it comes from a second line or from a chain that returns
  (`a -[X]- b -[Y]- a`).

### Alignment

| written     | left dashes | right dashes | reads  |
| ----------- | ----------- | ------------ | ------ |
| `-[A]-`     | 1           | 1            | free   |
| `--[A]--`   | 2           | 2            | centre |
| `---[A]---` | 3           | 3            | centre |
| `-[A]--`    | 1           | 2            | left   |
| `-[A]---`   | 1           | 3            | left   |
| `---[A]-`   | 3           | 1            | right  |
| `--[A]---`  | 2           | 3            | left   |

The rule: equal runs of one are free, equal runs of two or more are centre, and unequal runs align toward the
shorter side. Only a gate can be aligned (the narrow passage is a gate); a drop and the nest spot are always free,
and a neighbour's alignment says how close it stands to them.

Alignment is read in the written order, so it survives a corridor being laid from its other end: "left" always
means toward the region written first.

### Refusals

Each is refused where it is read, with `line n:` before the message, the way the notation refuses everything else.

| written                            | message                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| `a -[A]---[B]- b`                  | `items on a corridor stand apart: write -[A]- -[B]-`                            |
| `a [A] b`, `a -[A] b`              | `a gate stands between dashes: write -[A]-`                                     |
| `a -[A]- -- b`, `a --- b`          | `-- is a bare corridor, exactly two dashes, and carries no items`               |
| `a ->> b`, `a -<<- b`              | `cannot read "->>" on a corridor: an item is -[…]-, >>, << or -&>`              |
| `a >> -[A]- >> b`, `a >> << b`     | `a corridor falls once: put a region between two drops`                         |
| `a -&- b`, `a <&- b`               | `a nest spot is written a -&> b, from the nested lock's in to its out` (as now) |
| `a -[unladen]- >> b`               | `a drop already takes empty hands` (as now, `unladenOnDrop`)                    |
| a second `-&>`                     | `nestSpotsRepeated` (as now)                                                    |
| `-&>` on a pair with two corridors | `nestSpotShared` (as now)                                                       |

The narrow passage keeps its rule: `unladen` stands alone in its brackets (`unladenCombined`), and never on a
corridor that carries a drop, wherever on it the drop stands.

### LOCK_SYNTAX

The corridor lines of `LOCK_SYNTAX` read:

```
  in -- hall                    corridor, nothing on it; in and out are the way in and the way out
  in -[S1]- hall                gate: open while S1 is in its second state
  in -[S1:a]- hall              gate: open while S1 is in state a
  in -[A+B]- hall               every owner   ·   -[A|B]- any owner
  hall >> in   in << hall       a drop, one-way along the arrow, taken only with empty hands
  in -[Y]- >> hall              one corridor, its items in order from the left region, apart by spaces
  in -[A]--- hall   in ---[A]- hall   aligned left: right after what stands left of it; aligned right: right before
  in --[A]-- hall               centred: room for puzzles either side   ·   -[A]- free: the carve decides
  in -[Y]- hall   hall >> in    two lines on one pair: two corridors side by side
  in -[unladen]- hall           a narrow passage, only with empty hands; never on a corridor with a drop
  in -&> hall                   the nest spot: another lock may be spliced in here, its in at in, its out at hall;
                                one per lock, a plain corridor where nothing nests, ignored beside other items
```

The mechanic, plate, appetite and region-gate lines are unchanged.

## 2. The shared Lock

### A connection is a corridor

`LockConnection` keeps its two shapes. The object shape gains one optional field:

```ts
{ between: [RegionId, RegionId]; barriers?: BarrierId[]; align?: Record<BarrierId, "left" | "right" | "center"> }
```

- `barriers` is the corridor's ordered item list, from `between[0]` to `between[1]`, as it is now. Gates and drops
  share one id space and both are named here.
- `align` holds the aligned items only. A barrier it does not name is free, so a lock that aligns nothing writes no
  `align` and its JSON is unchanged.
- **Two connections on one pair are two corridors.** Their order in `connections` is their identity: the first
  written is the pair's corridor 0, the next corridor 1, and so on.

### A drop is an item of its corridor

A drop stays an id in `oneWays`, `{ from, to }` its direction of travel between its connection's two regions, and
is named in that connection's `barriers` where it stands. This is the shape the notation already writes for
`in -[Y]- >> hall`, and the one the walk already reads.

The alternative, a drop written inline in `barriers` as an object with no entry in `oneWays`, is rejected: every
JSON lock with a drop would change, and the single id space that `barrierIdRepeated` and `opensNotAGate` lean on
would split in two.

**JSON compatibility.** A `oneWays` entry that no connection names reads as a corridor of its own carrying only
that drop, which is exactly what it compiles to now. No JSON lock written so far changes meaning or shape.

### What compile refuses

- **Retired:** `connectionRepeated` (two connections on one pair are two corridors) and `oneWaySharesConnection` (a
  drop stands on a corridor beside gates).
- **New:**
  - `corridorFallsTwice { between, barriers }`: two drops on one connection.
  - `alignOffConnection { between, barrier }`: `align` names a barrier the connection does not carry.
  - `alignOnDrop { barrier }`: `align` names a drop; a drop is never aligned.
- **Moved:** `nestSpotShared` becomes a `NestSpotFault` beside `nestSpotOnNoConnection`, so a JSON lock whose
  spot's pair has two connections is refused as the notation refuses it.
- **Unchanged:** `barrierNamedTwice`, `barrierOffItsConnection` (a drop's `from`/`to` must be its connection's
  pair), `unladenOnDrop`, and the rest.

The fork-switch rule keeps its form: a fork's gate is the first item on a corridor leaving the fork's region. Its
alignment is read and never refused; the side toward the fork is always closed (section 5), so a centred fork gate
gets room on its far side only.
A fork's ways are layout corridors: a fork's gate on a falling corridor is refused `gateOwnedOffSeam`, because the
floor builds the switch from its seams alone and such a gate would never be given a key.

## 3. Compile: the floor vocabulary

A corridor compiles to one of three things, by what it carries:

| corridor carries               | compiles to                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------- |
| no drop                        | a layout connection, its gates edge-gate obstacles on it                     |
| exactly one drop, nothing else | a drop obstacle and no layout connection (as now)                            |
| a drop and other items         | a **falling corridor**: a drop obstacle, its gates, and no layout connection |

- **The corridor index.** A corridor's index is its place among the corridors of its pair that compile to a layout
  connection or a falling corridor, in written order. An edge-gate obstacle on corridor `k > 0` carries
  `at.corridor: k`, and so does its `barrierOrder` entry; on corridor 0 the field is absent. No placed lock repeats
  a pair, so every placed floor's compiled vocabulary is unchanged.
- **`barrierOrder`** is written for a corridor carrying more than one item (as now, a drop counting as an item), or
  any aligned item. It lists the drop where it stands and carries `align` when the corridor does. A falling
  corridor always has an entry, since it carries a drop and something else; that entry is how the floor knows the
  gates on it stand on it.
- **`topologyFaults` reads corridors, not pairs.**
  - A gate stands on a layout connection or on a falling corridor; `barrierOrder` may name the drop of its own
    corridor; `barrierOrderRepeated` is keyed by pair and index.
  - **An open way round a gate is per corridor.** A corridor is open when it is a layout connection carrying no
    edge gate and touching no barred region. An open corridor parallel to a gated one joins its two sides, and the
    gate is refused `gateBypassed`, the rule floors already follow. A falling corridor is never open: it is not
    walked both ways.
  - A fork's seams are its arm corridors. A parallel corridor its switch does not own is no seam of it, and leaves
    its region from a node other than the junction, as any non-arm corridor does.
- **The region route counts a pair once.** `regionRoute` and `offRouteChains` read a repeated pair as one join; a
  falling corridor joins its regions the way a drop does.

## 4. Plan and lay

### Parallel corridors

`planLockFloor` makes one `PlanCorridor` per layout connection, so a repeated pair makes two. Corridor 0 keeps the
id it has now (`from>to`); corridor `k` takes an id of its own, distinct from every other corridor and drop id.
Only corridor 0 of a pair on the region route is on the route; every other corridor of the pair is off it, a
corridor that closes a loop between two regions the lay has placed, which `layLockPlan` already lays (the
`walledIn` cut keeps a region a usable side for each corridor it still owes). A region's `stretchLength` counts
each parallel corridor as a way of its own, so the lay asks for the sides they need.

### Falling corridors

A falling corridor is planned as its drop with a stretch on either side of it:

- the **upstream stretch**, the items between the region the player comes from and the drop, in travel order,
  hangs from that region and ends on the drop's **ledge**, a node of its own;
- the **downstream stretch**, the items between the drop and the region it leads to, hangs from that region and
  ends on the drop's **landing** node.

Either stretch may be empty; an empty one puts that end of the drop on a node of its region, which is the drop the
plan lays now. A stretch needs a node for each door on it and one for the drop's end; the drop's end is never a
door's node, and the content fill already keeps both ends of a drop clear. The lay lays the upstream stretch from
its region, lays the drop from the ledge at its straight reach, and lays the downstream stretch as a corridor from
its region to the landing; a pinned drop is pinned as now. For `<<` the upstream side is the region written on the
right.

### What answers to which region

A node of a corridor or stretch answers to the region it hangs from up to the first door counted from that region,
and to the far region past it, which is the rule the carve applies now. A corridor with no door splits halfway, as
now.

## 5. Seat: where alignment takes effect

Alignment acts in one place: where `seatLaidFloor` stands each item's node among a corridor's laid nodes. Puzzles and
side paths reach a corridor through the nodes that are left (`placeContentOnRoute`, `fillLaidFloor`, and the
lengthening that asks the lay for more), so where the spare nodes stand is where content can stand.

A corridor laid with `k` nodes and `m` items that need a node has `k - m` spare nodes and `m + 1` gaps: before the
first item, between each two, after the last. The spare nodes are dealt out like this:

1. **Closed gaps.** A gap is closed when the item after it is aligned left, or the item before it is aligned right.
   The gap between a fork's junction and its gate is always closed.
2. **Centred items first.** Each centred item takes one spare node into each open gap beside it, in item order from
   the corridor's start, while spare nodes last. A gap two centred items share is filled once.
3. **The rest goes to the default gap**: the gap after the last item, or the gap before the first when the corridor
   ends at a junction, which is where the carve leaves them now. If that gap is closed, the nearest open gap to it
   takes them; if every gap is closed, the default gap takes them anyway, because alignment never refuses.

A corridor whose items are all free has no closed gap but a junction's, and step 3 puts every spare node where the
carve puts it now, so its doors stand on the nodes they stand on now. A lengthened corridor's new node is dealt by
the same three steps, and the node-to-region rule in section 4 then says which appetite it answers to.

So `in -[A]--- -[B]- b` stands A beside `in`; `in ---[A]- -[B]- b` stands A beside B; `in --[A]-- b` keeps a node
on each side of A when the corridor has two to spare; and a corridor laid with no spare node seats every item in
order, whatever is written.

## 6. Walk

`walkSpecOf` already reads a corridor's items in order, with a walk-only stretch between each two, a drop as a
one-way hop between stretches, and every connection indexed by its place in `connections`. So:

- a drop makes its corridor one-way from where it stands: the stretches either side are walked both ways and the
  drop is crossed only along `from` to `to`, whichever way it was written;
- parallel corridors are walked as two corridors;
- a region gate's hold still stands before a drop that lands in its region.

The walk itself needs no change. Its tests gain the shapes that compile now (below).

## 7. Drawing and `yarn lock`

- **`lockDraw`** draws a falling corridor as its drop, routed as drops are, with its other items written on the drop
  line where there is room, and in the notes beneath otherwise. A parallel corridor is routed as a join that closes a
  loop, as the drawing routes any second way between two drawn regions. Alignment is not drawn: it is a preference to
  the carve, not a part of the lock's shape.
- **The detail view** (`yarn lock <name>`) prints a `corridors:` block listing, in the notation, every corridor that
  carries more than one item, any alignment, or shares its pair, written back from the Lock (`in -[Y]--- >>
leftLower`). Reading that line back gives the same corridor.
- **The detail view and the table report whether the lock compiles.** `yarn lock` runs `checkLock`, the check that
  needs no binding, and prints `✓ compiles` or `✗ refused: <fault>` with the names the fault carries; a refusal
  makes the lock unsound and is the table's checks column when it is the first failure. A lock can walk and still
  not compile, so the tool that says a lock is ready says both.
- The mechanisms column is unchanged.

## 8. With the topology mod off

Mechanic kinds are core and realisations are mods (`docs/mods/TARGET.md`), so the carve is the same with the
topology mod off: the same corridors, parallel ones included, the same falling corridors, the same spare nodes in the
same gaps. Every door on them stands open and every drop's run is a plain passage, as for any unrealised gate and
drop. Alignment is structure, not dress: it moves no node when a mod is toggled. An unbound role stays refused by
name (`unboundRole`).

## 9. doubleBack and the catalogue

### doubleBack

The designer's `src/game/locks/doubleBack.lock` (0ae27925) writes the gate `in -[Y]- leftLower` and the drop
`leftLower >> in` as two corridors on one pair, and enters `s1` by the drop `rightLower >> s1`. It compiles as
written: the drop-only corridor compiles to the drop it means.

Its TypeScript twin, `src/worldGen/spec/locks/doubleBack.ts`, is folded away. The twin's shape differs: it has a
gate `rightLower -[S1]- s1` and an `s2 >> s1` drop where the designer's lock has neither and drops `rightLower >> s1`.
`src/worldGen/spec/expert.ts` (`expert_1`, the last pyramid) and `src/worldGen/spec/dev.ts` (the dev pyramid's
doubleBack floor) read `freeRegions(catalogueLock("doubleBack"))`. `freeRegions` keeps what the twin gives the floor
now, every region `free`, and is how the world already reads stoneGate and twoStones: the file's own appetites seat
the reward in `s2`, off the route, where the floor's goal cannot stand.

Measured on 2026-10-09, with the drop-only corridors compiled as drops: the designer's lock passes `checkLock` with no
fault, and on the playground's bench floor (`playgroundFloor`, the twin's binding) it carves at seed 0, as the twin
does.

- **The bake.** `expert_1`'s last pyramid is re-baked to the designer's lock; its floor 0 changes. Before re-baking,
  check for an uncommitted playtest bake, capture the baked world, and diff after: every other floor is
  byte-identical.
- **The dev floor's seed** is pinned for the twin's carve (`seed` on that `.floor(0, …)`). It is re-recorded from the
  bake's own carve search if the designer's lock does not carve sound at it.
- **Saves: no migration** (designer). `RELAID_FLOORS_VERSION` is not bumped, and no save is rewritten.
- **The changelog** already carries "The Valley of the Kings' last pyramid has a zipline back into the lever chamber,
  so no room there is shut for good." under Unreleased; this re-bake is what makes it true of the designer's lock,
  and no entry is added.
- **The verifies that pin the twin's contents** (`src/worldGen/lockPlanWorld.verify.ts` writes the twin's plan out
  region by region; `devJourney.verify.ts` compares against `doubleBackLock()`) stop pinning the lock and assert the
  floor is laid from the catalogue lock, which is what they are for. Test fixtures shaped like doubleBack
  (`src/game/testSupport/`) are made-up floors and stay.

### The catalogue

Measured on 2026-10-09 at 0ae27925. **No `.lock` file changes, and every catalogue lock parses to the JSON it parses
to now**: no lock writes alignment, `<<`, touching items or a parallel walkable corridor.

What `checkLock` says of them changes:

| lock                        | refused now                                           | once corridors carry items                                                |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| doubleBack, seesaw          | `connectionRepeated` (a gate and a drop on one pair)  | compile                                                                   |
| counterweight               | `connectionRepeated`, and `edgeGateUnnamed` behind it | compiles                                                                  |
| clockwork                   | `connectionRepeated`                                  | `gateOwnedOffSeam`, `gateOwnedTwice` (fork Y also gates `in -[Y+A]- out`) |
| lamplighter, observatory    | `connectionRepeated`                                  | `gateOwnedOffSeam` (fork Y gates a corridor on the route)                 |
| relay                       | `oneWaySharesConnection` (`r3 -[C]- >> in`)           | a falling corridor; its verdict is first measured once it compiles        |
| lessons/boardPicksTheWay    | `gateOwnedOffSeam`                                    | unchanged                                                                 |
| every other lock and lesson | nothing                                               | nothing                                                                   |

The six repeated pairs are each a gate corridor beside a drop-only corridor; none is two walkable corridors, so none
lays a loop. The `gateOwnedOffSeam` faults are the fork-on-the-route rule, which this design does not touch; the
first refusal stands in front of them. Once `yarn lock` reports compiling (section 7), clockwork, lamplighter,
observatory and boardPicksTheWay show ✗ in the table. None of them is placed in the world.

### The world

At 0ae27925 the world places doubleBack, stoneGate and twoStones. Every placed lock but doubleBack, and every lesson,
writes no repeated pair, no falling corridor and no alignment, so their compiled floors, plans and carves are
unchanged, and the bake differs from its baseline in `expert_1`'s last pyramid only.

## 10. Docs

- `docs/mods/mechanic-contract.md`, "The lock format": a connection is a corridor whose `barriers` are its ordered
  items, a drop among them; `align`; two connections on one pair are two corridors; a `oneWays` entry no connection
  names is a corridor of its own. The example becomes the designer's doubleBack as `yarn lock doubleBack` prints it.
  "The nest spot" says a spot beside other items is ignored and `nestSpotShared` is refused for JSON locks too.
- `docs/mods/floor-topology-design.md`: "One-ways" says a drop is an item of its corridor and may share it with gates;
  criterion 6, "corridors absorb side paths", says the author's alignment decides where on a corridor they can go.
- `docs/game-design/world-spec-stability.md`: alignment and parallel corridors in a placed lock are structural; they
  re-carve the floor.
- `LOCK_SYNTAX` as in section 1.

## 11. Proof

Tests use made-up locks only, never a catalogue lock's contents, and count work rather than time.

- **Notation:** every row of the alignment table; `<<` reads as a drop from the right region with id `b>a`; a gate
  then a drop on one line is one connection with both in order; two lines on one pair are two connections; a chain
  is two; every refusal in section 1 with its message; a made-up lock with no alignment parses to a Lock with no
  `align`.
- **Round trip:** for made-up locks with aligned, falling and parallel corridors, the `corridors:` line written back
  parses to the same connection.
- **Compile:** two corridors on one pair compile; an open corridor beside a gated one is `gateBypassed`; a gate and a
  drop on one corridor compile to a falling corridor; `corridorFallsTwice`, `alignOffConnection`, `alignOnDrop` and a
  JSON `nestSpotShared` are refused; a JSON lock with a drop no connection names compiles to the same fragment as one
  whose connection names it; a lock with no repeat and no alignment compiles to a fragment with no `corridor` field.
- **Seat:** the gap rule as a pure function, by table: closed, centred, all-closed, junction at either end, no spare
  node. And for every corridor of `m` free items and `k` nodes, at both junction ends and none, the doors stand on
  the nodes the carve gives them now.
- **Lay:** a made-up lock with two corridors on one pair lays both, only corridor 0 on the route; a made-up falling
  corridor lays its door, its ledge and a drop landing on a node of its region; a drop with items on both sides lands
  on its downstream stretch.
- **Walk:** a gate-then-drop corridor cannot be climbed from below; a `<<` corridor walks one way; two parallel gated
  corridors are walked as two.
- **Drawing:** a falling corridor and a parallel corridor draw without a note saying there was no room.
- **`yarn lock`:** a made-up lock that walks and does not compile shows `✗ refused` and is unsound.
- **Mod off:** a made-up lock with a falling corridor, a parallel corridor and an aligned gate carves the same walls
  with the topology mod off (the existing mod-off helpers), every door open.
- **Stable world:** the baked world before and after, diffed: only `expert_1`'s last pyramid differs.

## Done when

- [ ] The notation reads items in order, `<<`, alignment by dashes and repeated pairs, and refuses each malformed
      item with the message in section 1; `LOCK_SYNTAX` says so.
- [ ] `LockConnection` carries `align`; `connectionRepeated` and `oneWaySharesConnection` are gone;
      `corridorFallsTwice`, `alignOffConnection` and `alignOnDrop` refuse; `nestSpotShared` refuses JSON locks too.
- [ ] Compile writes the corridor index and falling corridors into the floor vocabulary, and `topologyFaults` reads
      corridors: `gateBypassed` per corridor, a falling corridor never open.
- [ ] The lay lays parallel corridors and falling corridors with their stretches.
- [ ] `seatLaidFloor` deals spare nodes by the gap rule, and a lock with nothing aligned seats its doors where it
      does now.
- [ ] The walk's tests cover a falling corridor, `<<` and parallel corridors.
- [ ] `lockDraw` draws falling and parallel corridors; `yarn lock` prints `corridors:` and the compile verdict.
- [ ] doubleBack compiles as written; the twin is deleted; `expert.ts` and `dev.ts` read
      `freeRegions(catalogueLock("doubleBack"))`; the verifies no longer pin its contents.
- [ ] The re-bake changes `expert_1`'s last pyramid and no other floor; the dev floor's seed carves sound.
- [ ] With the topology mod off a made-up lock using every new shape carves the same walls.
- [ ] `mechanic-contract.md`, `floor-topology-design.md` and `world-spec-stability.md` say what this design says.

## Not in scope

Fixing the fork-on-the-route faults that `yarn lock` now shows; aligning a drop or the nest spot; a nest spot placed at
a position among a corridor's items; more than one drop on a corridor; alignment that lengthens a corridor; puzzles
written in a lock; moving any catalogue lock to the new shapes.

## Open questions

- **The four locks `yarn lock` newly marks ✗** (clockwork, lamplighter, observatory, lessons/boardPicksTheWay, all
  `gateOwnedOffSeam`): are they renamed `-blocked`, left red in the table until the fork rule is revisited, or kept
  out of the compile check? None is placed, and all four are Claude's.
