# Mod architecture

How the game is split into a mod-agnostic **core** (mechanisms) and a set of
**mods** (meaning), and the systems a mod plugs into. This is the reference for
_how the pieces fit_ — the goals one-pager is in `TARGET.md`, the placement
design in `distribution-primitive-design.md`.

## The two invariants

1. **Core is mod-agnostic.** Core owns _mechanisms_; mods own _meaning_. Core
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

### Design guardrails (mod boundaries & typing)

- **When a currency earns its own mod:** promote it when a _second independent
  consumer_ appears OR it earns a _dedicated screen_ — whichever comes first, not
  before. Until then it rides an existing mod.
- **Toggling is a diagnostic, not a production requirement.** On/off exists for demo
  builds and a new mod's WIP feature-flag lifecycle. Only the single shipping
  mod-combo must ever be fully solvable; core is not hardened with a runtime
  graceful "missing dependency" system for arbitrary combos. Toggle-off proves
  _isolation_ (a mod left no residue), which is why it's the acceptance gate — not
  that every subset ships.
- **What stays closed vs. open in the type system:** keep `Tier`, `GateType`,
  `KeyColor` as closed literal unions (core structure). Open only _family ids_ and
  _currency ids_ (mods coin them) — `TreasureReward` is `{ type: string } &
Record<string, unknown>`, validated per-type by owner-registered zod schemas at
  boot. Prefer a codegen'd union over bare `string` where exhaustiveness matters.
  Don't open everything: the boundary is "what mods extend," nothing more.

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
  tags, icon, color, `rewardPriority` (0–100 fill priority) + `rewardCapacity`
  (reward-slot count, 1 for an ordinary node, 6 for a shop). World-gen reads this;
  it never imports the React component. Metas reach it via `MOD_FAMILY_META`
  (descriptor-contributed) merged with a direct list in
  `src/mods/allFamilyMeta.ts`.
- **App** (`FamilyPlugin` in `src/app/families/familyRegistry.ts`): the `generate`
  function + React `Component`. Each mod's app entrypoint (`mods/<id>/app`,
  side-effect-imported by `src/mods/registerModApps.ts`) self-registers its own
  family plugins, gated on `isModEnabled`.

The site assembler maps an authored encounter tag to a family
(`resolveEncounter`) and renders it, or — when a family isn't registered — falls
through to a pass-through that resolves the room generically. So a room whose mod
is off is never a dead end.

### Authoring: node selectors

Which encounter sits at which position on a path is authored as _placement intent_,
not a per-case hardcoded field. A section/floor constraint carries
`nodes?: NodeSelector[]` (on both `FloorConstraint` and `SideSectionConstraint`),
each `{ where, encounter }`:

- `where`: `"first" | "last" | number | { every: number; from?: number }`
  (positions 1-based); `encounter`: a family id/tag or list of them.
- Resolves at build time to `encountersByIndex?: Record<number, string | string[]>`
  on the section — `{ where: "last" }` → `encountersByIndex[N-1]`. This replaced the
  old one-off `lastMainPuzzleFamily` field: adding a placement rule is now authoring,
  not a new code field.
- Conflict rule: **later selector in the array wins** (author controls order — e.g.
  an `{ every: 2 }` sweep then an explicit `{ where: "last" }` override).
- Per-node loot follows the resolved family: a slot's `rewardPriority` is
  `familyPriorityFor(encountersByIndex[k] ?? sectionEncounter)`, so a weight-0 node
  (trap) mid-chain is loot-ineligible while its neighbours bear loot — this is the
  per-node half of the §A.3 eligibility join, delivered.

The crocodile capstone (`nodes: [{ where: "last", encounter: "capstone" }]`) is the
first real use; the grammar generalizes to every-nth / specific-index / role-lists on
any path. **Extension — gate-injection (designed, not built):** the same selector can
carry a gate — `{ where: n, encounter: "gate", gate, end?, endReward? }` — to place a
key-gate mid-path. It's deferred because a mid-_main_-path gate is a bigger change:
gates today live only on side sections, so splitting a linear chain reopens the maze
assembler (`initPuzzleChains` + routing the continuation) and adds a new frontier shape
to the §E reachability worklist (winnability + "a key is never behind its own gate"
must hold per injected gate). The gate node bears no loot; its reward attaches to the
gate's target. The grammar extends cleanly (`gate?` on the same `NodeSelector`), so
shipping family-swap first doesn't foreclose it.

