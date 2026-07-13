# Mod architecture

How the game is split into a mod-agnostic **core** (mechanisms) and a set of
**mods** (meaning), and the systems a mod plugs into. This is the reference for
*how the pieces fit* — the slice route and per-mod progress live in `TODO.md`,
the goals one-pager in `TARGET.md`, the placement design in
`distribution-primitive-design.md`.

## The two invariants

1. **Core is mod-agnostic.** Core owns *mechanisms*; mods own *meaning*. Core
   places "a capped currency instance" without knowing `mosaicPiece` from
   `hieroglyphFragment`; dispatches "an encounter family" without knowing
   `sumplete` from `arithmetic-reflex`; carries a ledger bucket without knowing
   `health` heals or `money` buys. **Currencies are mod-owned, not a closed core
   vocabulary** — core never enumerates the currency ids that exist. A mod is
   removable: drop it from `REGISTERED_MODS` and world-gen + app still build,
   without that mechanic.

2. **Structure is authored in the DSL; core fills and hard-fails.** Loot-bearing
   nodes are authored in the world DSL. A node may carry a soft
   `prefers: <currency>` hint — a ranking boost, not an exclusive claim; any node
   can hold any currency. Core spreads a currency's total across available nodes
   and, if demand exceeds capacity, fails the build telling the author to add
   capacity. Target counts are the owning mod's, never core's.

## Layers

```
src/worldGen/   world-gen engine (offline): DSL → sites → placement → serialize
src/game/       runtime domain (React-free): ledger, registries, site assembler
src/app/        UI: screens, the site-map runtime, reward flow
src/mods/<id>/  one mechanic as a container
  game/           React-free contributions (currencies, families, rules, specs)
  app/            UI (screens, room components, mod-owned runtime state)
  index.ts        the descriptor
```

`src/worldGen` and `src/game` name no mod. `src/mods/registeredMods.ts` is the
one file that lists mods; world-gen scripts and the app read the aggregated
contributions from it, never a mod folder directly.

## Systems

### Mod descriptor + registry
A mod is a `ModDescriptor` (`src/mods/modDescriptor.ts`) — React-free, so
world-gen scripts can import it. Fields, each optional, added as a mod needs one:

- `cappedCurrencies` — fixed-total filler currencies (phase-3 placement).
- `currencyDistributions` — gating currencies discovered on the reachability
  worklist.
- `families` — encounter-family metadata (`FamilyMeta`).
- `currencyMeta` — ledger display/ownership metadata (`CurrencyMeta`), one or many.
- `consumables` — a `ConsumableSpec` for the dynamic loot pass.

`REGISTERED_MODS` in `registeredMods.ts` is the list. It flattens the descriptors
into `CAPPED_CURRENCIES`, `CURRENCY_DISTRIBUTIONS`, `MOD_FAMILY_META`,
`CONSUMABLES`, and exposes `isModEnabled(id)`. Removing an entry drops every
contribution together — the mechanism behind invariant 1.

### World-gen injection
`src/worldGen` cannot import `src/mods`. `scripts/generateWorld.ts` is the
sanctioned crossing point: it reads the aggregated contributions and passes them
into `buildConfigs` → `placeFragments`, which take currencies / capped / a
consumable spec as parameters. Core holds no mod-specific numbers.

### Ledger + currency registry
`src/game/ledger/ledger.ts` is a generic `Record<string, number>` bucket store
(`get`/`grant`/`spend`). `currencyRegistry.ts` holds per-currency display metadata
(`CurrencyMeta`: id, ownerMod, displayName, icon, `kind: counter | capped`,
optional total, `showInCollection`). Core reads a bucket by id; the registry
supplies how to show it. Mods register their `currencyMeta` through the descriptor
loop in `src/app/state/registerCurrencies.ts`.

