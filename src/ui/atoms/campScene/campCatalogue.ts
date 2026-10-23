import type { Difficulty } from "@/data/difficultyLevels"
import type { CampCatalogue, CampLight, CampPiece, CampPlace, CampSpot, CampSpotId, CampStep } from "./campTypes"

const FIRE = "255,150,60"

const light = (
  radius: number,
  color: string,
  mode: CampLight["mode"],
  strength: number,
  dx = 0,
  dy = 0,
  id?: string
): CampLight => ({ ...(id && { id }), dx, dy, radius, color: `rgb(${color})`, mode, strength })

// Offsets are in frame units: the fire burns in the ring's middle, about half way up the fire pit's frame.
// One hearth: the ring's small fire gives way to the big one's light once the fire is laid.
const fireGlow = (radius: number) => light(radius, "255,150,55", "flicker", 0.75, 0, -0.5, "hearth")
const OVEN = light(0.7, FIRE, "flicker", 0.8, 0.35, -0.62)
const SIGNAL = light(0.8, "255,160,60", "flicker", 0.8, 0, -0.85)

type PieceOptions = Partial<Pick<CampPiece, "dx" | "dy" | "width" | "height" | "replaces" | "lights">>

const piece = (id: string, options: PieceOptions = {}): CampPiece => ({
  id,
  dx: 0,
  dy: 0,
  width: 1,
  height: 1,
  ...options,
})

type StepOptions = Pick<PieceOptions, "replaces" | "lights"> & {
  /** A base step in a layered spot: the whole spot as one picture, hiding the base before it. */
  base?: true
  /** Not a find: ground for the spot, there once anything else in it is found. */
  given?: true
  /** The pieces a layer sits on, when that is not the base before it. */
  on?: string | string[]
  /** The growing object a layer is one stage of. */
  growth?: string
  /** A piece of the same spot this layer stands behind. */
  behind?: string
}

type StepEntry = [Difficulty, string, StepOptions?]

/**
 * One find adds one step, in the order of the "Camp loot" table in docs/game-design/camp.md: the order the
 * art is painted in, each step's square image (`src/assets/camp/<name>.webp`) adding one object to the one
 * before it.
 *
 * `frame` and `footprint` are measured from the wizard impression against the chest (271×226 px there,
 * its art filling 0.83×0.76 of its 1u frame): an object w×h px is w/271·0.83 wide and h/226·0.76 tall, its
 * footprint is that width, and its frame is the larger of the two over 0.9, the share of its square that
 * spot art fills. `x` and `y` are the anchor's offset from the fire pit's in the wizard impression (1438×2576
 * px, 1u = 326 px). All are starting values, re-measured when a spot's art lands.
 */
const spot = (id: CampSpotId, place: CampPlace, steps: CampStep[]): CampSpot => ({ id, ...place, steps })

const step = (
  [chapter, name, { base, given, on, growth, behind, ...options } = {}]: StepEntry,
  layer: boolean
): CampStep => ({
  chapter,
  pieces: [piece(name, options)],
  ...(layer && !base && { layer: { ...(on && { on }), ...(growth && { growth }), ...(behind && { behind }) } }),
  ...(given && { given }),
})

/** Bought in a fixed order, so each step's whole picture replaces the one before. */
const chain = (id: CampSpotId, place: CampPlace, steps: StepEntry[]) =>
  spot(
    id,
    place,
    steps.map(entry => step(entry, false))
  )

/** Found in any order: every step is a layer (cut by `yarn camp-layers`) unless marked `base`. */
const layered = (id: CampSpotId, place: CampPlace, steps: StepEntry[]) =>
  spot(
    id,
    place,
    steps.map(entry => step(entry, true))
  )

