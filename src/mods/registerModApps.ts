// The single app-side manifest (side-effect). Each mod's app entrypoint registers ALL its app
// contributions — family plugins, screen, HUD widgets, reward contributions, Collection section —
// into the core registries, self-gating on isModEnabled where the mod is toggleable. Core UI reads
// the registries and names no mod; this is the one place the app enumerates mods. Import it once,
// high in the app tree (Base) and anywhere the registries must be populated (SiteMapScreen,
// Collection, tests). See docs/mods/app-plugins-design.md.
import "@/app/SiteMap/registerRewardHandlers" // core-owned fragmentSlot sentinel schema only
import "./core/app"
import "./mosaic/app"
import "./hieroglyph/app"
import "./puzzle/app"
import "./trap/app"
import "./shop/app"
import "./tombTreasure/app"

import { validatePlacedRewards } from "@/app/SiteMap/rewardSchemas"
import { generatedWorldConfigs } from "@/data/generatedWorld"

// Runtime replacement for the compile-time reward exhaustiveness the open TreasureReward union
// gave up: once every core + mod reward schema is registered (the imports above), assert every
// reward placed in the generated world is owned by a registered schema and satisfies it. Runs
// once at module load — the single mod-agnostic boot point (reads only the schema registry), so a
// stale/mistyped reward id surfaces loudly at boot instead of silently missing its handler.
validatePlacedRewards(generatedWorldConfigs)
