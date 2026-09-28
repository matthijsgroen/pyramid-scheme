# The consequence camera

**What this is.** When a mechanism changes the floor, the camera takes the player to the changes,
shows each one happening, and brings them back. A short freeze, punctuation rather than a cutscene —
the reference is Prince of Persia: Sands of Time, where throwing a mechanism suspends control, the
camera cuts to what moved, holds long enough to read it, and returns.

**Why it exists.** `docs/mods/floor-topology-design.md`, "A gate says what opens it", names four
things that carry a lock's reading. Three are built: shape says what kind, colour says which one, and
a mark is a glyph on a coloured ground worn by a mechanism and every gate it owns. The fourth is not:

> **Consequence confirms it.** The player can look anywhere they have explored, so throwing a switch
> is a thing they can watch.

Nothing implements it. The only camera movement on the site map is an effect keyed on `explorerPos`
(`src/app/SiteMap/SiteMapView.tsx`), which centres on the PLAYER and never on the change.

**The gap that exposed it.** A mark answers "which lever drives this door". It does not answer "which
way do I throw it", because both of a lever's positions wear the same pair — by design. The design's
answer to direction is this fourth carrier. On the develop journey's lever floor the two driven doors
sit at opposite corners, so a throw changes nothing on screen: the player flips, walks to find out,
and walks back. That is the loop this replaces.

**This does NOT change what a mark means — yet, and the playtest decides.** Per-position marks would
make a door state its own direction, at the cost of contradicting the one-pair rule and doubling what a
lever's room has to show. Building the carrier the design already specified serves every mechanism
rather than only levers, so it goes first.

**Whether the camera is enough on its own is a question for players, not for this document.** Ship the
camera, watch someone play a lever floor, and see whether they still have to walk to find out which way
to throw it. If they do, per-position marks come back on the table with evidence behind them. Parked on
that evidence, not rejected.

---

## The rules

1. **Trigger.** A mechanism state change whose diff holds at least one cluster with an explored seam,
   and which has not already been toured this floor visit.
2. **Beats.** One per changed cluster, **nearest the player first**, then outward, ties broken by
   grid order so the sequence is deterministic. Nearest-first keeps the travel short and reads as going
   out and coming back rather than as a circuit.
3. **Staging.** The change happens on screen while the camera is looking at it — never before.
4. **Freeze.** Input is suspended for the sequence and it is not interruptible.
5. **Fog.** A cluster with no explored seam is skipped silently.
6. **Zoom is the player's.** The tour never changes it, and returns them where they were.
7. **No save state.** Nothing here persists.
8. **One pace, tuned once.** Travel time and the hold at each beat are two constants for the whole
   feature, not per mechanism — a lever and a waterline read at the same speed or the player learns two
   rhythms. They are tuning knobs: expect to set them by watching, not by reasoning.

### Why uninterruptible

An abortable tour teaches players to dismiss it, and then they stop reading the one thing it exists to
say. It is affordable only because rule 1 makes it rare: it fires when there is something to show and
stays silent otherwise.

### Why once per floor visit

Rule 1 alone would freeze on every throw of a lever whose doors are both off screen, and the topology
design is explicit that a floor worth experimenting with is one the player throws many times. So a
transition tours once per visit: throw it and watch, throw it back and the camera stays put, because
they have just been shown.

**This lives in memory for the visit, not in the save.** A persisted "already seen" set would be new
save keys, and the address questions that come with them (`docs/authored-locks-roadmap.md` §5). It is
not worth that, and re-teaching on a later visit is not a defect.

---

## How the diff is taken

**The grid is a pure function of the mechanism state.** `src/app/SiteMap/useAssembledFloor.ts`:

```
grid = sealWaysOut(openWaysOut(baseGrid, openDoorsFor(baseGrid, currentFloor, mechanismPositions)))
```

memoised on `[baseGrid, currentFloor, mechanismPositions]`, with `mechanismPositions` arriving as a
prop. Both the before and after grid are therefore computable on demand from one `baseGrid`.

**So the diff is taken over the open-gate SET, not over cells.** `openDoorsFor` returns a
`Set<string>` of gate key ids, which makes the change exact and cheap:

