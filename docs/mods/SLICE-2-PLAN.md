# Slice 2 — `hieroglyph` mod (first gating currency)

Plan: `docs/mods/TARGET.md`. Steps template: `docs/mods/SLICE-CHECKLIST.md`.
Solver spec (authoritative, NOT `_brainstorm.md`): `docs/game-design/keys-and-locks-solver.md`.

## Goal & gate

First *gating* currency taken fully to the mod-container target. Toggle-off is
the gate: remove `hieroglyphMod` from `REGISTERED_MODS` →

- `yarn generate-world` builds with the economy guard ON, world still winnable,
- app builds + runs without the hieroglyph screen/section,
- `grep -rn "hieroglyph\|tableau" src/worldGen src/game` returns nothing —
  core names no mod,

then re-add. The removal is the test, not the shipped state.

## Decisions (settled with user)

- **Mod = `hieroglyph`** (folder `src/mods/tableau/` → `src/mods/hieroglyph/`).
  Internal family/puzzle id stays `"tableau"` — renaming ripples into saved
  worlds + specs + tests for no benefit. One mod owns family + currency + screen
  section (they can't toggle independently → one toggle unit).
- **Full core genericization** — grep-clean core, not dormant refs.
- **Generic reward** — `TreasureReward`'s `hieroglyphFragment` variant →
  `{ type: "currency", bucket, instanceId }`; `mapPiece` too. Core
  harvest/serialize/display never name a mod.
- **Fragments move into the ledger** — today counts live in `useProgression`,
  separate from the `inventory` ledger. Move to ledger buckets like other
  currencies so the generic Collection renderer + toggle-off work uniformly.
- **Collection stays a shared core screen** (already renders treasures + junk +
  hieroglyphs). The hieroglyph *section* becomes driven by a registered
  `CurrencyMeta` collection-visibility flag (spec §"key role and collection
  visibility are independent"), gated so toggle-off drops it. Treasures/junk are
  inventory items, not registry currencies → stay hand-coded until the
  trap/shop slices.
- **Graceful family-absence fallback** — unregistered family → trivial
  pass-through room; authored `encounter:"tableau"` survives toggle-off without
  throwing.
- **Winnability = hard-fail fix, no separate validator.** Spec guarantees
  winnability by construction (§placement algorithm, "no separate post-hoc
  validator needed"). The bug: `placeFragments.ts:157` `if (!currency) continue`
  silently drops an unowned lock, contradicting the spec's "nothing progresses =
  hard-fail". Turn that swallow into a hard-fail. Combined with single-mod
  descriptor + family-absence fallback, the silent soft-lock becomes
  structurally impossible.

## Not in scope (spec confirms already built / later slices)

- The keys-and-locks solver itself (phases 1-2 real, worklist + composable
  distribution rules `preferThenRelax`/`uniqueBy`/`rankBy` — hieroglyph currency
  already uses them). Slice work is mod-extraction + core genericization, NOT
  the solver.
- Generic treasure/junk collection sections (their mods aren't extracted —
  trap/shop slices).
- Slot capacity, phase-4 uncapped loot — frozen per TARGET.md.

## Build sequence (one branch/PR, ~7 commits; not incrementally testable —
core is mid-genericization until the mod re-lands)

1. **Descriptor growth + registration.** `ModDescriptor` grows
   `currencyDistributions?: CurrencyDistribution[]`, `families?: GameFamily[]`
   (`{meta, generate}` game-side; React `Component` stays app-side, gated),
   widen `currencyMeta` to array, and `CurrencyMeta` grows a
   collection-visibility flag. `REGISTERED_MODS` aggregation feeds
   `ALL_CURRENCY_DISTRIBUTIONS` + `ALL_FAMILY_META`; legacy lists become derived,
   then deleted. Build the new path alongside the old first.
2. **Create `mods/hieroglyph`.** Move `mods/tableau/` → `mods/hieroglyph/`, add
   `index.ts` descriptor, register in `REGISTERED_MODS`. Move hieroglyph data
   tables out of core `data.ts` (`TOMB_SYMBOLS`, `FRAGMENT_MATRIX`,
   `HIEROGLYPH_REQUIRED`, `FRAGMENT_HOST_TIERS`) into the mod.
3. **Genericize reachability.** Drop `import HIEROGLYPH_REQUIRED`, the
   `hieroglyph:` prefix, `thresholdFor`'s hieroglyph branch, the
   `hieroglyphFragment` harvest. Registered currencies contribute
   `thresholdFor(bucket)` + reward→bucket mapping; core iterates them, names none.
4. **Generic reward.** `{type:"currency",bucket,instanceId}` across
   `siteTypes.ts`, `rewards.ts`, `serializer.ts`, and app display
   (`RewardFlow`, `rewardDisplay`, `Chest`) — switch on `type==="currency"` +
   look up `CurrencyMeta.icon`.
5. **Generic fragment-count validation.** `EXPECTED_HIEROGLYPH_FRAGMENTS` →
   derive expected counts from registered currencies; no named import in
   `validate.ts`/`generateWorld.ts`.
6. **Fragments into ledger + Collection section.** Move fragment runtime counts
   to ledger buckets; hieroglyph Collection section reads registered
   `CurrencyMeta`, gated `isModEnabled("hieroglyph")`.
7. **Family-absence fallback + hard-fail fix.** `resolveEncounter` pass-through
   for unregistered family; `placeFragments.ts:157` swallow → hard-fail.

Then: **toggle-off proof** (the gate), re-add, full suite (`yarn vitest run`),
real `generate-world` with guard ON.
