import type { CellState } from "@/game/siteTypes"
import type { Difficulty } from "@/data/difficultyLevels"

// The tier materials, in one place because two consumers need the same numbers: the renderer (for
// the wall mass, which is a solid fill rather than art, and the silhouette outline) and
// scripts/generateDummyTiles.ts (for the placeholder art itself). See
// docs/game-design/spritesheet-renderer-prep.md, "Tier art sets".
export type TierPalette = {
  /** floor: the bed under the slabs, then the slab and its two value steps — kept a single step
   * apart, so the floor recedes and the wall faces carry the depth */
  bed: string
  slab: string
  slabHi: string
  slabLo: string
  /** mortar joint */
  joint: string
  /** tier signature: cross-cell stains, wall dressing, prop trim */
  accent: string
  /** wall face gradient stops; `wallBase` doubles as the solid fill for a wall's top surface */
  wall: string
  wallTop: string
  wallBase: string
  /** freestanding props, and the near-black they are outlined in */
  prop: string
  propDark: string
  outline: string
}

export const tierPalette: Record<Difficulty, TierPalette> = {
  // A merchant's cellar is DARK: mudbrick and limestone chips, lit by the stair and a wick, not a
  // gallery of pale dressed stone. Grey-brown rather than blue-grey, and deliberately not more ochre than
  // junior — junior's sandstone has to read as the step UP in wealth, so the first rank stays neutral.
  // Settled with `yarn generate-dummy-tiles --palettes`: of the candidates it was the one that kept the
  // gold click marker legible (4.31 against the floor, where the pale grey managed 1.78), kept props
  // separate from the ground they stand on (2.08 against 1.29), and still held its wall FACE apart from
  // the floor (1.68 — better than any rank shipping before it).
  starter: {
    bed: "#544b40",
    slab: "#6c6257",
    slabHi: "#7b7166",
    slabLo: "#5f564b",
    joint: "#282219",
    accent: "#b07a3c",
    wall: "#4a4137",
    wallTop: "#736858",
    wallBase: "#2b261f",
    prop: "#a49781",
    propDark: "#5c5347",
    outline: "#15110c",
  },
  junior: {
    bed: "#b08a5c",
    slab: "#c39c68",
    slabHi: "#cfa974",
    slabLo: "#b8925f",
    joint: "#4a3520",
    accent: "#c2452c",
    wall: "#8f6a3f",
    wallTop: "#b58a55",
    wallBase: "#4a3520",
    prop: "#e0c193",
    propDark: "#9c7442",
    outline: "#241708",
  },
  expert: {
    bed: "#7d8894",
    slab: "#8d98a5",
    slabHi: "#98a3b0",
    slabLo: "#828d9a",
    joint: "#2b333d",
    accent: "#6ea08a",
    wall: "#5b6675",
    wallTop: "#7c8797",
    wallBase: "#323a46",
    prop: "#a7b2be",
    propDark: "#69737f",
    outline: "#171c22",
  },
  master: {
    bed: "#4a4640",
    slab: "#57534b",
    slabHi: "#615c53",
    slabLo: "#4e4a43",
    joint: "#25221d",
    accent: "#d9a93f",
    wall: "#3a3630",
    wallTop: "#5b554b",
    wallBase: "#201d19",
    prop: "#d9a93f",
    propDark: "#8a6a24",
    outline: "#141210",
  },
  wizard: {
    bed: "#4e7268",
    slab: "#5a8074",
    slabHi: "#658c80",
    slabLo: "#537668",
    joint: "#22423a",
    accent: "#5fd9a4",
    wall: "#3a6155",
    wallTop: "#4f7c6d",
    wallBase: "#1d3830",
    prop: "#8fd9bd",
    propDark: "#3f7563",
    outline: "#0f231d",
  },
}

// Fog is an overlay over the one material, never a second set of art: a wash per cell state, and
// nothing at all on `reachable`, which is the brightness everything else is read against.
// `fogged` never reaches the renderer — an unlit cell is not drawn (SiteMapView's litClaimOwner) —
// but the key exists so the region maps stay total over CellState.
// Kept gentle on purpose. A room takes its state cell by cell — a claimed cell borrows its owner's,
// a corridor stands on its own — so a strong wash steps 20% mid-chamber and the floor reads as
// blotchy rather than as lit. Enough to tell explored from current, not enough to look like dirt.
export const stateWash: Record<CellState, { fill: string; opacity: number } | null> = {
  fogged: { fill: "#000000", opacity: 0.75 },
  visible: { fill: "#000000", opacity: 0.12 },
  reachable: null,
  completed: { fill: "#000000", opacity: 0.2 },
}

// Corridors sit a step darker than rooms, so a room's footprint (fork and endpoint chambers
// included) still reads as a distinct place rather than a wide stretch of hallway.
export const corridorShade = { fill: "#000000", opacity: 0.14 }
