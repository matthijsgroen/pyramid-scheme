# Floor topology: the tasks

One task per block. Each is meant to be picked up on its own, by one agent, and checked by whoever holds
the whole. `mechanic-contract.md` says what the authoring model is; `topology-status.md` says what is
built and what each change costs; this says what to do and how to know it is done.

**Acceptance criteria are the brief.** A task is finished when every criterion under it is true AND a
test fails if it stops being true. A criterion with no test is not done.

## House rules, for every task

These were each paid for the hard way and are not optional.

- **Never run `yarn generate-world`.** The world file and the carve ledger are the designer's playtest
  build. Never touch, stage, restore or regenerate either. Check `md5 -q src/data/generatedWorld.ts` is
  unchanged at the end.
- **The world fingerprint cannot see the carve.** Any task marked *carve moves* must capture a baseline
  first: assemble every floor at its real seed, reduce each cell to its `dirs`, write it down, and diff
  after. A difference is a finding to report, never something to reason past.
- **Watched failing.** Break the production code, run the new test, quote the red output, restore. A test
  nobody saw fail proves nothing.
- **`yarn check-types` is the truth.** The IDE's diagnostics in this repo have been wrong every time.
  Capture real exit codes.
- **Test the invariant, not the change.** Assert whole result sets, never one sample of a collection.
- **A red existing test is a finding.** Work out what it protected and report it. Do not edit it to pass.
- Never `git add -A`. Never `pkill`. No dev server, no browser.

## Order

**First, because they are the only things between the designer's worked example and a floor they can
play:** T1, T2.

**Independent, and each makes the floor readable:** T3, T4, T5, T18.

**The new mechanics:** T6, T7, T8, T9, T10.

**The model itself, largest last:** T11, T12, T13, T14, T15, T16, T17.

---

## T1 — Off-route regions form a tree, not a chain

**Why.** The designer's doubleBack carves on 0 of 60 seeds, refused `obstacleOffRoute`. The same layout
without its drops carves 60 of 60. Two faults are tangled: drops counted as undirected edges merge the
two arms into one component, and `regions.ts:273` puts connections and one-ways in one neighbour list
with no dedupe, so a pair joined by both is seated twice.

**Do this first.** Measure whether the dedupe alone makes the layout carve. That decides whether this is
a one-line repair or a redesign of the grouping, and nobody has measured it.

**Acceptance**
1. A component with two arms off one mouth seats both, each on its own side path.
2. A region joined by both a connection and a drop is seated once.
3. The designer's doubleBack (`mechanic-contract.md` §7) carves on at least one of 40 seeds.
4. A region joined by nothing at all is still refused by name.
5. The existing `offRouteChains` expectations hold unchanged — they encode the mouth-and-order rule.

**Carve moves: YES.** Only floors with a `regionLayout` that author drops, which today is dev only.
**Saves: no.**

## T2 — A fork's exits are the authored seams

**Why.** A fork puzzle operates its own fork (`mechanic-contract.md` §4). The carve chooses a junction's
exits independently of the region seams, so a floor authored this way strands: the region straddles the
door.

**Acceptance**
1. A fork-switch standing in a region whose connections are the fork's branches gets a junction whose
   exits are exactly those seams.
2. Its states follow from those seams: rest, plus one per exit. The author counts nothing.
3. In rest no exit is open.
4. A gate owned by a fork-switch that is not a seam leaving its region is refused where it is written.
5. The carve refuses by a reason naming the seam when it cannot lay the junction on it, rather than
   placing the puzzle away from what it governs.
6. Turning the topology mod off does not change the floor: the junction holds from `regionLayout` and
   `forks`, never from mod-owned `switches`.
7. The board shows which gate each configuration opens, and which stands open now.

**Carve moves: YES.** **Saves:** only if the shipped junior_2 switch is migrated; prefer not to.
**Depends on T1** for the designer's layout.

## T3 — An open gate keeps its symbol and colour

**Why.** An open gate is rewritten to plain corridor, so the player cannot see a door is there and
cannot reason that it will shut when another opens.

**Acceptance**
1. An open gate is still drawn as a gate, in an open state, with its mark and colour.
2. The player walks through it with no prompt and no stop.
3. Reveal carries on past it as through ordinary ground.
4. A shut gate is unchanged in every respect.

