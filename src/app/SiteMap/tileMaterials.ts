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
  /** The wash lying over everything the lamp does not reach — the tier's own night, hue and all.
   *
   * IT IS THE TIER'S OWN NEAR-BLACK, AT THE ALPHA THAT LANDS ITS FLOOR ON THE SHARED TARGET. A wash is
   * a scale plus an added colour (`art × (1−a) + wash × a`), and both halves are why the night used to
   * cost so much: the scale flattens the art's own modelling, and at a floor already scaled to a third
   * the added colour is most of what is left. A near-white-grey wash at a = 0.56 took the starter floor
   * from L* 40 to 16 with 61% of its chroma gone and its hue dragged from ochre (73°) to a cold
   * magenta (330°) — which is what made a lit room read as grey mush with pale cut-outs standing in it.
   *
   * So the wash colour is the rank's own near-black (`outline`), which adds the rank's own hue rather
   * than a foreign one, and the alpha is solved per rank rather than authored: whatever lands that
   * rank's floor at L* ≈ 24. The ranks then agree on how dark a lit floor is and on how far a wall
   * steps back from it, and differ where they are meant to — starter stays ochre at C* 6.6, junior
   * ochre at 18.2, expert cold at 263°, wizard verdigris at 168°. Consistent is not flat. */
  shade: string
  /** The extra helping of that night a VERTICAL face takes, over the floor's share.
   *
   * A lamp is carried at floor level, so a wall takes its light at a glancing angle and the ground does
   * not — without that the two planes sit within a step of each other (measured: the floor→face step is
   * 9.5 in the starter art and 3.5 once the night is over both) and a room reads as a floorplan with a
   * texture change rather than as a place with walls. Solved per rank to the same 7.5 step, since the
   * art's own step varies from 6.8 to 22.7 and it is the RENDERED one the player sees. */
  faceNight: number
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
    // Mudbrick keeps the day's warmth even unlit, and a wick is not what makes a cellar warm — the
    // stone is. The cold wash that used to stand here made its point against the torch by taking the
    // ochre out of every surface in the place.
    shade: "rgba(21,17,12,0.39)",
    faceNight: 0.18,
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
    // The shallowest of the five, and sandstone gives the day's heat back all night: the warmest dark
    // in the game, and the highest alpha, because its slabs are also the palest.
    shade: "rgba(36,23,8,0.66)",
    faceNight: 0.14,
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
    // Dressed stone, deep enough that nothing of the desert gets down here. The cold one, and the one
    // rank whose night is meant to read blue — so its near-black is the blue-grey its own stone is cut
    // from rather than a wash borrowed from another rank.
    shade: "rgba(23,28,34,0.63)",
    faceNight: 0.31,
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
    // Galleries lit for ceremony rather than for work — and cut from stone dark enough that they are
    // most of the way to black before any night falls on them, so this is the lightest hand of the five.
    shade: "rgba(20,18,16,0.18)",
    faceNight: 0.17,
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
    // Verdigris and standing water. Not the absence of a lamp — the colour the place already is.
    shade: "rgba(15,35,29,0.61)",
    faceNight: 0.45,
    prop: "#8fd9bd",
    propDark: "#3f7563",
    outline: "#0f231d",
  },
}

/** The alpha of a tier's night, read back off its own wash.
 *
 * Derived rather than authored beside it, because anything that has to UNDO part of the wash needs the
 * same number the wash is drawn with, and two copies of it drift the first time one is tuned. */
export const nightAlpha = (tier: Difficulty): number =>
  Number(tierPalette[tier].shade.match(/([\d.]+)\s*\)$/)?.[1] ?? 1)

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
