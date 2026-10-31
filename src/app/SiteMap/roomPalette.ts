import {
  DECORATION_KINDS,
  WALL_DECORATION_KINDS,
  decorationFootprint,
  type DecorationKind,
  type Tileset,
} from "@/game/siteTypes"
import { placeholderUrl, tileUrl } from "./tileAssets"

export type PaletteEntry = {
  kind: string
  layer: "prop" | "wallItem" | "ground"
  cols: number
  rows: number
  /** False when the tier has no art of its own or shared for the kind: `url` is then the placeholder. */
  painted: boolean
  url: string
}

/** Every kind a room can place, with the footprint it covers and whether the tier has painted it. */
export const roomPalette = (tier: Tileset): PaletteEntry[] => {
  const entry = (kind: string, layer: PaletteEntry["layer"], cols: number, rows: number): PaletteEntry => {
    const url = tileUrl(tier, kind)
    return { kind, layer, cols, rows, painted: url !== undefined, url: url ?? placeholderUrl(kind) ?? "" }
  }
  return [
    ...DECORATION_KINDS.map(kind => {
      const { cols, rows, ground } = decorationFootprint(kind as DecorationKind)
      return entry(kind, ground ? "ground" : "prop", cols, rows)
    }),
    ...WALL_DECORATION_KINDS.map(kind => entry(kind, "wallItem", 1, 1)),
  ]
}

const LEGEND_LAYER: Record<PaletteEntry["layer"], string> = { prop: "floor", ground: "ground", wallItem: "wallItem" }
const LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

/** The legend line a palette entry adds, on the first letter no line or drawn row of the text already uses. */
export const addLegendLine = (text: string, entry: PaletteEntry): string => {
  const taken = new Set(text.replace(/\/\/.*/g, "").split(/\s+/))
  taken.add("d")
  const letter = [...LETTERS].find(candidate => !taken.has(candidate))
  if (!letter) return text
  return `${text}${text === "" || text.endsWith("\n") ? "" : "\n"}${letter} ${LEGEND_LAYER[entry.layer]} ${entry.kind}\n`
}
