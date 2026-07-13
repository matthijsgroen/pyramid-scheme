# Design — the Distribution primitive (filler-loot generalization + Slice 5 merged)

Status: draft for review, no code. Supersedes the earlier "weighted filler
providers + junk sink" draft — that was the wrong shape. Per the user's model,
filler is not a separate system: **every kind of loot is a `Distribution`** with
a footprint + placement rules, unified with the capped-currency model. This
merges Slice 3a (filler generalization, needed so consumables can be trap-owned)
with the Slice-5 `Distribution` primitive (the siteAssembler core-loop rewrite).

Driven by the trap/consumable vertical need, but the model is the world-gen core.

## The mental model (from the user)

1. The world has **X** loot slots (authored in the DSL).
2. Keys + gating currencies claim what reachability demands.
3. Capped + flexible distributions claim slots by their footprint + rules.
4. A deliberate **empty** quota (authorable % of X) is never filled — a density
   knob that yields if hard minimums don't otherwise fit.
5. **Money is a capped collectible with a *flexible* slot count** — a min/max
   footprint, hard-fail if min unmet. (No separate value check: the footprint is
   set so placing within it yields enough — value falls out. → see Economy.)
6. **Junk = per-difficulty collectibles** (merchant→starter, noble→junior, …)
   with placement rules; **≥1 of each variant required** (they're collection
   items — hard-fail if any missing); higher tier = more valuable, so economy is
   tuned by *which* junk is distributed, not by adding slots. Plus loose "spare
   change" coins.
7. **Consumables**: min/max footprint in specific areas; the **trap mod owns the
   per-item rarity** (oil/bandage/tool weights).

## The primitive — core allocates, the mod fills