export const CAMP_CATALOGUE: CampCatalogue = {
  spots: [
    layered("fire", { x: 0, y: 0, frame: 1.91, footprint: 1.72 }, [
      ["starter", "stoneRing", { base: true, replaces: ["campfire"], lights: [fireGlow(2.1)] }],
      ["starter", "fire", { lights: [fireGlow(2.9)] }],
      ["starter", "cookingStones"],
      ["junior", "pot", { on: "fire" }],
      ["expert", "seatingStones"],
      ["master", "clayOven", { lights: [OVEN] }],
      ["wizard", "seatCushions", { on: "seatingStones" }],
    ]),
    layered("sleeping", { x: -0.57, y: -2.41, frame: 1.53, footprint: 1.38 }, [
      ["starter", "reedMat"],
      ["starter", "blanket", { on: "reedMat" }],
      ["starter", "windbreak"],
      // The tent stands where the windbreak stood.
      ["junior", "tent", { replaces: ["windbreak"] }],
      ["junior", "tentRug", { on: "tent" }],
      ["expert", "tentFlag", { on: "tent" }],
      // The second tent is painted only where the tent leaves it in view; the pavilion's picture repaints its edge.
      ["master", "secondTent", { on: "tent" }],
      ["wizard", "pavilion", { on: "secondTent" }],
    ]),
    layered("water", { x: 1.1, y: -0.94, frame: 1.21, footprint: 0.91 }, [
      ["starter", "gourd"],
      ["starter", "jar"],
      ["junior", "secondJar"],
      ["expert", "waterTrough"],
      // The well is painted whole (well-alone) and stands behind the gourd, the jars and the trough.
      ["master", "well", { behind: "gourd" }],
      ["wizard", "wellPulley", { on: "well" }],
    ]),
    layered("cooking", { x: -0.45, y: -1.14, frame: 1.89, footprint: 1.7 }, [
      ["junior", "tripod"],
      ["junior", "spiceRack"],
      ["junior", "breadBoard", { on: "spiceRack" }],
      // The oven's picture repainted the bread board in front of it, so it shows with the board.
      ["expert", "breadOven", { on: "breadBoard" }],
      ["master", "dryingRack"],
      ["wizard", "feast"],
    ]),
    chain("donkey", { x: -1.46, y: -0.39, frame: 1.49, footprint: 1.34 }, [
      ["junior", "halter"],
      ["junior", "donkey"],
      ["junior", "saddlebags"],
      ["expert", "cart"],
      ["master", "secondDonkey"],
      ["wizard", "paintedCart"],
    ]),
    chain("camel", { x: 1.55, y: 0.13, frame: 1.46, footprint: 1.19 }, [
      ["expert", "camel"],
      ["master", "secondCamel"],
      ["wizard", "caravanBanner"],
    ]),
    layered("mapTable", { x: 0.8, y: 0.92, frame: 1.67, footprint: 1.5 }, [
      // The map on the ground opens "Alle reizen", so like every entrance it stands from the start.
      ["starter", "map", { base: true }],
      ["expert", "table", { base: true }],
      ["expert", "compass"],
      ["master", "starMap"],
      ["master", "scrollCase"],
      ["wizard", "astrolabe", { on: "starMap" }],
      ["wizard", "reedGlobe"],
    ]),
    layered("palmGarden", { x: 2.05, y: -1.62, frame: 2.2, footprint: 0.7, bleed: 0.15 }, [
      ["expert", "bed", { base: true, given: true }],
      // One palm growing: a later stage takes the earlier one's place.
      ["expert", "seed", { growth: "palm" }],
      ["expert", "sprout", { growth: "palm" }],
      ["expert", "palm", { growth: "palm" }],
      ["master", "secondPalm"],
      // The dates hang in both palms.
      ["master", "dates", { on: ["palm", "secondPalm"] }],
      ["wizard", "lotusPlanter"],
      ["wizard", "figTree"],
    ]),
    layered("ibisPond", { x: -0.98, y: 1.83, frame: 2.46, footprint: 2.21 }, [
      // The pond itself is the fixed oasis; every step only adds to its rim and water.
      ["master", "edgeStones"],
      ["master", "papyrus"],
      ["master", "reeds"],
      ["master", "ibis"],
      ["wizard", "lotus"],
      ["wizard", "secondIbis"],
    ]),
    layered("lookout", { x: -1.62, y: -1.89, frame: 2.31, footprint: 0.87 }, [
      ["master", "post", { base: true }],
      ["master", "platform"],
      ["master", "ladder", { on: "platform" }],
      ["master", "flag"],
      ["wizard", "roof", { on: "platform" }],
      ["wizard", "signalFire", { on: "platform", lights: [SIGNAL] }],
    ]),
    layered("godStatues", { x: 1.33, y: 1.87, frame: 1.8, footprint: 1.62 }, [
      ["wizard", "thoth"],
      ["wizard", "bastet"],
      ["wizard", "anubis"],
      ["wizard", "ra"],
    ]),
    layered("starCanopy", { x: 0.65, y: -2.79, frame: 1.12, footprint: 1.01 }, [
      ["wizard", "poles", { base: true }],
      ["wizard", "cloth"],
      ["wizard", "stars", { on: "cloth" }],
      ["wizard", "planets", { on: "cloth" }],
    ]),
  ],
  fixed: [
    {
      id: "chest",
      x: -1.52,
      y: 0.4,
      frame: 1,
      footprint: 0.83,
      piece: piece("chest", { lights: [light(0.8, "255,200,80", "breathe", 0.4, 0, -0.35)] }),
    },
    {
      id: "window",
      x: 0.91,
      y: -1.92,
      frame: 1.4,
      footprint: 0.55,
      // The mosaic window stands 1.35× the chest's height in the impression.
      piece: piece("window", {
        lights: [
          light(1.3, "90,150,255", "breathe", 0.55, 0, -0.39),
          light(1.0, "255,200,120", "breathe", 0.5, 0, -0.79),
        ],
      }),
    },
    {
      id: "campfire",
      x: 0,
      y: 0,
      frame: 1,
      footprint: 0.45,
      piece: piece("campfire", {
        // Raised into the fire pit's ring: the ring that replaces it is drawn half way up a larger frame.
        dy: -0.6,
        lights: [light(2.1, "255,150,55", "flicker", 0.75, 0, -0.2)],
      }),
    },
    {
      // The oasis pool is why the camp stands here: there from the start, adorned later by the ibis pond's steps.
      id: "oasis",
      x: -0.98,
      y: 1.83,
      frame: 2.46,
      footprint: 2.21,
      piece: piece("oasis"),
    },
  ],
}