### Family registry + dispatch
An encounter family (a puzzle/trap/shop kind) has two halves:
- **Domain** (`FamilyMeta` in `src/game/families/familyMeta.ts`): id, ownerMod,
  tags, icon, color, `rewardWeight` (0–100 fill priority). World-gen reads this;
  it never imports the React component. Metas reach it via `MOD_FAMILY_META`
  (descriptor-contributed) merged with a direct list in
  `src/mods/allFamilyMeta.ts`.
- **App** (`FamilyPlugin` in `src/app/families/familyRegistry.ts`): the `generate`
  function + React `Component`. Plugins self-register via side-effect imports in
  `src/mods/registerAllFamilies.ts`, each gated on `isModEnabled`.

The site assembler maps an authored encounter tag to a family
(`resolveEncounter`) and renders it, or — when a family isn't registered — falls
through to a pass-through that resolves the room generically. So a room whose mod
is off is never a dead end.

### Reward-handler registry
`src/app/SiteMap/rewardHandlerRegistry.ts` maps a `TreasureReward` type to an
`apply(reward, ctx)` + display text. `ctx` (`ApplyCtx`) carries `progression`,
`inventory`, `journeyId`, and `trapProgress`. `useApplyReward` builds the context
from the live hooks; `registerRewardHandlers.ts` registers the handlers, each
gated on the owning mod. Applying a reward is one seam shared by chest claims,
puzzle-solve rewards, and shop purchases.

### Perk registry
`src/game/perks/perkRegistry.ts` maps a treasure-granted perk id to the slice +
field it bumps. `src/app/state/registerPerks.ts` registers the perks. (The grant
path is currently inert — see the perk note in `TODO.md`.)

### Placement pipeline
Offline, in `placeFragments` (`src/worldGen/placeFragments.ts`), over the slots
`collectSlots` (`slots.ts`) gathers from the built sites. A `Slot` is a
reward-placement site tagged with its floor, tier (its own section difficulty),
ward keys, and a `kind` (`end` — a path-end chest; `puzzle` — a puzzle-chain
position). Passes run in a fixed order:

1. **Gating** — the reachability worklist (`CurrencyDistribution`) places keys /
   map pieces / gating fragments so the world is solvable, into `end` slots.
2. **Capped** — the slot allocator (`slotAllocator.ts`) hands each
   `CappedCurrency` an exact-footprint set of `end` slots.
3. **Dynamic** — `dynamicLoot.ts` fills what's left: money + a mod's
   `ConsumableSpec` into puzzle slots (by a per-site quota), then junk into
   remaining slots by an **eagerness** ratio per slot kind (chest fills eagerly,
   puzzle partially), with an empty remainder.

The unifying shape (`slotAllocator.ts`) is a **Distribution**: `footprint`
(how many slots) + `eligible` (which) + `rank` (priority) + `fill` (the mod bakes
the reward). Core allocates; the mod fills — it never rolls a variant.

### Mod-owned runtime state
`src/app/state/useModState.ts` is a generic persisted slice keyed per mod
(`pyramid-scheme-mod-<id>`), independent of core `ProgressionState`. A mod's
Component uses it for state that is neither a ledger currency nor a perk (e.g. a
reveal-animation counter, a health + consumable pack).

### Collection + screens
`src/app/pages/collectionSectionRegistry.ts` lets a mod contribute a section to
the shared Collection screen; sections source their own data via hooks, so the
screen names no mod. A mod's full-screen UI is wired in `src/app/pages/Base.tsx`,
gated on `isModEnabled`.

## Lifecycle — what fires when

Three distinct phases; mod contributions enter at a different seam in each.

### Build time — `yarn generate-world` (offline, once)
1. `scripts/generateWorld.ts` reads the aggregates from `registeredMods.ts`
   (`ALL_CURRENCY_DISTRIBUTIONS`, `CAPPED_CURRENCIES`, `CONSUMABLES`,
   `resolveKeyRequirements`) — the only place mod contributions cross into
   world-gen.
