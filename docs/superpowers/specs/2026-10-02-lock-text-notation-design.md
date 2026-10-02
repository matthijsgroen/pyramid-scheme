# Lock text notation, against the shared lock type

The lock text an author types (`yarn lock sketch.lock --watch`) compiles to the shared `Lock` type in
`src/game/lockAuthoring.ts` (branch `feat/switch-fork`, commit `aaeb4311`), is walked by `walkLock`, and
is drawn as ASCII. The type is the target; `docs/mods/mechanic-contract.md` explains it. Where this spec
and the type disagree, the type wins and this spec is wrong.

## Goal

An author designs a lock in text and gets back, on every save: whether it is sound, what stands open at
the start, what it could do without, a map, and — when run without `--watch` — the `Lock` JSON. The text
says nothing the type cannot carry, and the type carries nothing the text cannot say.

Done when the eight catalogue locks are written in the new notation, each compiles to a `Lock` that
type-checks, walks with the same verdict as today, and draws.

## Model

One model, the shared type:

```
text --parseLock--> Lock --compileLock--> LockSpec --> walkLock, solveLock, lockQuality, drawLock
```

`AuthoredLock`, `topologyLock`, `chain` and `embed` are deleted. Composition and realisation are said
where a lock is placed, not in the lock.

## The notation

```
// regions and how they join
in -- hall                    connection, nothing on it
in -[Y]- left                 connection with an edge gate owned by Y
left -[S1]- s2                bare owner: S1 in its second state (toggle b, activator on, sequence done,
                              fork-switch: the way through this gate)
right -[S1:a]- s1             owner in a named state
hall -[T1+T2]- vault          every owner (the default)
hall -[A|B]- vault            any owner
s1 >> left                    one-way
left -[S1]- >> in             several barriers on one connection, in order from the line's left region
hall -[sluice:wet]            region gate: hall impassable unless sluice is wet

// mechanics: id control @region [state names]
S1 toggle @s1                 states a b, starts at the first
sluice toggle @hall dry wet   states dry wet, starts at dry
T1 activator @hall            states off on
Y fork @in                    rest, plus one per gate it owns
P sequence hall vault hall reset hall-vault

// what a region takes
hall *     s2 $     spare ?     corridor -
```

- A line goes on: `a -[X]- b -[Z]- c` is two connections. Empty between two barriers is the same
  connection: `a -[X]- >> b` is ONE connection `[a, b]` with barriers `[X's gate, the one-way]`.
- `in` takes puzzles; every other region takes nothing unless it says otherwise.
- `//` starts a comment, whole line or end of line.
- An owner named on a gate and placed nowhere is a draft: it is left out of `mechanics`, compiles as
  never moving and opening nothing, and fails the run.
- Gone: `!` (write the state), `#red` (a key is an activator), `chain`/`embed`, plain-corridor merging.

### Ids

- Edge gate `from-to`; region gate `region:barred`; one-way `from>to`. A repeat gets `#2`, `#3`.
- A connection's barrier order is the order the line wrote them, from its left region.

### What the parser refuses, by line

Every refusal names its line. New on top of today's:

- a fork's gate that is not the first barrier on its connection, or does not leave the fork's region
- a region gate on the region holding `in` or `out`
- a mechanic standing in a region it bars with a region gate
- a sequence's `reset` naming no edge gate
- a state name a gate uses that its mechanic does not have
- states declared on a fork-switch or a sequence
- a bare corridor written twice (`a -- b` and `b -- a`). Two joins between one pair are otherwise
  allowed: doubleBack's drop `leftLower >> in` runs beside its fork gate `in -[Y]- leftLower`

## Walking

`compileLock` turns a `Lock` into the `LockSpec` the walk proves, with every move the player has:

| control | states | moves |
| --- | --- | --- |
| toggle | its two named states | either to the other, at its region |
| activator | its two named states | first to second, once, at its region |
| fork-switch | `rest` + one per owned gate | any to any, at its region |
| sequence | `0 … n-1`, `done`, `spoiled` | k to k+1 at step k's region; to `spoiled` at the region of any other step; any but `done` to `0` at either side of `resetAt` |

- **Barriers in order.** A connection with several barriers becomes a chain of walk-only stretches, so
  a gate before a drop and a drop before a gate walk differently. Stretches never appear in the JSON or
  the drawing.