**Carve moves: no. Saves: no.** Independent.

## T4 — Marks never collide

**Why.** Measured on dev pyramid 2: `Y` and `S2` wear the identical mark. The mark is the only thing on
the map saying which mechanic drives which door. Roughly 10% of floors with three mechanics collide.

**Acceptance**
1. No two mechanics on one floor wear the same mark.
2. A mechanic and its gates wear the same mark.
3. Inserting a mechanic does not renumber the others.
4. A sequence's tiles each get a distinct hieroglyph, distinct also from every mark on that floor.
5. A floor needing more distinct marks than exist is refused by name rather than colliding.

**Carve moves: no. Saves: no.** Independent. Note the glyph supply is six; criterion 5 is why.

## T5 — A gate shows what it waits for

**Why.** With two owners on an `and` door, operating one changes nothing visible and the player cannot
know why the door stays shut.

**Acceptance**
1. A gate carries a readable face exactly where operating an owner can produce no visible change: an
   `and` door with more than one owner, and a sequence. Nowhere else — a single owner, however far away,
   teaches by consequence, and an `any` door opens on the first owner touched.
2. The face is derived from the owners. The author writes nothing for it.
3. It shows one marker per owner, unlit or lit by that owner's current state, with the owner's own icon:
   a flame for a torch, a key for a floor key.
4. A sequence's door shows the order to be walked, and carries the reset.
5. The face can be read while the gate is shut.
6. Reading changes nothing. The gate opens only by its condition being met.

**Carve moves: no** (prove it: the gate cell already exists and only gains a family). **Saves:** additive.
**Wants T3 and T4.**

## T6 — A target may be a region

**Why.** Flooding and sand bar a whole area, not an edge. Today a mechanic's targets are edges only.

**Acceptance**
1. An author writes a barrier that bars a region, under one id, owned like any other gate.
2. A region holding the lock's entrance or exit cannot be barred, refused where it is written.
3. A mechanic may not stand in a region it makes impassable, refused where it is written. (Shutting an
   *edge* behind yourself stays allowed: the lever is still in reach.)
4. The barrier stands inside the region: the player sees the first stretch, the blockage, and nothing
   beyond — from every entrance the region has.
5. The carve refuses by name when it cannot seat the barrier, rather than placing it elsewhere.
6. Shut, it is drawn as a blockage that suits the theme, not as a barred door.
7. Open, it is ordinary ground walked without a prompt.
8. The solver treats a barred region as unreachable, and a floor made unplayable by it is refused before
   it is baked.

**Carve moves: YES** (several door cells for one id; slots need suffixing). **Saves:** new slots only.

## T7 — Conceal explored ground while it is shut

**Why.** Exploration is permanent, so a region barred again still shows what the player saw. They look
straight through the sand.

**Acceptance**
1. Ground cut off by a currently shut region barrier is hidden, whether or not it was explored.
2. It is hidden, not erased: opening the barrier shows it exactly as it was left, with nothing to walk
   again.
3. Cut off is reckoned from where the player is, so a one-way counts in one direction only.
4. A hidden stretch does not read as unexplored to anything that counts progress.

**Carve moves: no. Saves: no**, provided concealment is derived when drawing. **Depends on T6**: concealment is a property of a region barrier only (the shut door cells
carrying `regionBarrier`); an edge gate conceals nothing, so ground behind a shut one stays drawn as explored.

## T8 — The sequence

**Why.** A new control: tiles walked in order, with a reset.

**Acceptance**
1. An author writes the order and the region of each step. The carve picks the hieroglyphs.
2. It is one mechanic with one state, however many tiles — one owner for the gate, one thing for the
   solver.
3. Each tile stands in the region the author named; two steps in one region are two distinct tiles.
4. The reset is at the gate the sequence opens, not on a tile of its own.
5. The carve refuses by name when it cannot place the tiles as written.
6. Walking onto a tile works it. No prompt, no screen.
7. A tile still in fog does not register: a tile is visible before it can be stepped on.
8. Each tile shows its own state: unwalked, walked in order, walked out of order.
9. A wrong step registers and spoils the run without erasing it; the player sees it and walks to the
   door to start again.
