# Floor topology: where it stands, and the plan

Companion to `floor-topology-design.md`, which says what the topology should BE. This one says what it
IS, measured, and what has to happen to close the gap. Every claim here was measured against the code
on 2026-10-02 and carries a `file:line` or a measurement. Where something is proposed rather than
established it says so.

Read this before changing anything in the lock, gate, switch, lever or one-way code. It exists because
the same defects were rediscovered one at a time over several weeks, each fixed as a symptom, while
nobody held the whole picture.

## 1. What a player can actually meet today

**The shipped world has ONE lock mechanic.** A light switch on junior_2, pyramid 2, floor 0
(`src/worldGen/spec/junior.ts:156-169`). That is all.

The baked world authors **zero** `handles`, **zero** `oneWays`, **zero** `regionLayout`, **zero**
`obstacles`, **zero** `controls`. Levers, ziplines, the torch and every container live only in the
develop journey `dev_topology`, which is built only with `INCLUDE_DEV` (`src/worldGen/data.ts:66-72`).

Floor keys (58), tomb keys (289) and hidden sections (110) exist in the shipped world, but they are not
mechanics in this document's sense: the player collects an item or finds a passage rather than
operating something. The line drawn here is **a lock mechanic is something the player operates that
changes which edges are passable, and that compiles either to a `MechanismRecord` on a cell or to a
one-way edge in `LockSpec`.**

## 2. The mechanics that exist

| Mechanic | Authored as | Operation | Governs | Cannot |
|---|---|---|---|---|
| **Light switch** (`lightbeamSwitch`) | `forks` + `switches: {encounter, min, max}` | Board opens on first arrival; route the beam to a shrine and that way opens, the rest shut. Later visits prompt "Turn the mirrors". | Every free way out of its OWN junction, chosen by the carve | Name its doors. Own a region seam. It is never marked. |
| **Lever** (`handles`) | `handles: [{ in, left, right, starts? }]` | Arrival prompt "Throw the lever"; toggles; no screen; can be declined | The entrance gate of named side sections | More than two states. A door on a region seam. Drive the main path. |
| **Control** (`controls` + `obstacles`) | `regionLayout` + `obstacles` + `controls` | Same prompt and family as the lever. A multi-state control CYCLES; the player cannot pick a state. | Gates on region-to-region connections | Be drawn as anything but a lever. Own a one-way. Stand where its lock is. |
| **Torch** (`encounter: "torch"`) | a control with that encounter | Prompt "Light the torch"; once lit it is plain floor | Whatever the control opens | Be authored anywhere today. Be drawn as a torch. |
| **Zipline** (`oneWays`, obstacle `kind: "oneWay"`) | section- or region-addressed | Walk to the launch, prompt "Slide across", the player appears at the landing | Nothing; it is a one-way edge | Be owned or reversed by a control. Be animated. Be drawn outside tier `expert`. |

`handles` and `controls` are two authoring routes into one runtime shape: both compile through
`compileMechanism` into the same `MechanismRecord` and the same `handle` family. A `handles` lever is
section-addressed and fixed to `left`/`right`; a control is region-addressed with arbitrary states.

## 3. Coverage: criteria against tests

Counted over the criteria in `floor-topology-design.md` plus those implied by the code. "Real" means
asserted on a carve; "fixture" means a hand-built grid or a stub family.

| | Bediening | Plaatsing | Definitie in slot |
|---|---|---|---|
| Light switch | 11 — 6 real, 3 fixture, 2 none | 7 — 5 real, 1 fixture, 1 none | 5 — 4 real, 1 fixture |
| Lever (`handles`) | 9 — 2 real, 4 fixture, 3 none | 6 — 5 real, 1 none | 6 — 6 real |
| Control + gate | 10 — 1 real, 4 fixture, 5 none | 9 — 8 real, 1 none | 8 — 4 real, 3 fixture, 1 none |
| Torch | 4 — 2 fixture, 2 none | 1 — 1 none | 2 — 1 fixture, 1 none |
| Zipline | 8 — 2 real, 5 fixture, 1 none | 8 — 7 real, 1 none | 6 — 4 real, 1 fixture, 1 none |
| Container | — | 11 — 7 real, 4 none | 9 — 3 real, 2 fixture, 4 none |

**Two numbers in that table are worth less than they look.**

- The lever's operation is tested against a STUB family (`useSiteNavigation.spec.ts:34-50`), not
  `HANDLE_META`. Delete `actsOnArrival: true` from `src/mods/topology/game/handle/meta.ts` and every one
  of those tests still passes while real play opens a different screen. No test reads the real meta.
- The `or`/`and` gate criteria are tested on a hand-built row only (`gateMode.spec.ts`). No carved floor
  has a gate with two owners, and no authored floor uses `mode`.