- **Region gate.** The last step of every way into the barred region, connection or one-way, carries the
  region gate's condition.
- **Sequence draft.** `done` stays fired and tiles may sit in any region — answers to the contract's open
  §8 questions, chosen for now, reported with a ⚠ line.

## Report

Above the map, in this order:

```
✓ every region is reachable
✓ solvable                                    (✗ a dead end: … when it strands)
at the start these gates stand open: rightLower-s1
in-out shows what it waits for: A, B          (every gate with mode every and 2+ owners)
⚠ sequence P: done stays fired, tiles anywhere — contract §8 open
⚠ not buildable yet: sequence, region gate
✗ not placed yet: G2
```

Then the map, the cheapest route, the quality notes, and — outside `--watch` — the JSON.

## Drawing

- The layout tree is built from connections. A bare connection is a line; its gates are tokens along
  it in order; a one-way on it is an arrow in the line. Connections the tree does not use are routed
  dotted, as today.
- A region gate shows in its region's box: `[vault ▒sluice:dry]`, ▒ shut at the start, ░ open.
- A sequence numbers its steps in their boxes, `[hall · P1 P3]`, and its reset door reads `■P↺`.

## The catalogue in the notation

Levers are toggles, `!H` is `-[H:a]-`, keys are activators, `in -- top` stays two regions.

| lock | text |
| --- | --- |
| twoLamps | `in -[Y]- west` · `in -[Y]- east` · `in -[A+B]- out` · `Y fork @in` · `A toggle @west` · `B toggle @east` |
| dropHome | `in -[Y]- hall -[H:a]- leverRoom` · `in -[Y]- vault` · `in -[H]- out` · `leverRoom >> in` · `Y fork @in` · `H toggle @leverRoom` · `hall *` · `vault $` |
| lamplighter | `in -[Y]- west` · `in -[Y]- east -[A+B]- out` · `west >> east >> in` · `Y fork @in` · `A toggle @west` · `B toggle @east` |
| seesaw | `in -[B:a]- west` · `in -[A:a]- east` · `in -[A+B]- out` · `west >> east >> in` · `A toggle @west` · `B toggle @east` · `west *` · `east *` |
| doubleBack | `in -[Y]- leftLower -[S1]- s2` · `in -[Y]- rightLower -[S1:a]- s1` · `in -[S2]- out` · `s1 >> leftLower >> in` · `Y fork @in` · `S1 toggle @s1` · `S2 toggle @s2` · `s2 $` |
| cellar | `in -[H:a]- ledge` · `in -[blue]- cell` · `in -[H]- out` · `ledge >> cell` · `H toggle @ledge` · `blue activator @cell` · `ledge *` |
| keyring | `in -[H:a]- leverRoom -[H]- redRoom` · `in -[red]- greenRoom` · `in -[green]- out` · `H toggle @leverRoom` · `red activator @redRoom` · `green activator @greenRoom` · `leverRoom *` · `redRoom *` |
| overlook | `in -- top` · `in -[S2]- s2 -[S1]- middle` · `in -[S2]- out` · `top >> s1 >> in` · `top >> middle >> in` · `S1 toggle @s1` · `S2 toggle @s2` · `top *` · `middle *` |

Each `·` is a line break.

## What the tests freeze

- each catalogue lock: compiles to a `Lock` (type-checked), walks with today's verdict, its drawing and
  cheapest route as a snapshot
- each refusal above: its line number and message
- barrier order, with X a toggle standing in `a` that starts shut: `a -[X]- >> b` walks sound (the drop
  is out of reach until X opens), and `a >> -[X]- b` strands in the stretch between the drop and X
- a region gate: the barred region is unreachable while it holds, entered by a one-way included
- the sequence: in order opens its door; a wrong tile spoils; reset at the door recovers; progress
  survives walking to the door
- the start report and the face report, on doubleBack and on the four-lantern door

## Depends on, and does not fix

- The shared type lives on `feat/switch-fork`. This branch takes it by merging that branch, not by
  copying the file.
- The engine's solver floods, so two regions joined by a bare connection are one region there until its
  T15 lands. The tool keeps them apart, which is the target.
- Nothing here compares the authored lock with what the carve builds; that is the engine's container
  work.
