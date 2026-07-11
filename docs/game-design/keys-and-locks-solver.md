# The keys-and-locks solver

Status: design doc · 2026-07-11  
Companion to `docs/game-design/pyramid-interior-design.md`. Also corrects
`mods-architecture.md`'s old "Gates and ward paths — already core, no
change" conclusion, but that's a secondary note — this is primarily a
**world builder** concern, not a mods-boundary one.

This is one subsystem of the world builder, not a mod. Floor-key/tomb-key/
ward-gate placement is not one mechanism today — it's two, conflated:

**The solver (generic, world builder engine):** understands "reachability
given a set of possessed keys." It knows nothing about what a key *is*
semantically — a map fragment, a hieroglyph fragment, a ward-key treasure
are all the same shape to it: "possessing currency X's instance Y
satisfies requirement Z."

**The placement rule (per-currency, authored):** which slots are eligible
for a given currency's instances, in what order, following what
distribution policy. Today's code conflates the two: fragment/map-piece/
ward-key placement logic is hardcoded per-currency instead of being one
solver fed by per-currency rule data. (A mod that introduces its own
key-like currency would supply its own rule the same way — that's the one
place this touches the mods architecture at all.)

## The invariant the solver exists to guarantee

Reaching the highest difficulty tier (Wizard) must never be blocked. This
is the one hard requirement everything else serves — not "probably fine,"
mechanically guaranteed the same way `keyAfterGate` (`siteValidator.ts`)
mechanically guarantees a gate's key is never placed behind the gate it
opens.

## The progression ladder

Difficulty is linear: each tier is 4 pyramid journeys + 1 tomb. Collecting
a tomb's first treasure unlocks the next tier (another 4 journeys + a
tomb), and so on to Wizard. The solver's top-level goal graph is exactly
this ladder — reaching Wizard.

**The ladder is linear; reachability is not.** The solver must compute
reachability across the **whole world at once**, not tier by tier. `WARD_MIX`
(`pyramid-interior-design.md` §6) already places ward keys across tiers in
both directions — a starter treasure can gate a junior pyramid's floor, and
a wizard treasure can gate a junior one. Concretely: the player reaches
junior difficulty via starter's tier-unlock treasure; a *different* starter
treasure (key 2) gates a floor inside a junior pyramid; a fragment placed
behind *that* gate might be exactly what starter's own tableau (key 3)
needs. Reachability genuinely flows backward (deeper tiers feeding earlier
ones) as well as forward — a sequential per-tier loop cannot model that,
only one whole-world graph can.

## The placement algorithm

At every point the solver knows the **currently reachable play area** —
everything solvable given the keys the player could plausibly already
hold, computed from scratch at world-gen time (the theoretical maximum,
not a simulated playthrough). A key is never placed outside that reachable
area — this is what mechanically guarantees "never blocked," not authoring
discipline.

For each currency that also functions as an unlock condition, the solver
runs the same loop:

1. Compute the reachable play area given everything placed and possessed
   so far.
2. For each remaining instance of this key, in the currency's own priority
   order:
   - Use an authored placement preference if one exists for this specific
     instance.
   - Otherwise pick from the reachable area's available loot slots,
     filtered by that currency's own **distribution rule** (an authored
     placement policy — e.g. map fragments: prefer one per journey, never
     two in the same pyramid; hieroglyph fragments: difficulty X fragments
     go in difficulty X corridors), ranked within the eligible candidates
     by the existing generic loot-slot priority order (chests first — see
     `pyramid-interior-design.md`'s "Loot priority order").
3. Once every instance of that key is placed, whatever it unlocked becomes
   solvable — recompute the reachable play area (now bigger) and continue
   to the next blocking key.

## Worked example

**Blocker 1 — reaching the first tomb.** The tomb needs `piecesRequired`
map fragments to unlock. Compute the reachable area with zero keys placed
— the starting four journeys. Place map fragment 1: no authored
preference, so pick the highest-priority available slot (a chest) in the
reachable area. Place map fragment 2: the currency's distribution rule
("never the same pyramid as another instance") filters candidates to a
different journey; again no authored preference, pick the best slot there.
Repeat for 3 and 4. All four sit *inside* the area computed *before* any of
them existed — they can never gate themselves. The tomb is now enterable.

**Blocker 2 — the tomb's first tableau.** Reaching the tier-unlock goal
(the tomb's first treasure) is now blocked by a tableau requiring several
hieroglyph fragments. Same loop, different currency, different
distribution rule (difficulty-matched: a starter hieroglyph's fragments go
in starter pyramids/paths). Placed the same way — authored preference
first, then loot-priority ranking within the reachable area.

**Recursion.** Collecting the tomb's first treasure unlocks the next
difficulty tier — the reachable area widens (new journeys, plus newly
satisfiable ward gates inside already-visited pyramids). The whole loop
repeats one tier up, all the way to Wizard.

## Relationship to CappedPool / reward-weight / Distribution

This folds into, and supersedes the earlier separate framing of,
`CappedPool` and `mods-architecture.md` step 4's reward-weight allocator —
a `CappedPool`'s `sites`/`take()` and a key's placement rule are the same
concern: which specific instance goes where, reachability-gated.
`Distribution` (family selection per room slot) stays a separate, narrower
concern — which family renders a slot, not what unlocks it or where its
keys land.

## Open (implementation not yet designed)

- Exact data shape for a currency's "distribution rule" and how it plugs
  into the solver.
- Where the solver lives layer-wise (`src/worldGen/`, since placement is a
  world-gen-time concern, same as everything else in this document).
- How this replaces `fragments.ts`'s existing `buildPlacementInfos`/
  `collectSlots` (which already approximates this for hieroglyphs alone,
  via preferred-pool-then-fallback — not a hard reachability guarantee).
- Whether/how this exposes a *hard* validator (mirroring `keyAfterGate`)
  that fails world generation if a key ever lands outside the reachable
  area at the time it's needed — directly closes the gap raised for tomb
  tableau/fragment reachability (see `project_tomb_interior_redesign`
  memory / `pyramid-interior-design.md` §8).
