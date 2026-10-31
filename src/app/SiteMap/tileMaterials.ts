import type { CellState, Tileset } from "@/game/siteTypes"
import { METALS } from "@/ui/tokens/metalPalette"

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
  /** The wash lying over everything the lamp does not reach — the tier's own night, hue and all.
   *
   * It is the tier's own near-black (`outline`) at a light alpha: a wash is a scale plus an
   * added colour (`art × (1−a) + wash × a`), and a heavy one flattens the art's own modelling and drags
   * its hue toward the wash, so the night stays the lightest hand on the map and the rank keeps its own
   * hue. `yarn rank-colour` measures the result per rank and solves `faceNight` for it. */
  shade: string
  /** The extra helping of that night a VERTICAL face takes, over the floor's share.
   *
   * A lamp is carried at floor level, so a wall takes its light at a glancing angle and the ground does
   * not — without that the two planes sit within a step of each other and a room reads as a floorplan
   * with a texture change rather than as a place with walls. On a light-floored rank it shadows the face 30 L* below
   * the floor (`yarn rank-colour` solves it); a dark-floored rank lights its faces in the art instead and
   * takes 0 here. */
  faceNight: number
  /** How much of the full lamp (`LIT_STRENGTH`) this rank's torch burns at, 0–1. A lamp lifts a dark
   * room into view; in a rank whose night is already light it only bleaches the stone, so a lit rank
   * burns it low and the torch stays an accent (docs/game-design/visual-direction.md). */
  lamp: number
  /** freestanding props, and the near-black they are outlined in */
  prop: string
  propDark: string
  outline: string
}

export const tierPalette: Record<Tileset, TierPalette> = {
  // A merchant's storehouse: pale warm limestone underfoot, red ochre and turquoise as its colour
  // (docs/game-design/visual-direction.md). The floor and wall tokens are the repainted floor's and wall face's;
  // `prop` is the mean of the repainted props.
  starter: {
    bed: "#bfae8c",
    slab: "#d8c8a8",
    slabHi: "#e4d6b8",
    slabLo: "#cbb995",
    joint: "#8a7656",
    accent: METALS.starter.accent,
    wall: "#b49d74",
    wallTop: "#e6d9bd",
    wallBase: "#3d2e20",
    // The night is the lightest hand on the map, as master's is: rooms are lit and the torch is an
    // accent (docs/game-design/visual-direction.md). Its colour is the rank's own near-black.
    shade: "rgba(21,17,12,0.3)",
    faceNight: 0.55,
    lamp: 0.3,
    prop: "#694935",
    propDark: "#5c5347",
    outline: "#15110c",
  },
  // A nobleman's painted house: gold-ochre sandstone flagstones under a dark red-brown mural frieze, copper
  // and verdigris as its colour (docs/game-design/visual-direction.md). The floor and wall tokens are the
  // repainted floor's and wall face's.
  junior: {
    bed: "#9a724c",
    slab: "#bb9060",
    slabHi: "#c09664",
    slabLo: "#b28458",
    joint: "#735536",
    accent: METALS.junior.accent,
    wall: "#734931",
    wallTop: "#b58a55",
    wallBase: "#432416",
    // Rooms are lit, as the merchant's are: the night is a light hand in the rank's own near-black.
    shade: "rgba(36,23,8,0.3)",
    faceNight: 0.45,
    lamp: 1,
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
    accent: METALS.expert.accent,
    wall: "#5b6675",
    wallTop: "#7c8797",
    wallBase: "#323a46",
    // Dressed stone, deep enough that nothing of the desert gets down here. The cold one, and the one
    // rank whose night is meant to read blue — so its near-black is the blue-grey its own stone is cut
    // from rather than a wash borrowed from another rank.
    shade: "rgba(23,28,34,0.63)",
    faceNight: 0.31,
    lamp: 1,
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
    accent: METALS.master.accent,
    wall: "#3a3630",
    wallTop: "#5b554b",
    wallBase: "#201d19",
    // Galleries lit for ceremony rather than for work — and cut from stone dark enough that they are
    // most of the way to black before any night falls on them, so this is the lightest hand of the five.
    shade: "rgba(20,18,16,0.18)",
    faceNight: 0.17,
    lamp: 1,
    prop: "#d9a93f",
    propDark: "#8a6a24",
    outline: "#141210",
  },
  // The gods: a still floor holding a dimmed crimson-and-purple nebula and its stars, emerald and gold on the walls
  // and props. The floor tokens are the repainted floor's.
  wizard: {
    bed: "#211a32",
    slab: "#3a213d",
    slabHi: "#4f2843",
    slabLo: "#2a1d38",
    joint: "#14172e",
    accent: METALS.wizard.accent,
    wall: "#3a6155",
    wallTop: "#4f7c6d",
    wallBase: "#1d3830",
    // A dark floor: the night is a light hand in the sky's own near-black, so the nebula keeps its colour.
    shade: "rgba(20,23,46,0.25)",
    faceNight: 0.45,
    lamp: 1,
    prop: "#8fd9bd",
    propDark: "#3f7563",
    outline: "#0f231d",
  },
  // Bare rock: grey-brown, uncut and unlit. No rank's stone, so it borrows no rank's metal either.
  cave: {
    bed: "#554e46",
    slab: "#615951",
    slabHi: "#6b6259",
    slabLo: "#59524a",
    joint: "#2a2520",
    accent: METALS.expert.accent,
    // A dark floor, so the wall and what stands on it are on the light side of it (visual-direction.md,
    // "Light and dark floors"): pale rock catching the torch, never shadowed further.
    wall: "#ccc6ba",
    wallTop: "#d8d2c4",
    wallBase: "#1f1b16",
    // A cave has no lamps of its own and is dim before any night falls on it.
    shade: "rgba(22,19,16,0.35)",
    faceNight: 0,
    lamp: 1,
    prop: "#d8d2c4",
    propDark: "#9c968a",
    outline: "#1a1612",
  },
  // The Sphinx's inside: smooth warm limestone slabs crossed by gold horizon bands, lamplit and swept clean. The
  // floor tokens are the repainted floor's; no rank's stone, so it borrows no rank's metal either.
  sphinx: {
    bed: "#907658",
    slab: "#a58664",
    slabHi: "#aa8b67",
    slabLo: "#9b7e5f",
    joint: "#7d603c",
    accent: METALS.starter.accent,
    wall: "#b9a179",
    wallTop: "#d8c49c",
    wallBase: "#5e4c36",
    shade: "rgba(42,33,23,0.4)",
    faceNight: 0,
    lamp: 1,
    prop: "#d8c49c",
    propDark: "#a39a86",
    outline: "#2a2117",
  },
}

/** The alpha of a tier's night, read back off its own wash.
 *
 * Derived rather than authored beside it, because anything that has to UNDO part of the wash needs the
 * same number the wash is drawn with, and two copies of it drift the first time one is tuned. */
export const nightAlpha = (tier: Tileset): number => Number(tierPalette[tier].shade.match(/([\d.]+)\s*\)$/)?.[1] ?? 1)

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
