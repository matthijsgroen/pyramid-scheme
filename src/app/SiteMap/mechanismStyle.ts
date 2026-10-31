import type { Tileset } from "@/game/siteTypes"

/** A look the mechanism pieces (levers, torches, plates, gates, drops…) are painted in. A nested style
 * (`light/bone`) is a variation of the one above it and falls back to it, then to `default`. */
export type MechanismStyle = "default" | "light" | "dark" | "light/bone"

/**
 * WHICH MECHANISM ART A TILESET DRAWS: one table, the designer's to change.
 *
 * The pieces are the same objects on every floor; a style only repaints them so they read against the floor
 * they stand on — a bone lever and a bone pillar to light on the cave's dark rock. A style with no drawing of
 * a piece draws the one from the style above it, and `default` is the shared art in `tiles/default/`.
 */
export const MECHANISM_STYLE: Record<Tileset, MechanismStyle> = {
  starter: "default",
  junior: "default",
  expert: "default",
  master: "light",
  wizard: "light",
  cave: "light/bone",
  sphinx: "default",
}

/** The style a cell drawn in `tileset` paints its pieces in: `override` when given (a review sheet comparing
 * styles), the tileset's own otherwise. */
export const mechanismStyleOf = (tileset: Tileset, override?: MechanismStyle): MechanismStyle =>
  override ?? MECHANISM_STYLE[tileset]

/** The styles a piece is looked up in, deepest first: `light/bone` → light/bone, light, default. */
export const styleChain = (style: string): string[] => {
  const segments = style === "default" ? [] : style.split("/")
  const chain = segments.map((_, i) => segments.slice(0, segments.length - i).join("/"))
  return [...chain, "default"]
}

/** The art folders a style's chain reads, below `tiles/`: `mechanism/<style>` for each step, then `default`. */
export const mechanismFolders = (style: string): string[] =>
  styleChain(style).map(step => (step === "default" ? "default" : `mechanism/${step}`))