Split of responsibility (the user's refinement): **core is the allocator** — it
budgets slots to each distribution (footprint + eligibility + priority), reserves
the empty quota, and hard-fails if a minimum can't be met. **The mod gets its
allocated slots and fills them itself** — so core never rolls a variant, never
knows rarity weights or completeness. This keeps core truly mod-agnostic.

```ts
type Distribution = {
  id: string                          // "mosaicPiece" | "money" | "junk" | "consumable" | …
  // How many slots core should hand this distribution. Exact for capped
  // (min===max===total); a range for money/consumables. min must cover the
  // mod's own completeness need (≥ its variant count), since the MOD guarantees
  // ≥1 of each within its allocation.
  footprint: (ctx) => { min: number; max: number }
  // Which slots core may allocate to this distribution (tier / "area" / ward
  // gating) + priority among eligible when slots are contended.
  eligible?: (slot, ctx) => boolean
  rank?: (candidates, ctx) => Slot[]
  // Core hands the mod its allocated slots (each carrying tier/area/seed
  // metadata); the mod bakes rewards into them — rolling variants by its OWN
  // rarity weights and guaranteeing its own completeness (≥1 each). Core does
  // not inspect what goes in.
  fill: (allocatedSlots: Slot[], ctx) => void
  gating?: boolean                    // true = claims via reachability worklist (phase 2)
}
```

Core owns one non-distribution concept: the **empty quota** — `emptyFraction`
(authorable, % of X), reserved before flexible fill; yields to hard minimums.

Consequence: completeness (≥1 junk/consumable each) and rarity (trap's oil/
bandage/tool weights) live **entirely inside the mod's `fill`** — core only
guarantees the mod receives ≥ `footprint.min` eligible slots (hard-fail if it
can't), and the mod's `fill` is responsible for using them to satisfy its own
completeness. If a mod needs N variants, it declares `footprint.min ≥ N`.

## Placement order (the core allocator loop)

1. **Gating** distributions (keys, mapPiece, hieroglyph) — reachability worklist
   claims exactly what unlocks the world. (Unchanged from today.)
2. **Reserve empty** = `round(emptyFraction * X)`, as a target (step 3 borrows
   from it if minimums won't fit).
3. **Allocate minimums** — core gives each remaining distribution its footprint
   `min` in eligible slots, by `rank` priority. **Hard-fail** if a `min` can't be
   met, naming the shortfall (author adds slots or lowers `emptyFraction`).
4. **Allocate toward max** — core grows each distribution toward its footprint
   `max` by rank, until slots run out. Leftover → empty.
5. **Hand off + fill** — core passes each distribution its allocated slots; the
   mod's `fill` bakes rewards, guaranteeing its own completeness + rarity. Core
   never inspects the contents.

Toggle-off: a distribution leaving the registry drops its allocation; those slots
go to the others in step 4, or to empty. Bounded, deterministic change — the gate
is "builds + hard-fail invariants hold (mins, reachability) + each present mod's
`fill` satisfied its own completeness," **not** byte-identical output (see OQ1).

## Ownership

- **mosaicPiece, hieroglyph, mapPiece** — already mod/core distributions (exact
  footprint or gating). Migrate onto the unified primitive.
- **money** — core distribution for now (flexible footprint), moves to the shop
  mod in Slice 4. "Spare change" = its low-value tail.
- **junk** — core distribution: per-difficulty sellables, `variants` = the junk
  item ids per tier (≥1 each, hard-fail), tier drives value.
- **consumable** — **trap mod** distribution: footprint per area; `toReward`
  rolls the type using trap-owned rarity weights (today's `consumableRates`).
  Trap off → no consumable distribution → those slots go to other distributions
  or empty.
- **empty** — core (the density knob).

## Economy

Per decision: **money validates by footprint only** — its `min` footprint is
authored so that placing within it (plus junk tier-value) guarantees
affordability, so there's no separate money-value validator. The current
`validateEconomyGuard` (income vs shop prices) is **subsumed**: if money's min
footprint + junk completeness are met, the economy is solvent by construction.
(Flag: confirm this fully replaces the guard, or the guard stays as a
belt-and-suspenders check during migration — Open Q3.)

## Migration / sequencing (large — this is the world-gen core)

The golden guard (byte-identical world) can hold only through the mechanical
early steps; the model change in steps 4-5 intentionally alters placement.

1. **Define `Distribution`** + the registry/aggregation (mirror
   `CAPPED_CURRENCIES`), injected via `scripts/generateWorld.ts`. No behavior
   change: wrap today's capped currencies as exact-footprint distributions.
2. **Empty quota** — add authorable `emptyFraction`; default 0 so world is
   byte-identical until authored.
3. **Money + junk as distributions** — reproduce today's money quota + junk
   sink as distributions with footprints that match current output (hold golden
   guard). Junk gains `variants` completeness (may change output → validate).
4. **Consumable distribution → trap mod** — the vertical payoff (Slice 3b hands
   off here). Trap off proof: consumable slots → other distributions/empty.
5. **Retire the old passes** — `assignPuzzleRewards` quota logic + the
   `placeFragments` junk-sink collapse into the unified loop.
6. **Fold in the siteAssembler `Distribution` rewrite** (was Slice 5) — the
   `trapped`/`puzzleFamily`/`lastMainPuzzleFamily` special-cases become
   distribution rules. (May stay a follow-on if too large.)

## Open questions

- **OQ1 — byte-identical vs validated-invariants gate.** The unified fill (step
  4) changes placement when a mod toggles (freed slots redistribute). We lose the
  "byte-identical toggle-off" proof used in slices 1-2; the gate becomes "builds +
  hard-fail invariants hold (mins, completeness, reachability) + economy solvent."
  Confirm that's the acceptable new gate for this slice.
- **OQ2 — does completeness (≥1 each junk/consumable) change the current world?**
  Almost certainly yes (today junk is random-by-tier, not completeness-guaranteed).
  So step 3 can't hold the golden guard for junk. Acceptable?
- **OQ3 — economy guard: subsume or keep?** Footprint-only money means the guard
  is redundant *if* footprints are authored correctly. Keep it during migration as
  a safety net, or delete it now?
- **OQ4 — scope: merge Slice 5 now or after?** This design *is* the `Distribution`
  primitive. Do we do the full siteAssembler rewrite (step 6) in this effort, or
  land steps 1-5 (loot distributions) and leave the encounter/topology
  distribution rewrite as its own slice?
- **OQ5 — "areas" for consumable footprint.** What defines an area (per tier? per
  path type? per pyramid vs tomb?) — needs a concrete authoring vocabulary.
