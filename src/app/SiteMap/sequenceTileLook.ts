import type { TileStatus } from "@/game/sequence"

/** The glyph's colour on a sequence tile, which is the whole of how a tile shows its state: dark before it
 * is walked, light blue walked in order, red walked out of order. The blue and the red sit far apart in
 * lightness as well as hue, so the two read apart without colour vision. */
export const sequenceTileLook: Record<TileStatus, string> = {
  unwalked: "#2b2116",
  inOrder: "#9edcff",
  outOfOrder: "#b3261a",
}
