# Design — app-side mod plugins (the clean cut)

Design of the app-side mod-plugin seams — the *clean cut* that makes core UI name
and import no mod. Companion to `ARCHITECTURE.md` (the as-built mod-system anchor).

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
(it is not core logic). This target is now reached: enumeration lives in **two
manifests only** — the game descriptor list (`REGISTERED_MODS` in
`src/mods/registeredMods.ts`) and one app-entrypoint list (`registerModApps.ts`,
which side-effect-imports each `mods/<id>/app`). The old scattered aggregators
(`registerAllFamilies`, `registerAllCollectionSections`) are gone — folded into the
per-mod app entrypoints.

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

Each mod's `app` entrypoint registers all its contributions (family plugins,
screen, HUD, reward contribution, Collection section); `registerModApps` imports
the entrypoints — the sole app-side manifest.

Deleting a mod: remove `src/mods/<id>/`, its `REGISTERED_MODS` line (import +
array entry), and its `registerModApps` import. Core is untouched.

## The app registries (generic, core-owned, name no mod)

| Registry | A mod registers | Core renders/uses |
|----------|-----------------|-------------------|
| family | `{ meta, generate, Component }` | the family for an encounter tag |
| collection section | a section `Component` | all sections on the Collection screen |
| screen | `{ id, navLabel, icon, Component }` | the nav + routes iterate registered screens |
| HUD widget | a HUD `Component` (+ order) | the site-map HUD row renders registered widgets in order |
| reward effect | the effect for a reward `type` | dispatched when that reward is claimed (mod-populated) |

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

Chosen: **A**. It mirrors how the HUD widget already reaches mod state (its own
hook), just for the non-visual claim path.

## Non-goals

- The game-side descriptor + world-gen injection is already clean — untouched.
- The encounter family registry is the proven pattern — reused, not rebuilt.
- Not a bundler-level dynamic-import scheme; static side-effect imports in one
  app manifest are enough for the clean-cut property.