## 4. Containers

A container is a `RegionGraph` — regions with an appetite, undirected connections, and the ports `in`
and `out` — plus an optional `placement` (`src/game/regions.ts:358-362`).

**One per floor.** `regionLayout` is a single optional value (`siteTypes.ts:506`). There is no list, no
`locks:` field, and no `topologyLock(...)` outside the design doc.

**Nesting and chaining do not exist.** Both are described in `regions-and-containers.md` and
`floor-topology-design.md` (criteria 9 and 10). No recursive type, no region that holds a container, no
authored example, no test.

**`placement` is built and unused.** It landed on 2026-10-01 with `containerPlacement.spec.ts`. No world
spec authors it, so every authored lock is the whole floor and its `out` region holds the exit — which
is why criterion 11 ("the exit may not stand inside a lock") is false for every lock that exists.

Four words for three things, and they are not interchangeable: a **region** is a stretch of the carve; a
**section** (`s0`, `main`) is the authoring unit saves key on; a **side path** is a section grown off the
main path, which is where an off-route region chain is seated; a **container** is a reusable region graph
with ports, of which the code knows only the placed form.

## 5. Where the spec and the code disagree

| Spec says | Code does | |
|---|---|---|
| `switches: { Y: { in, encounter } }` — a region-seated control | `switches` is `{ encounter, min, max }`, the FORK switch. A region-seated control is `controls[]` | **name collision** |
| `topologyLock({...})` placed with `locks: [a, b]` | flat `regionLayout` / `obstacles` / `controls` fields | documented, unbuilt |
| `gates: { id: { from, to, owners, startsOpen } }` | `obstacles[{id, kind, at, mode?}]` plus `controls[].opens` | different shape; `startsOpen` unbuilt, an unowned gate is refused |
| a gate wears the mark of each owner | one `Mark` per gate, last control wins (`siteAssembler.ts:916`) | unbuilt |
| the switch and its doors share a mark | never marked (`siteAssembler.ts:3367`) | contradicts the doc |
| six-kind region appetite | four kinds (`regions.ts:11`) | the doc also contradicts itself here |
| criterion 8, "a lock may stand anywhere: not there" | built 2026-10-01 | doc stale |

Implemented and undocumented: the torch family, `Control.encounter`, `crossAtOnce`, expert-only lever
and drop art.

## 6. Known broken or missing

Each measured, each with its evidence.

1. **A switch cannot own a named region seam.** `closeWaysOut` closes only its junction's free ways out
   and keys them by section address (`siteAssembler.ts:~3243-3290`). `config.switches` carries no region
   names. This is what blocks doubleBack being authored the way its design describes.
2. **`Control.encounter` changes behaviour, not drawing.** `controlRoomSpec` always tags
   `[HANDLE_FAMILY]` (`siteAssembler.ts:1980-1986`) and `shapeKindFor` keys on the tag. A torch is drawn
   as a lever.
3. **An open family-less gate is rewritten to plain corridor**, losing its tags and its mark
   (`mechanismDoors.ts:98-120`). The player cannot see that a door is there, so they cannot reason that
   it will shut when another opens.
4. **Two mechanisms on one floor can wear the identical mark.** Measured on dev pyramid 2: `Y`
   (`forkLeft|forkRight`) and `S2` (`endDoor`) both compute to green + the same glyph. The collision
   chance is about 10% with three controls and 30% with five. The mark is the only thing on the map that
   says which lever drives which door.
5. **A control is seated at the first free main-path node of its region**, not where the lock is
   (`siteAssembler.ts:1463-1500`). On dev pyramid 2 that puts the lever sixteen cells from the fork it
   governs.
6. **`openDoorsFor` and `floorLock` are not proved equivalent** for a door naming more than one key
   (`mechanismDoors.ts:13-28`, which also records the two measured ways they can disagree). This was
   documented and left alone because nothing could author such a door. It is now LOAD-BEARING: a floor
   key is an activator and may take part in an `and`/`any` condition (`mechanic-contract.md` §2, §3), so
   "four torches and the key" is exactly that door.
7. **A multi-state control cycles**; the player cannot choose a state.
8. **Toggle-off holds for `obstacles`, `controls` and `switches`, not for `handles`**
   (`modOwnedAuthoring.ts:48-57`). What a `handles` floor does with the mod unregistered is UNKNOWN.
9. **Lever and drop art exist only for tier `expert`.** Other tiers draw the room marker alone.

## 7. The plan

The through-line: **silent fallback is the defect.** A control with no `encounter` becomes a lever; an
`encounter: "torch"` is drawn as a lever; `switches` means one thing in the spec and another in the
code. Every time, the author got something other than what they wrote, and nothing said so.

