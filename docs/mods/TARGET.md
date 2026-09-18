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

Core owns _mechanisms_; mods own _meaning_.

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

## Approach

Vertical slices — one mod fully to target at a time, each ending in a toggle-off
proof — not a horizontal "make all of core generic first" rewrite (that shape has
no unfakeable checkpoint). Per-slice steps live in `docs/mods/SLICE-CHECKLIST.md`.

## How the boundary is held while it is still being built

Two `no-restricted-imports` rules in `eslint.config.js`: core (`src/app`, `src/ui`, `src/game`,
`src/data`, `src/worldGen`) may not import `@/mods/<name>/`, and no mod may import a sibling. Open by
design: the aggregates a mod registers itself through (`registeredMods`, `allFamilyMeta`,
`registerModApps`, `allCurrencyDistributions`), and `@/mods/core/`.

Both are warnings; `yarn lint` pins the total with `--max-warnings`, so the backlog only shrinks.
Flip to `error` and drop the pin at zero. Fix a hit by inverting the dependency — the fact moves to
the owning mod, core reads it back through a registry — never by widening the allowlist. A core spec
counts: importing a mod breaks the toggle-off gate as surely as production code.

Placement is a separate question the rules cannot see: a file under `mods/core/` that only one mod
imports belongs to that mod whichever way the arrows point. `useCelebration` moved to
`mods/puzzle/app/` on that ground. Still shared, so staying: `PuzzleFamilyShell`,
`useHintAvailability`, `puzzleState`. `keyGate` and `treasureChest` are families core registers
itself — making either a mod is a slice with its own toggle-off proof.