### Reward claiming — handlers + contributions

Two seams, so core never sees a mod's state:

- `rewardHandlerRegistry.ts` maps a `TreasureReward` type to display text/emoji + an
  optional `apply(reward, ctx)` for effects on CORE state only (`ctx` =
  `progression`, `inventory`, `journeyId` — no mod state).
- `rewardContributions.ts` — a mod registers a HOOK returning its reward `effects`
  (state writes reading the mod's own hooks) + an optional `canAccept` (e.g. a full
  consumable pack refuses one). `useMergedRewardContributions` merges every
  contribution in a stable order.

`useApplyReward` runs the core handler's `apply` plus the merged mod effects; the
site-map screen uses `canAccept` for the pack-full pickup guard. One claim seam,
shared by chest claims, puzzle-solve rewards, and shop purchases — core names no mod.

### Perks — contribution seam

Perks (stat bonuses + detector levels) are DERIVED from the tomb treasures held, and
owned by the mod whose gameplay they touch — core names none. Nothing is banked in save
state: the tomb-treasure mod registers `registerEarnedPerks(() => Perk[])`
(`src/app/SiteMap/perkContributions.ts`), folding its held ward keys through
`TREASURE_PERKS`, and each owning mod reads the merged list via
`useMergedEarnedPerks()` and folds its own values with `perkLevel` / `perkStacks`
(`src/game/perkTotals.ts` — max for tiered perks, count for stacking ones). Because the
level is recomputed on every read, moving a perk to a different treasure retunes every
existing save at once; a banked number would only reach players who claimed afterwards.
It also removes the class of bug where a key granted by some other path (the dev menu)
arrives without its perk. `registerPerkContribution(() => ({ describe }))` remains for
the Collection's bonus label: `describe(perk)` returns the first owner's translated
label (undefined if none). Payload is an open descriptor `{ type, level? }` — each mod
coins its own perk ids, no shared union. Perk MEANING lives with its owner: trap owns
max-health / armor / trap-insight / pack-mule / consumable-detector (`useTrapProgress`),
hieroglyph owns compass, puzzle owns scribes-eye (`usePuzzleProgress`), core owns only
corridor-detection (`mods/core/app/index.ts`). Detector levels read
through a parallel merged accessor `useMergedDetectorLevels()`
(`src/app/SiteMap/detectorLevels.ts`: compass←hieroglyph, supplies←trap, corridor←core)
and the compass hunt target through `useCompassTarget()`
(`src/app/SiteMap/compassTarget.ts`), so `DetectorPanel` names no mod. The old
`perkRegistry` / `registerPerks` (registered at boot, never read) are deleted. Full
design: `collection-and-detector-design.md` §7.

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
3. **Dynamic** — the mod-owned distributions fill the rest through
   `allocateDistributions`, which offers loot-eligible slots in **reward-priority**
   order — chests before puzzles; each `Slot.rewardPriority` comes from its
   encounter family. Trap consumables take expert+ puzzle slots; the shop's
   money+junk take what remains, chests first. Each provider places its own
   count; the lowest-priority leftovers stay empty.

The unifying shape (`slotAllocator.ts`) is a **Distribution**: `footprint`
(how many slots) + `eligible` (which) + `rank` (priority) + `fill` (the mod bakes
the reward). Core allocates; the mod fills — it never rolls a variant.

### Mod-owned runtime state

`src/app/state/useModState.ts` is a generic persisted slice keyed per mod
(`pyramid-scheme-mod-<id>`), independent of core `ProgressionState`. A mod's
Component uses it for state that is neither a ledger currency nor a perk (e.g. a
reveal-animation counter, a health + consumable pack).

### Screens, HUD widgets, collection sections

Three parallel component registries a mod pushes into, so core UI iterates and
names no mod:

- `src/app/pages/screenRegistry.ts` — full-screen pages; `Base.tsx` renders the
  registered screens (e.g. the mosaic screen) beside core's Travel/Collection.
