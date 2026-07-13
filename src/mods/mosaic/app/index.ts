import { registerModScreen } from "@/app/pages/screenRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { MosaicPage } from "./MosaicPage"

// Mosaic's app-side registration (side-effect). Self-gated on the mod being enabled, so removing
// mosaic from REGISTERED_MODS drops its screen — the check lives here, in the mod, never in core
// (Base renders the screen registry, naming no mod). See docs/mods/app-plugins-design.md.
if (isModEnabled("mosaic")) registerModScreen({ id: "mosaic", Component: MosaicPage })