10. Progress survives leaving and coming back.

**Carve moves: YES** (tile placement). **Saves:** new keys. **Depends on T9, T5.**

## T9 — A mechanic's transitions may happen in several places

**Why.** A sequence advances at its tiles and resets at its door. Today every transition of a mechanic is
given the one cell it stands on.

**Acceptance**
1. A mechanic's record carries a place per transition, and the solver resolves each to its own region.
2. A cell that works a mechanic standing elsewhere knows which mechanic and which transition it is.
3. A mechanic's state is stored once, however many cells can work it.
4. The solver's reachable states are unchanged for every mechanic that works in one place.

**Carve moves: no** for the record. **Saves:** new keys for multi-cell state. Independent.

## T10 — Several barriers on one connection, in order

**Why.** A connection may carry a gate and a one-way, or two gates of different mechanics. The author
decides the order; the carve decides the distances.

**Acceptance**
1. A connection names its barriers in order, from the first region to the second.
2. A barrier named but not defined, or defined but not placed on a connection, is an error.
3. A fork puzzle's gate is always first on its connection, checked rather than authored.
4. The carve keeps the order and chooses the spacing; a gate may stand halfway along a corridor.
5. What stands between the barriers — puzzles, chests, dressing — is the carve's to distribute.
6. The stretch between two barriers counts as its own place for the solver.
7. A floor where the player can be shut in between two barriers is refused before it is baked.

**Carve moves: YES. Saves:** new slots. **Depends on T2** for criterion 3.

## T11 — One answer for whether a door is open

**Why.** The runtime folds a gate's owners by key and the solver by boundary. They disagree on a door
naming more than one key. A floor key taking part in an `and` condition makes that door authorable.

**Acceptance**
1. One rule decides whether a door stands open, used by both the walk and the solver.
2. It is right for a door owned by any mix of mechanics and floor keys, under `and` and under `any`.
3. A carved floor with such a door is walked in a test, not only a hand-built fixture.

**Carve moves: no. Saves: no. Depends on T6**'s owner model for the door to be authorable.

## T12 — The realisation decides the drawing

**Why.** A control's encounter changes its behaviour but never what is drawn, so a torch is drawn as a
lever.

**Acceptance**
1. What a mechanic is drawn as follows from its realisation, not from a default family.
2. A torch looks like a torch, a lever like a lever.
3. A realisation with no art at some rank falls back to something chosen and stated, not to whatever
   happens.
4. Core names no mod's family.

**Carve moves: no** — prove it with the sweep that no encounter moves a wall. **Saves: YES at risk**, see
T13. Independent.

## T13 — A cell's slot must not name the family

**Why.** A mechanism's slot is `x<family>:<id>`, so binding one lock to another realisation orphans the
player's stored progress.

**Acceptance**
1. A mechanic's stored state and explored cell survive a change of realisation.
2. Two mechanics on one floor still address distinctly.

**Carve moves: no. Saves: YES** — this is a migration. **Blocks T12** from being safe.

## T14 — A lock is a reusable unit, placed from outside

**Why.** There is no lock as a thing: one `regionLayout` per floor, no reuse, no chaining, no nesting, no
binding.

**Acceptance**
1. A lock stands on its own and does not know which floor it will lie on.
2. It names roles, never realisations.
3. One lock is used on several floors without being copied. One instance per floor; two of the same
   thing on one floor is a clone with its own names.
4. Several locks on one floor, in sequence.
5. A lock inside a region of another, said from outside.
6. A nested lock counts to the host as one gate, not as all its states — assert the state count, not only
   soundness.
7. The floor's exit lies outside every lock.
8. Each role is bound to a realisation at placement; declared at floor, pyramid, journey or difficulty,
   the most specific winning.
9. An unbound role is refused. No default.
10. The binding is fixed at bake time.
11. A lock using a mechanic that is not built yet can be written and checked but not baked, and the
    refusal names the mechanic.

**Carve moves: no** by itself. **Saves:** see T13. The largest task here; split it when it is picked up.

## T15 — Two regions joined by nothing stay two regions

**Why.** The solver floods, so an unbarred connection merges them. A sequence's tiles in separate regions
collapse into one and the order cannot be seen.