- `src/app/SiteMap/hudRegistry.ts` — site-map HUD widgets, ordered; `SiteMapScreen`
  renders them (e.g. the trap health + consumable widget).
- `src/app/pages/collectionSectionRegistry.ts` — Collection-screen sections.

Each contributed component reads its own mod state via hooks, so core imports none
of them. A mod registers these in its app entrypoint (below).

### App entrypoint + manifest

Each mod has an app-side entrypoint (`src/mods/<id>/app`, React) separate from the
React-free descriptor. It self-gates on `isModEnabled` and registers the mod's
screen, HUD widgets, and reward contributions into the registries above.
`src/mods/registerModApps.ts` side-effect-imports the entrypoints — the app-side
enumeration point. Core UI reads the registries and never imports a mod: `src/app`
and `src/game` contain no `isModEnabled("<mod>")` branch and no `@/mods/<name>`
import.

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
`registerCurrencies` (descriptor `currencyMeta` loop + core currencies) and
`registerRewardHandlers` (core reward display/apply). Each mod's app entrypoint
(`registerModApps` → `mods/<id>/app`) registers ALL its app contributions — family
plugins, screen, HUD widget, reward contribution, perk contribution, detector
level/target, Collection section — self-gated on `isModEnabled`. After boot the
registries are populated; a mod absent from `REGISTERED_MODS` registered nothing.

### Per encounter — runtime (`SiteMapScreen`)

1. The screen holds the live core state hooks (`useProgression`, `useInventory`,
   `useJourneys`) and the merged reward contributions — it does not call any mod
   hook directly.
2. The site assembler turns the baked config into a room grid; `resolveEncounter`
   maps each encounter tag to a registered family.
3. Entering an encounter room: the family's `generate(seed, ctx)` produces the
   puzzle, its `Component` renders. If the family isn't registered (mod off), the
   absence pass-through resolves the room instead.
4. On solve/claim: `useApplyReward` runs the core handler's `apply` (core state)
   plus the merged mod reward effects (each closing over its own mod state) — so a
   consumable's `addConsumable` happens without core knowing trap exists.
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

Non-gating puzzle families: `sumplete`, `balance-scale`, `futoshiki`, `lightbeam`,
`eclipse`, `constellation`, `star-battle`, `twin-stars`, `hidato`. Domain metas + app
plugins.

### trap (`src/mods/trap`)

The hazard mechanic, and everything that spends health — including the `crocodile`
capstone, a puzzle whose wrong step bites (crocodile.md §6). Descriptor: the
`arithmetic-reflex` family, a `consumables`
`ConsumableSpec` (density + rarity + expert+-only eligibility), and `currencyMeta`
for `health`. App: the challenge component, `TrapFamilyShell` (the warning/attempt/
disarm lifecycle), and `useTrapProgress` — the mod-owned health + consumable-pack
state (`useModState`) with its damage/heal/carry-cap methods. Health and
consumables are trap's alone.

### shop (`src/mods/shop`)

The money economy: the Fez shop encounter family (`fez-shop`), where junk sells
for money and money buys stock. Shop-owned money + junk placement + the economy
guard are the sell/buy sides of one mechanic. A shop is a node with
`rewardCapacity` 6: the currency mods place stock into its `rewards[]` on the
`slot.encounter === "fez-shop"` join (`shopStock`), trap fills the leftovers with
finite consumables, and the shop prices every slot (`shop/game/pricing.ts`) — the
mods stay money-blind. Stock is finite (no restock): the economy guard proves
`income ≥ total buyable`, so a player who buys everything can still afford every
progression-gating piece — unlimited stock would break that guarantee.

### tombTreasure (`src/mods/tombTreasure`)

Owns `mapPiece` (a gating currency found in pyramids, unlocks a tomb's entry) and
`tombKey` (positional tomb content harvested by reachability). **Deliberately one
mod, not two:** they are a single interdependent loop — enter a tomb with map
pieces, leave with the keys that gate the next — so they toggle as one unit. A
root mod that stays on in production (like `puzzle`): it owns the tomb-key/mapPiece
gating, so toggling it off leaves authored gates unsatisfiable (an isolation test,
not a shippable combo). The structural flags `hasMapPieceBranch`/`emitMapPiece`
stay in core intentionally — they name no reward type, only _where a branch exists_.
