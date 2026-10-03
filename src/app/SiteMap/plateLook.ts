import type { TileStatus } from "@/game/sequence"

/** What each way a tile can stand looks like: a stone slab, a lit green one with a tick, a red one with a
 * cross. The tick and the cross are drawn shapes, so the three read apart without colour. */
export const plateLook: Record<TileStatus, { fill: string; stroke: string; ink: string }> = {
  unwalked: { fill: "#2a2418", stroke: "#8a7a5a", ink: "#b8a878" },
  inOrder: { fill: "#16301a", stroke: "#60c080", ink: "#a8e8b8" },
  outOfOrder: { fill: "#3a1410", stroke: "#e05a3a", ink: "#f0a090" },
}