**Acceptance**
1. Regions the author wrote separately stay separate in the compiled lock, barrier or no barrier.
2. A transition `at` one of them is not satisfied by standing in the other.

**Carve moves: no. Saves: no. Blocks T8** being correct.

## T16 — Every realisation of a one-way offers its prompt

**Why.** A player must never cross a one-way by accident. Only the zipline's prompt exists.

**Acceptance**
1. Every realisation of a one-way is taken through a prompt.
2. The prompt says it cannot be recrossed. It does not say where it lands.
3. A realisation with no prompt is refused at binding.

**Carve moves: no. Saves: no.** Independent.

## T17 — The carve never depends on a mod

**Why.** `forks` is core and `switches` is mod-owned. If the carve needs the mod-owned half, turning the
mod off moves the floor.

**Acceptance**
1. Every floor carves identically with the topology mod on and off; only what stands in the rooms differs. A
   missing realisation degrades on the finished carve to bare nodes and open corridors, never a refusal.
2. This holds for a floor authoring a fork-switch on authored seams (T2).

**Carve moves: no** if already true; the task is to prove it and fix it if not. **Saves: no.**

## T18 — A spent activator says so

**Why.** A lit torch is silent, so the player cannot tell "nothing here" from "already done". With four
torches on one door they cannot count what they have left.

**Acceptance**
1. A used activator is visibly used, without being touched.
2. An unused one is visibly unused.
3. It offers nothing and is walked over like ordinary ground once used.

**Carve moves: no. Saves: no.** Independent.

## T19 — Stepping onto a tile is not optional

**Why.** The puzzle of a sequence is the walk: which way through the regions, which drops to take, in
which order. A tile the player can walk round makes every order trivial, so a tile stands where it cannot
be avoided — and then the walk must know that crossing it is stepping on it. Today the solver treats every
tile move as a choice (`mechanic-contract.md` §9 item 13), so it approves a floor whose order no walk can
keep.

**Acceptance**
1. A tile stands where it cannot be walked round: every way through the stretch it stands in crosses it.
2. The solver makes a tile's transition whenever the walk enters the tile — a right step advances, a wrong
   step spoils — never as a move the player may decline.
3. A floor on which no walk keeps the order is refused before it is baked, naming the sequence.
4. A floor on which some walk keeps the order, and the door's reset is always in reach, walks sound.
5. The runtime and the solver agree: crossing a tile on the map changes the state exactly as the solver's
   entry does.

**Carve moves: YES** (tile placement, sequence floors only). **Saves: no.**

## T20 — A region barrier is realised from outside

**Why.** A flooded hall and a buried one are the same mechanic: a region barred, revealed, concealed and
reopened alike. What differs is the look, and the look is a realisation — bound where the lock is placed,
like every other role, so one lock is water in one pyramid and sand in another.

**Acceptance**
1. A region barrier's realisation (water, sand) is bound outside the lock, through the same cascade as the
   control kinds (floor, pyramid, journey, difficulty; the most specific wins), fixed at bake time.
2. A region barrier with no realisation bound is refused by name. No default.
3. A realisation names a mod that provides it; with that mod off the floor is refused by name, like a
   missing control realisation.
4. The realisation changes nothing the solver or the carve sees: same walls, same walk, whichever is bound.

**Carve moves: no. Saves: no.**

## T21 — A barred region is covered, not walled

**Why.** A region barred by water or sand reads as the stuff itself spreading over the floor, not as a
door: the player sees the first stretch going under, the blockage, and nothing past it.

**Acceptance**
1. Over a shut region barrier's region a layer of its realisation is drawn per cell, from one seamless
   texture per realisation, tinted to the floor's light.
2. From each way into the region the layer fades from transparent to full cover over a short fixed
   distance, and stays full to the blockage. The covered first stretch stays drawn, so the player sees the
   water or sand.
3. Past the blockage the region is concealed (T7).
4. When the barrier opens while the player watches, the layer fades away in a short animation and leaves
   ordinary ground.
5. A realisation whose texture is not painted yet falls back to a stated drawing, and the texture is owed
   in `docs/instructions/repaint-queue.md`.

**Carve moves: no. Saves: no. Depends on T20.**
