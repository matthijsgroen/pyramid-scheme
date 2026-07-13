# Design — app-side mod plugins (the clean cut)

Status: **design, not yet built.** Companion to `ARCHITECTURE.md` (as-built) and
`TARGET.md` (goals). The gaps this closes are tracked in `TODO.md`.

## Problem

Invariant 1 says core is mod-agnostic, and the *world-gen* half achieves it
(`src/worldGen` names no mod; contributions inject via `generateWorld`). The
*app* half does not. Core UI names and imports specific mods:

- `Base.tsx` — `import { MosaicPage }` + `{isModEnabled("mosaic") && <MosaicPage/>}`.
- `SiteMapScreen.tsx` — `import { useTrapProgress }` + `{isModEnabled("trap") && …HUD…}`.
- `applyReward.ts` / `rewardHandlerRegistry.ts` — `ApplyCtx.trapProgress: TrapProgressAPI`.
- `registerRewardHandlers.ts` — `if (isModEnabled("hieroglyph"))`, `if (isModEnabled("trap"))`.

So `rm -rf src/mods/trap` breaks core compilation and leaves dead
`isModEnabled("trap")` branches. Toggle-off "still builds with the entry removed
from `REGISTERED_MODS`" only proved a weaker property: core is *mod-aware but
tolerant*, not mod-agnostic.

**Encounters already do it right** — a family is a plugin (`generate` +
`Component`) in a registry; core renders "the family for this tag" and names no
family. This design generalizes that pattern to the other app contributions
(screens, HUD, reward effects).

## What "clean cut" means

Core *logic, UI, and types* name no mod and import no mod. A mod is deletable:
remove its folder + its manifest line(s), and nothing in core changes.

Enumeration is allowed — a **manifest** that lists mod ids is expected and fine
(it is not core logic). Today enumeration is scattered across many files
(`REGISTERED_MODS`, `registerAllFamilies`, `registerAllCollectionSections`,
`Base.tsx`, `SiteMapScreen.tsx`, `registerRewardHandlers.ts`). The target is
**two manifests only**: the game descriptor list and one app-entrypoint list.

## The two mod entrypoints

A mod already has a React-free descriptor (world-gen imports it). Add an app-side
entrypoint (only the app imports it):

```
src/mods/<id>/index.ts   game descriptor (React-free): currencies, family metas,
                         consumables → REGISTERED_MODS → world-gen.
src/mods/<id>/app.tsx    app registration (React, side-effect): registers this
                         mod's family plugins, screen, HUD widgets, reward
                         effects, and collection section into core registries.
```

An **app manifest** (`src/mods/registerModApps.ts`) side-effect-imports each
mod's app entrypoint; it is the app-side enumeration point. Each entrypoint
**self-gates its registrations on `isModEnabled`** — the check lives in the mod,
never in core — so removing a mod from `REGISTERED_MODS` (a single line) drops its
screen/HUD/effects while the manifest import stays harmless. Deleting the folder
additionally drops the manifest import line. This mirrors the family-plugin
pattern (plugins self-gate, imported by an aggregator).

As-built note: the family and collection-section aggregators
(`registerAllFamilies`, `registerAllCollectionSections`) still exist alongside
`registerModApps`; folding all three into the per-mod entrypoints (one manifest)
is remaining tidiness. It does not affect the clean-cut property, which is about
core naming/importing no mod — already met once screens/HUD/effects moved out.

Deleting a mod: remove `src/mods/<id>/`, its `REGISTERED_MODS` line (import +
array entry), and its `registerModApps` import. Core is untouched.

## The app registries (generic, core-owned, name no mod)

| Registry | Status | A mod registers | Core renders/uses |
|----------|--------|-----------------|-------------------|
| family | exists | `{ meta, generate, Component }` | the family for an encounter tag |
| collection section | exists | a section `Component` | all sections on the Collection screen |
| **screen** | new | `{ id, navLabel, icon, Component }` | the nav + routes iterate registered screens |
| **HUD widget** | new | a HUD `Component` (+ order) | the site-map HUD row renders registered widgets in order |
| **reward effect** | exists, but core-populated → mod-populated | the effect for a reward `type` | dispatched when that reward is claimed |

Screens and HUD widgets are plain React components: each uses its own hooks
internally (mosaic screen calls `useMosaicProgress`; the trap HUD widget calls
`useTrapProgress`). Core renders them by iterating a registry — it never imports
`MosaicPage` or `useTrapProgress`.

## The reward-effect crux

A reward handler is `apply(reward, ctx)` — a plain function, so it cannot call
`useTrapProgress`. That is why core currently threads `ctx.trapProgress` (the
leak). Two clean options:

- **A (recommended): mod-contributed effect hooks.** A mod registers a hook that
  returns its reward effects, e.g. `registerRewardEffects(() => { const trap =
  useTrapProgress(); return { consumable: r => trap.addConsumable(r.consumable) } })`.
  The site-map screen calls `useModRewardEffects()`, which iterates the registry
  and invokes each contributed hook in a **stable order** (the registry is
  populated at module load, so the order is fixed — rules-of-hooks safe), merging
  the effects into the dispatch map. The effect closes over the mod's live state;
  core threads nothing mod-specific and `ApplyCtx.trapProgress` disappears.
- **B: effects as components.** Model a claim as rendering the owning mod's
  claim-component (like an encounter). Heavier; only worth it if effects need to
  render UI, which they don't today.

Recommendation: **A**. It mirrors how the HUD widget already reaches mod state
(its own hook), just for the non-visual claim path.

## Migration map (each current leak → its target home)

- `Base.tsx` mosaic screen → **screen registry**; `Base` iterates, drops the
  `MosaicPage` import + `isModEnabled` gate. (Smallest first step — proves the
  screen registry.)
- `SiteMapScreen` trap HUD → **HUD-widget registry**; the trap widget (owning
  `HealthDisplay` + `ConsumableBar`) lives in `mods/trap/app` and calls
  `useTrapProgress` itself. `SiteMapScreen` drops the import + gate.
- `registerRewardHandlers` hieroglyph/trap handlers → each mod's `app.tsx`
  registers its own reward effect; core keeps only genuinely-core effects (map
  piece — until a tomb-treasure mod owns it). `ApplyCtx` drops `trapProgress`.
- `registerAllFamilies` + `registerAllCollectionSections` → folded into
  `registerModApps` (each mod's `app.tsx` does its own family + section
  registration).

## Non-goals

- The game-side descriptor + world-gen injection is already clean — untouched.
- The encounter family registry is the proven pattern — reused, not rebuilt.
- Not a bundler-level dynamic-import scheme; static side-effect imports in one
  app manifest are enough for the clean-cut property.