| | |
| --- | --- |
| opened | `after \ before` |
| shut | `before \ after` |

A cell-by-cell diff would be both slower and vaguer.

### The revealed set is what stages it

The tour renders with a set that starts as the BEFORE set and moves one cluster per beat:

- the camera reaches a door that will open → its key is added → it opens while the player watches
- the camera reaches a door that will shut → its key is removed → it closes

One evolving set expresses both directions, and the renderer needs no new concept: it is the same
`openWaysOut` call it already makes, handed a set that is not final yet. Nothing holds two grids side
by side.

### Clusters and seams

A cluster is a connected group of changed cells. Its beat targets the **seam** — the changed cell
adjacent to ground the player has explored. **The seam is a mouth, and the camera frames it and stops
there.** It never travels past the seam into the cluster.

That is what the waterline case needs, and the waterline case is the one that shows why the seam is
the right target rather than the cluster. A flooded zone could not be walked, so its INTERIOR is
unexplored — the changed cells are fogged, and the only cell that means anything to the player is the
one where they may now enter. Framing that mouth says "this is open to you now". Touring the interior
would draw a zone they have not earned.

**Known-but-shut is not a secret.** The fog rule exists to stop a flip revealing that something is
THERE — a hidden branch is a secret, and panning at it leaks it. A flooded zone is one the player has
seen and been turned away from, so its mouth opening is information they are owed. The test is not
explored-versus-fogged; it is whether the seam sits against ground they have walked. If it does, they
already know the place exists, and the camera may show the way in without showing what is inside.

This is what keeps the hard case cheap, and the hard case is named in the topology design: a mechanism
owning many gates "has nowhere to travel to". A waterline drowning a dozen corridors is ONE cluster
with one seam, so it is one beat rather than twelve, and a lever's two doors are two clusters of one
cell each — which is the door-1-then-door-2 tour. The same code produces both.

**Gate key ids do not carry coordinates.** A gate cell is found by its `requiredKeyId`, one scan per
beat. Trivial at these grid sizes, but a real step rather than free.

---

## What it must not do

- **Never travel PAST a seam into fog.** The camera stops at the mouth. Going further draws ground the
  player has not earned, which is the spoiler that already stops a switch gating a hidden branch. A
  cluster with no explored seam has no mouth to frame and is skipped entirely — and a flip that visibly
  does nothing is honest.
- **Never take the player's zoom.**
- **Never move `levelNr`, position, or any saved state.** The tour is a camera, nothing else.

---

## Assumption to re-check when waterline lands

The open-gate-set diff is exact for GATES, which is what exists today. `waterline` is designed but not
built; it floods a region from within rather than opening a boundary, so it is not a gate-set change.

The same shape holds only if flooding is likewise a pure function of mechanism state. It should be, by
the same design — but it is an assumption, written here rather than buried, and the generic form of
the rule is: **the rendered floor is a pure function of mechanism state, and a tour interpolates
between two states by revealing the difference one cluster at a time.** If waterline cannot be
expressed that way, this design needs revisiting before it is extended, not after.

---

## How it gets verified

The camera is a rendering and interaction feature, and this repo's rule is that those are confirmed by
looking — screenshots and live DOM, never by reading code. The checks that can fail:

- **The diff.** Pure and unit-testable: given a `baseGrid` and two position maps, the opened and shut
  sets are exactly these. This is where correctness lives and it needs no browser.
- **Seam selection.** Given a cluster and an explored set, the chosen seam is the changed cell adjacent
  to explored ground; given a cluster wholly in fog, there is no beat at all. Assert the fog case by
  its ABSENCE of a beat — that is the spoiler rule, and it is the one most likely to regress quietly.
- **Staging order.** The revealed set at beat N contains exactly the first N clusters. A test that
  asserts only the final state would pass even if every change landed before the camera moved, which
  is the whole feature failing — so assert the intermediate sets, not the end state.
- **The tour itself** — that control is suspended, that the camera arrives before the change, that it
  returns to the player's position and zoom — is confirmed in a real browser.

Count work, never wall-clock: no test asserts how long a beat takes.