### A — Vocabulary (the lock-authoring tool)

- **A1. One name per concept.** No word with two meanings; no concept with four names. Settled:
  **lock**, **mechanic**, **gate**, **region**. A zipline is a realisation of `one-way`; a lightswitch is
  a realisation of `fork-switch`. An author never sees "section" or "side path".
- **A2. The mechanic contract.** Settled on 2026-10-02 and written down in `mechanic-contract.md`:
  three layers (control, effect, realisation), four controls plus one-way, targets that are edges or
  regions, realisations bound from outside. Everything else hangs off this.
- **A3. The tool refuses what a mechanic cannot govern.** Naming a seam for a light switch is an error
  where it is written, not a lever sixteen cells away.
- **A4. No silent default.** An omitted property is asked for or refused, never guessed.
- **A5. Unbuilt mechanics are declarable** (`built: no`) — pressure plate, flooding a region, a sand
  barrier, and the torch, which exists but is in no spec. Designs can then be written and checked before
  the code exists.

### B — Engine gaps

- **B1. An open gate keeps its symbol and colour.** (Fixes 6.3.)
- **B2. Two mechanisms on one floor never share a mark.** (Fixes 6.4.)
- **B3. A fork's exits can be the authored seams.** (Fixes 6.1; unblocks doubleBack.) Not "a switch may
  own named seams" — a fork puzzle operates its own fork (`mechanic-contract.md` §4), so what must move
  is the carve: when a fork-switch stands in a region whose connections are the fork's branches, the
  junction's exits must be laid on those seams rather than chosen independently of them.
- **B4. A control stands where the lock it governs is.** (Fixes 6.5.)
- **B5. `encounter` decides the drawing too.** (Fixes 6.2.)
- **B6. Several locks on one floor, in sequence.** `placement` is the foundation and has never been
  driven by a real floor.
- **B7. A lock nested inside a region of another.** The trap the spec names: a nested lock must not be
  walked as a product, or the state count explodes. Its test counts states, not just soundness.

### C — Coverage

- **C1. Operation tested against the real `FamilyMeta`**, not a stub.
- **C2. `or`/`and` gates on a carved floor.**
- **C3. Criteria per mechanic per axis** — bediening, plaatsing, definitie — each with a test that goes
  red when the behaviour regresses.

### D — Record

- **D1. This document.**

## 8. The delta, sized

What each requirement of `mechanic-contract.md` §9 costs, measured 2026-10-02. "Carve moves" means cell
layout can change, so the run needs a baseline diff and the baked world may shift. "Saves move" means
stored progress can be orphaned.

| # | Requirement | Size | Carve moves? | Saves move? |
|---|---|---|---|---|
| 1 | targets are an edge or a region | edge **medium**, region **large** | region: yes | no |
| 2 | a fork's exits are the authored seams | **large** | yes, on `regionLayout` floors only | only if the shipped switch migrates |
| 3 | an open gate keeps its symbol | **medium** | no | no |
| 4 | marks never collide | **medium** | no | no |
| 5 | the realisation decides the drawing | **small** + **medium** | no | **yes, at risk** (see 15) |
| 6 | one answer for a multi-key door | **medium** | no | no |
| 7 | conceal an explored region | **medium** | no | no |
| 8 | transitions in several places | **medium**, runtime **large** | tile placement: yes | new keys |
| 9 | a gate that reads and never opens | **medium-large** | no | no, additive |
| 10 | off-route regions form a tree | **medium** | yes | no |
| 11 | the lock format itself | **large** | no | no |
| 12 | unbarred regions stay separate | **medium** | no | no |
| 13 | a step onto a tile is not optional | **medium** | no | no |
| 14 | state across several cells | **medium** | no | new keys |
| 15 | the slot must not name the family | **small** | no | **yes** |
| 16 | the carve never needs a mod | **small** | no | no |
| 17 | one fold for a gate's mode | **medium** | no | no |
| 18 | every one-way offers its prompt | **small** | no | no |

**The shortest path to the worked example.** doubleBack as the designer wrote it needs only **10** and
**2**. The other sixteen do not stand between it and being playable — 3 and 4 make it readable, the rest
serve mechanics it does not use. Requirement 10 alone makes the layout carve with a plain three-state
control, which is how the dev floor runs today, and tests everything except the fork-switch.

**Where a baseline is needed.** 1 (region targets), 2, 8 (tile placement) and 10 touch the carve. The
ledger fingerprint hashes the assembler's import graph, so any of them invalidates the refusal entries
and they are searched again on the next bake.

Order: A2 is the spine — A3, A5, B3, B6, B7 and C3 all hang off it. B1 and B2 are independent and can
run beside it.
