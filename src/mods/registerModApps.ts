// Side-effect: each registered mod's app entrypoint registers its app-side contributions
// (screens, and — as the clean-cut slice lands — HUD widgets and reward effects) into the core
// registries. This is the single app-side enumeration point; core UI iterates the registries and
// names no mod. Import it once, high in the app tree (Base). See docs/mods/app-plugins-design.md.
//
// A mod's entrypoint self-gates on isModEnabled, so removing a mod from REGISTERED_MODS drops its
// app contributions without editing core.
import "./mosaic/app"
