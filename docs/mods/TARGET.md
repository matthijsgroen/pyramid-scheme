# Mods — target state (B)

The one-page picture of where the architecture is going. If a decision isn't
here, it isn't settled — check `SLICE-CHECKLIST.md` for how a slice lands, and
`ARCHITECTURE.md` for how the pieces fit + the design guardrails.

## The shape

Three layers, each with a hard contract:

```
core/            mod-agnostic engine. ZERO references to any mod id.
  ledger/          generic bucket store + currency registry
  reachability/    keys-and-locks solver over registered currencies
  placement/       fills DSL-authored slots with registered loot
  dispatch/        encounter room -> registered family lookup
  topology/        grid/corridor/gate/chain skeleton (never mod-specific)

mods/<name>/     one standalone mechanic, registered via a descriptor.
  game/            world-gen contributions (currencies, families, rules)
  app/             UI (screens, room components)
  index.ts         the descriptor: { id, currencies?, families?, screen?, ... }
```

A mod is a **container**, registered as one unit in `registeredMods`. Fields
on the descriptor grow as slices need them — do not invent fields ahead of a
mod that uses them.

## The two rules (these are the point)

1. **Toggle-off is the acceptance gate.** A slice is done when its mod is
   removed from `registeredMods` and `yarn generate-world` + the app still
   build and run — just without that mechanic. This is unfakeable: core
   cannot secretly depend on a mod's internals and still build without it.
   A green test suite / matching counts is **not** the gate — that only
   proves output is unchanged, which was never the goal.

2. **Structure is authored in the DSL; core fills and hard-fails.** Core
   NEVER invents topology to hit a per-mod target number. Loot-bearing nodes
   (chests) are authored in the world DSL; a node may carry a soft
   `prefers: <currency>` hint, but that is only a ranking boost — **any**
   loot-bearing node can hold **any** capped currency. Placement spreads a
   currency's total across all available loot nodes, preferring tagged ones.
   The target count is the **owning mod's** intent (lives in the mod, not
   core). If a mod's demand exceeds total loot-node capacity, the **build
   fails** with a message telling the author to add loot-bearing capacity.
   No auto-distributor, no "spread the remaining budget across pyramids,"
   no dedicated per-currency side-paths.

## What "mod-agnostic core" means concretely

Core owns *mechanisms*; mods own *meaning*.

- Core places "a capped currency instance" — it does not know `mosaicPiece`
  from `hieroglyphFragment`.
- Core dispatches "an encounter family" — it does not know `sumplete` from
  `arithmeticReflex`.
- Core carries a ledger bucket — it does not know `health` heals or `money`
  buys.
- Rule 2's corollary: core has no `WORLD_TARGETS.mosaicPieceRewards`, no
  `emitMosaics`/`emitMapPiece`, no `computeMosaicPaths`. Those are per-mod
  numbers a mod-agnostic core must not hold — the target count moves into
  the owning mod (e.g. the mosaic currency's `totalRequired`).

## Route

Vertical slices, one mod fully to target at a time, each ending in a
toggle-off proof. NOT a horizontal "make all of core generic first" rewrite —
that shape has no unfakeable checkpoint and already drowned one session.

Order (only slice 1 is locked; later slices re-planned after mosaic proves
the pattern):

1. **mosaic** — reference implementation. Pure capped filler, nothing gates
   on it, so toggle-off can't break reachability. Proves: capped placement,
   mod-owned screen, the descriptor + toggle mechanism, and rule 2 (authoring
   mosaic slots in the DSL, deleting `computeMosaicPaths`).
2. **tableau / hieroglyph** — first *gating* capped currency. The hard
   toggle-off: core's keys-and-locks solver must tolerate a gating currency
   simply not existing.
3. **trap** — perks (grant/consume split), consumables, HUD widgets,
   consequence-on-fail.
4. **shop** — money, depends on puzzle/core economy output.
5. **`siteAssembler` core-loop rewrite** — last, once the model is proven on
   real slices. `Distribution` primitive replaces `trapped`/`puzzleFamily`/
   `lastMainPuzzleFamily`.

## Frozen until the module goal lands

Off the critical path, do not extend:

- Phase-4 uncapped loot (sellables/consumables: max-% occupancy + drop rate)
- Filler-loot fill-the-rest generalization
- Slot capacity (a `Slot` holding several items, e.g. shop stock)

## Naming note

The doc's original `mods/hieroglyph` is `mods/tableau` in code today (the
encounter family owns the currency). Whether the hieroglyph currency earns
its own mod (it has a dedicated Collection screen — the "second stakeholder"
signal) is a slice-2 decision, deferred until mosaic sets the pattern.
