// The single app-side manifest (side-effect). Each mod's app entrypoint registers ALL its app
// contributions — family plugins, screen, HUD widgets, reward contributions, Collection section —
// into the core registries, self-gating on isModEnabled where the mod is toggleable. Core UI reads
// the registries and names no mod; this is the one place the app enumerates mods. Import it once,
// high in the app tree (Base) and anywhere the registries must be populated (SiteMapScreen,
// Collection, tests). See docs/mods/app-plugins-design.md.
import "./core/app"
import "./mosaic/app"
import "./hieroglyph/app"
import "./puzzle/app"
import "./trap/app"
import "./shop/app"