2. `buildConfigs` (`configBuilder.ts`): the DSL specs (`src/worldGen/spec/*`)
   resolve to a plan; `buildSite` constructs each site's floors/sections/gates;
   `initPuzzleChains` seeds empty puzzle-reward arrays.
3. `placeFragments`: `collectSlots` gathers the slots, then the fixed passes —
   gating worklist (a reachability recompute loop until the lock queue drains) →
   capped allocator → dynamic loot (`assignDynamicLoot`). Mods' `fill` callbacks
   bake the actual rewards here.
4. Validation: `validateEconomyGuard` + reward-count checks (both derived from the
   injected currencies, so a toggled-off mod drops its expectation).
5. `serializer.ts` writes `src/data/generatedWorld.ts`. Runtime never re-runs
   placement — it reads this baked output.

### App boot — side-effect registration
`src/main.tsx` imports the registration modules for their side effects, once:
`registerCurrencies` (descriptor `currencyMeta` loop + core currencies),
`registerPerks`. Family plugins register via `registerAllFamilies` (self-gated
imports) and collection sections via `registerAllCollectionSections`, pulled in
where family resolution / the Collection screen need them. After boot the
registries are populated; a mod absent from `REGISTERED_MODS` never registered.

### Per encounter — runtime (`SiteMapScreen`)
1. The screen holds the live state hooks: `useProgression` (ledger + core
   progression), `useTrapProgress` (trap health/consumables), `useInventory`,
   `useJourneys`.
2. The site assembler turns the baked config into a room grid; `resolveEncounter`
   maps each encounter tag to a registered family.
3. Entering an encounter room: the family's `generate(seed, ctx)` produces the
   puzzle, its `Component` renders. If the family isn't registered (mod off), the
   absence pass-through resolves the room instead.
4. On solve/claim: `useApplyReward` looks up the reward handler and calls
   `apply(reward, ctx)` with `{ progression, inventory, journeyId, trapProgress }`;
   the handler writes to the ledger / progression / trap state.
5. State changes persist through `useGameStorage` / `useModState` — core state
   under its key, each mod's state under `pyramid-scheme-mod-<id>`.

## The mods

### core (`src/mods/core`)
The families every world needs regardless of mechanic: `treasure-chest` (a plain
loot room) and `key-gate` (a locked door). Domain metas + app plugins only; no
currency.

### mosaic (`src/mods/mosaic`)
A pure capped-filler currency, `mosaicPiece` — never gates progress. Descriptor:
`cappedCurrencies` + `currencyMeta`. App: its own reveal screen (`MosaicPage`) and
`useMosaicProgress` (a `useModState` reveal counter). The reference mod.

### hieroglyph (`src/mods/hieroglyph`)
The gating currency: hieroglyph fragments gate tomb tableau rooms. Descriptor:
`currencyDistributions` (the worklist currency, with its own threshold + reward→
bucket harvest), the `tableau` family, and `currencyMeta` (Collection-visible).
App: the tableau puzzle component + a Collection section. The mod folder is
`hieroglyph`; the family id stays `tableau`.

### puzzle (`src/mods/puzzle`)
Non-gating puzzle families: `sumplete` and `crocodile`. Domain metas + app
plugins.

### trap (`src/mods/trap`)
The hazard mechanic. Descriptor: the `arithmetic-reflex` family, a `consumables`
`ConsumableSpec` (density + rarity + expert+-only eligibility), and `currencyMeta`
for `health`. App: the challenge component, `TrapFamilyShell` (the warning/attempt/
disarm lifecycle), and `useTrapProgress` — the mod-owned health + consumable-pack
state (`useModState`) with its damage/heal/carry-cap methods. Health and
consumables are trap's alone.

### shop (`src/mods/shop`)
The money economy: the Fez shop encounter family (`fez-shop`), where junk sells
for money and money buys rares + consumable restock. Shop-owned money + junk
placement + the economy guard are the sell/buy sides of one mechanic.
