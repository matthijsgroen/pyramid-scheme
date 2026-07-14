# Design-fidelity audit — docs vs as-built (2026-07-14)

Five locked/settled design docs matched against the actual code by independent auditors.
Every finding below was **verified in code** (file:line) or by a **toggle-off build test**. Findings
are grouped by **root cause** because the same gap surfaced from several docs at once.

Legend — classification: `contract-violation` (code contradicts a locked contract) ·
`shortcut-as-done` (a shortcut left/presented as complete, not labelled deferred) ·
`deferred-labelled` (the doc's own fine-print admits it — acceptable, listed for the map) ·
`stale-doc` (doc describes something the code has moved past).

---

## The one-line verdict

The **scaffolding is real** (descriptor/registry/allocator primitive exist; mosaic is a genuine
clean slice; world-gen production code imports no mod). But the **runtime mechanics for hieroglyph,
trap, shop, and the tomb puzzles still live in core**, with mods acting as thin wrappers — so the
toggle-off gate passes only in its weakest reading ("it compiles"), not its intent ("the mechanic
is gone"). And one shipped-looking system (treasure perks) is entirely inert.

---

## A — Mechanics live in core; mods are thin wrappers  ·  HIGH (systemic)

The biggest gap, surfaced by TARGET, ARCHITECTURE, and app-plugins docs. TARGET: "core owns
mechanisms, mods own meaning"; ARCHITECTURE §Layers: "`src/worldGen` and `src/game` name no mod".
Reality: the mechanic code is core; the mod imports it back.

- Puzzle generation/state for tableau, crocodile, sumplete lives in `src/game/puzzles/{tableau,
  crocodile,sumplete}/`; mods import it (`src/mods/hieroglyph/app/plugin.tsx:4` imports
  `generateRewardCalculation` from `@/game/puzzles/tableau`; `src/mods/puzzle/app/*/plugin.tsx`
  import `@/game/puzzles/*`).
- Trap config in core `src/game/traps/trapConfig.ts`; trap UI `src/app/SiteMap/TrapWarningScreen.tsx`
  imported only by `src/mods/trap/app/TrapFamilyShell.tsx:5`.
- Tableau/crocodile UI in core `src/app/TombLevel/TombPuzzle.tsx` + `ComparePuzzle.tsx`; the
  hieroglyph mod wraps core's `TombPuzzle` (`plugin.tsx:6,50`).

Classification: `contract-violation`. Toggle-off build test confirms the effect — see §B.

### A.2 — Legacy tomb render path re-renders a toggled-off mechanic  ·  HIGH  ·  `shortcut-as-done`
`src/App.tsx:43` mounts `TombExpedition`, which renders `ComparePuzzle` (crocodile) unconditionally
(`TombExpedition.tsx:95,159`) and injects `TombPuzzle` (tableau) via `SiteMapScreen`'s `renderPuzzle`
escape hatch (`:108-129`), which fires exactly when no family is registered (`SiteMapScreen.tsx:135,
180`). So with **hieroglyph toggled off**, tableau still renders; crocodile never routes through the
family registry at all. The code admits it (`SiteMapScreen.tsx:178`: "The legacy tomb `renderPuzzle`
path … still owns the render"). The tomb-interior doc (§8) says this legacy path is "retired in full"
— it is not.

---

## B — Toggle-off gate passes only in its weakest reading  ·  HIGH

Build test — remove each mod from `REGISTERED_MODS`, run `yarn generate-world` + `yarn build`:

| Mod off | generate-world | build | baked residue |
|---|---|---|---|
| mosaic | ok (0 placed) | ok | **none — clean** |
| hieroglyph | ok (0/294 frags) | ok | 40 `encounter:"tableau"` (by design) |
| trap | ok (0 consumables) | ok | 167 `encounter:"trap"` (by design) |
| shop | ok (0 money) | ok | **13 `shopPrice` literals still baked** |

All four compile. But mosaic is the **only** mod that leaves *no* mechanic behind — because it is the
only one whose mechanic isn't wired into a core runtime path (§A). "Just without that mechanic" is
not met for hieroglyph/trap/shop at runtime.

---

## C — Dynamic loot bypasses the `Distribution` primitive  ·  HIGH  ·  `contract-violation`  ·  ✅ FIXED (push 1, 2026-07-14)

> **Resolved.** money/junk/consumables are now real `Distribution`s (`footprint`/`eligible`/`rank`/
> `fill`) run through `allocateDistributions`; the mod's `fill` owns variants/rarity/completeness.
> Eagerness = `FamilyMeta.rewardWeight` stamped on each slot (fill-order, encounter-sourced);
> `emptyFraction` is a real core knob. `MoneySpec`/`JunkSpec`/`ConsumableSpec`/`dynamicLoot.ts`
> deleted. Money+junk = one `shopMoneyEconomy` distribution with a `[totalBuyable, 1.5×]` budget
> (deliberate economy rebalance). Toggle-off + guard verified. See `distribution-primitive-design.md`
> "As-built refinements". Original finding below, for the record.


`distribution-primitive-design.md` (locked): everything placed is a
`Distribution {footprint,eligible,rank,fill}`; "core allocates, the mod fills — core never rolls a
variant, never knows rarity or completeness"; "money validates by footprint only". Marked
"Increment 1 … landed".

- The primitive (`slotAllocator.ts:allocateDistributions`) is used for **capped currencies only**
  (`placeFragments.ts:242`). Money/junk/consumables run a **parallel** hand-written pass,
  `assignDynamicLoot` (`placeFragments.ts:247` → `dynamicLoot.ts`), on ad-hoc
  `MoneySpec`/`JunkSpec`/`ConsumableSpec` — no `footprint`/`eligible`/`rank`/`fill`.
- **Core rolls the junk variant and owns completeness** (`dynamicLoot.ts:112` picks the item;
  `:113-117` the ≥1-of-each hard-fail) — the exact inverse of "the mod fills". No `fill()` hand-off
  exists for any dynamic loot; core also bakes money and consumables via `slot.assign` directly.
- **Money has no footprint** — `MoneySpec = { fraction }` (`dynamicLoot.ts:19`;
  `shop/game/loot.ts:8`), placed as `round(n*fraction)` with no min and no hard-fail.
- **Eagerness is a core `Record<Slot["kind"],number>` in `JunkSpec`**, not sourced from encounters.
  Note: `FamilyMeta.rewardWeight` (treasure 100 / puzzle 60 / trap 0 / shop 0 / gate 0,
  `familyMeta.ts`) is the *designed* encounter-owned eagerness home, and is **declared but never
  consumed** by the allocator.

This is the gap that this session's Slice 4 (`MoneySpec`/`JunkSpec`) entrenched rather than fixed.
(The keys-and-locks doc reads the same `dynamicLoot` as "phase 4 shipped" because its only ask was
that uncapped loot *exist* — both true; the distribution-primitive doc's stronger "must be a
Distribution" contract is the one violated.)

---

## D — Reward vocabulary **and state** leak into core  ·  HIGH  ·  `contract-violation`  ·  ✅ FIXED (2026-07-14)

> **Resolved.** `TreasureReward` is now an open `{ type: string } & Record<string, unknown>`; core
> enumerates no reward/currency id. Per-type zod schemas (owner-registered) validate every placed
> reward at boot (`rewardSchemas.ts` `validatePlacedRewards`). Effects/display/state all moved to
> the owning mods (fragments → `useHieroglyphProgress`/useModState; ledger generic; `ConsumableType`/
> `rollConsumable` → trap; serializer generic; `pieceIndex`/capping → hieroglyph finalize; mod-baked
> data rides a generic `modExports` channel). Runtime path verified clean; world byte-identical.
> Residual `"consumable"` naming is confined to the consumable-detector path (a later detector
> slice). Original finding below.


ARCHITECTURE invariant 1: "core never enumerates the currency ids that exist". app-plugins:
"remove a mod's folder + manifest line, nothing in core changes."

- Reward **types** enumerated in core: `TreasureReward` union `siteTypes.ts:8-10`
  (`mosaicPiece`/`hieroglyphFragment`), reward handlers `registerRewardHandlers.ts` (money, sellable,
  mosaicPiece, hieroglyphFragment all core-`apply()`d — only trap's consumable *effect* moved to the
  mod).
- Mod **state** in core: `useProgression.ts` — `DEFAULT_LEDGER={money,mosaicPiece}` (`:29`), trap
  perks (`:8,19,23`), hieroglyph fragment state (`:67-71`, imports `hieroglyphRequired` `:3`);
  `useJourneys.ts:21,23` `disabledTraps`/`purchasedShops`/`trapTool`; `useDetector.ts:16-19` scans
  for `hieroglyphFragment`; `rewardHandlerRegistry.ts:10` `CONSUMABLE_EMOJI{bandage,oil,trapTool}`.

Consequence: `rm -rf src/mods/mosaic` leaves `mosaicPiece` named in `siteTypes.ts`,
`registerRewardHandlers.ts`, `useProgression.ts` — "delete a mod, core untouched" is false. This is
the "reward-vocabulary leak" the handover calls one deferred gotcha; the audit shows it's broader
(state + logic, not just display names) and is contradicted by three separate locked docs.

---

## E — Ward/tomb keys never migrated to the solver  ·  HIGH  ·  `contract-violation` + `stale-doc`

`keys-and-locks-solver.md` intro + §Relationship: ward-key placement "plugs into this solver as
data like every other key type" via `pipe(rankBy(weightedTierTarget(...)), rankBy(lootPriority))`;
`WARD_MIX` is "superseded, not a separate mechanism". Reality: ward keys are **excluded** from the
solver (`allCurrencyDistributions.ts:8`), emitted as construction-time literals
(`configBuilder.ts:167-168`), and validated by a **separate post-hoc reachability re-implementation**
`validateDiscovery` (`validate.ts:149-195`) — which the doc's Open section says is "not needed". The
named rankers `weightedTierTarget` and `lootPriority` **do not exist** in code (the real rankers are
bespoke `byPoolScore`). Map pieces and hieroglyphs *were* migrated; ward keys are the holdout.

---

## F — Treasure perks are dead but shipped-looking  ·  CRITICAL  ·  `stale-doc`/`shortcut-as-done`

`pyramid-interior-design.md` §1 + §14 present a full 40-treasure perk economy (max-health, armor,
trap-insight, pack-mule, compass, detector, detection, scribe's-eye) with per-perk "Implementation
notes", nothing marked deferred. Reality: `applyTreasurePerk` is a **no-op**
(`useProgression.ts:134`); the `tombKey` handler calls it (`registerRewardHandlers.ts:43`) but nothing
happens; `TrapFamilyShell.tsx:12` confirms armor/trap-insight are 0. `perkRegistry.ts`/`registerPerks.ts`
exist but their `bump` is never invoked. Base health stays 6 forever. Only tier-unlock + location-key
(via `addTombKey`/`discoverTomb`, not the perk path) are live. The doc reads as a shipped system.

---

## G — Tomb interior half-built  ·  MEDIUM  (overlaps A.2)

`pyramid-interior-design.md` §8. Enabling plumbing added, behavior not wired:
- **Crocodile last-floor-only, not per-floor** (`shortcut-as-done`): doc says "every floor gets one";
  `configBuilder.ts:159,195` still hardcodes `isLast && hasCroc`. The `FloorConstraint` field the doc
  said to add *was* added (`dsl.ts:88`) but never used to author per-floor crocs. 8 crocs total, all
  on last floors; starter tomb has none.
- **Fez shop floor-0-only** (`built-diverges-from-doc`): doc shows a shop on every floor; shop
  branches authored only on floor 0 of non-starter tombs (`spec/expert.ts:92-101`), none in starter.
- **Tomb persistence not applied** (`deferred-labelled`, but §8 main body claims done): tombs excluded
  from `isInteriorPyramid` (`useJourneys.ts:98`) → reseed + increment `completionCount` every visit;
  the opposite of "never regenerates".
- **Trap hard-block holdout** (`deferred-labelled`): `canAttemptTrap` still hard-blocks at ≤1 heart
  (`trapHealth.ts:2`, `TrapFamilyShell.tsx:31`); doc says "gating is soft everywhere".

---

## H — Concrete latent bug: shop family meta double-registered  ·  MEDIUM  ·  `contract-violation`

`FEZ_SHOP_META` is contributed by the shop descriptor (`shop/index.ts:18` → `MOD_FAMILY_META`) **and**
hardcoded in the legacy list (`allFamilyMeta.ts:19`). It appears twice in `ALL_FAMILY_META`; toggling
shop off drops only the descriptor copy, so fez-shop stays in world-gen dispatch + `resolveKeyRequirements`.
A registered mod's meta does not fully drop. (Fix is small and worth doing regardless.)

Related: `puzzle` is a mod-shaped folder but **not** in `REGISTERED_MODS`; its plugins call
`registerFamily` **ungated** (unlike every other mod) — a mod in name only (`shortcut-as-done`/`stale-doc`).

---

## I — Stale-doc nits (LOW, no code fault)

- `app-plugins-design.md` header says "not yet built" while its body + code are as-built; entrypoint
  path documented as `app.tsx` but is `app/index.ts`; "each entrypoint self-gates on isModEnabled"
  stated universally but core/puzzle are (correctly) ungated.
- `keys-and-locks-solver.md` Open bullets call phase-3 (capped/mosaic) and phase-4 (uncapped loot)
  "pending"/"not designed" — both shipped. `filterBy` combinator defined, used by no rule. A soft
  `console.warn` on hieroglyph under-coverage lingers (`serializer.ts:269`) though a hard throw now
  precedes it.
- `TARGET.md` "The shape" prescribes a `src/core/` tree that doesn't exist (core is `worldGen`+`game`+`app`).
- `distribution-primitive-design.md` as-built names slot kinds "chest/trap/gate" that aren't in
  `Slot["kind"]` (only `end`/`puzzle`); `emptyFraction` narrated as a core knob but deferred (YAGNI).
- `collection-and-detector-design.md` §6 cites `registerAllCollectionSections.ts` (deleted; folded
  into per-mod entrypoints).

---

## Recommended sequencing (proposal, not yet agreed)

1. **Distribution primitive completion (§C)** — make money/junk/consumables real `Distribution`s
   with `footprint {min,max}` + mod `fill`; consume `FamilyMeta.rewardWeight` as encounter eagerness.
   Retire `MoneySpec`/`JunkSpec`/`assignDynamicLoot`. (This is the "full push" already chosen.)
2. **Reward vocabulary + state extraction (§D)** — move reward types/handlers/state to owning mods so
   "delete a mod, core untouched" becomes true. Unblocks clean toggle-off for hieroglyph/trap/shop.
3. **Mechanic extraction (§A/§A.2)** — move `src/game/puzzles/*` + tomb render path ownership to mods;
   kill the legacy `renderPuzzle`/`ComparePuzzle` bypass.
4. **Ward-key solver migration (§E)** and **perk system decision (§F — build or delete the doc claim)**.
5. **Tomb-interior finish (§G)** + **double-registration fix (§H)**.
6. **Doc reconciliation (§I)** — fold into each slice as it lands; do not batch.

Notably §C and §D are the prerequisites for the toggle-off gate to mean what the docs say.
