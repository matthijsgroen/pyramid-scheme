import type { Difficulty } from "@/data/difficultyLevels"
import type { CampCatalogue, CampLight, CampPiece, CampPlace, CampSpot, CampSpotId } from "./campTypes"

const FIRE = "255,150,60"

const light = (
  radius: number,
  color: string,
  mode: CampLight["mode"],
  strength: number,
  dx = 0,
  dy = 0
): CampLight => ({ dx, dy, radius, color: `rgb(${color})`, mode, strength })

/** Where each source sits inside its step's square frame, in frame units (bottom-centre anchored, dy positive-down). */
// Offsets are in frame units: the fire burns in the ring's middle, about half way up the fire pit's frame.
const fireGlow = (radius: number) => light(radius, "255,150,55", "flicker", 0.75, 0, -0.5)
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

/**
 * One find adds one step, in the order of the "Camp loot" table in docs/game-design/camp.md. A step is the
 * whole spot as one square image (`src/assets/camp/<name>.webp`) that replaces the step before it.
 *
 * `frame` and `footprint` are measured from the wizard impression against the chest (271×226 px there,
 * its art filling 0.83×0.76 of its 1u frame): an object w×h px is w/271·0.83 wide and h/226·0.76 tall, its
 * footprint is that width, and its frame is the larger of the two over 0.9, the share of its square that
 * spot art fills. `x` and `y` are the anchor's offset from the fire pit's in the wizard impression (1438×2576
 * px, 1u = 326 px). All are starting values, re-measured when a spot's art lands.
 */
const spot = (
  id: CampSpotId,
  place: CampPlace,
  steps: [Difficulty, string, Pick<PieceOptions, "replaces" | "lights">?][]
): CampSpot => ({
  id,
  ...place,
  steps: steps.map(([chapter, name, options], i) => ({
    chapter,
    pieces: [
      piece(name, {
        ...options,
        replaces: [...(i > 0 ? [steps[i - 1][1]] : []), ...(options?.replaces ?? [])],
      }),
    ],
  })),
})

export const CAMP_CATALOGUE: CampCatalogue = {
  spots: [
    spot("fire", { x: 0, y: 0, frame: 1.91, footprint: 1.72 }, [
      ["starter", "stoneRing", { replaces: ["campfire"], lights: [fireGlow(2.1)] }],
      ["starter", "fire", { lights: [fireGlow(2.9)] }],
      ["starter", "cookingStones", { lights: [fireGlow(2.9)] }],
      ["junior", "pot", { lights: [fireGlow(2.9)] }],
      ["expert", "seatingStones", { lights: [fireGlow(2.9)] }],
      ["master", "clayOven", { lights: [fireGlow(2.9), OVEN] }],
      ["wizard", "seatCushions", { lights: [fireGlow(2.9), OVEN] }],
    ]),
    spot("sleeping", { x: -0.57, y: -2.41, frame: 1.53, footprint: 1.38 }, [
      ["starter", "reedMat"],
      ["starter", "blanket"],
      ["starter", "windbreak"],
      ["junior", "tent"],
      ["junior", "tentRug"],
      ["expert", "tentFlag"],
      ["master", "secondTent"],
      ["wizard", "pavilion"],
    ]),
    spot("water", { x: 1.1, y: -0.94, frame: 1.21, footprint: 0.91 }, [
      ["starter", "gourd"],
      ["starter", "jar"],
      ["junior", "secondJar"],
      ["expert", "waterTrough"],
      ["master", "well"],
      ["wizard", "wellPulley"],
    ]),
    spot("cooking", { x: -0.45, y: -1.14, frame: 1.89, footprint: 1.7 }, [
      ["junior", "tripod"],
      ["junior", "spiceRack"],
      ["junior", "breadBoard"],
      ["expert", "breadOven"],
      ["master", "dryingRack"],
      ["wizard", "feast"],
    ]),
    spot("donkey", { x: -1.46, y: -0.39, frame: 1.49, footprint: 1.34 }, [
      ["junior", "halter"],
      ["junior", "donkey"],
      ["junior", "saddlebags"],
      ["expert", "cart"],
      ["master", "secondDonkey"],
      ["wizard", "paintedCart"],
    ]),
    spot("camel", { x: 1.55, y: 0.13, frame: 1.46, footprint: 1.19 }, [
      ["expert", "camel"],
      ["master", "secondCamel"],
      ["wizard", "caravanBanner"],
    ]),
    spot("mapTable", { x: 0.8, y: 0.92, frame: 1.67, footprint: 1.5 }, [
      ["expert", "map"],
      ["expert", "table"],
      ["expert", "compass"],
      ["master", "starMap"],
      ["master", "scrollCase"],
      ["wizard", "astrolabe"],
      ["wizard", "reedGlobe"],
    ]),
    spot("palmGarden", { x: 1.61, y: -1.62, frame: 2.51, footprint: 0.7 }, [
      ["expert", "seed"],
      ["expert", "sprout"],
      ["expert", "palm"],
      ["master", "secondPalm"],
      ["master", "dates"],
      ["wizard", "lotusPlanter"],
      ["wizard", "figTree"],
    ]),
    spot("ibisPond", { x: -0.98, y: 1.83, frame: 2.46, footprint: 2.21 }, [
      ["master", "edgeStones", { replaces: ["oasis"] }],
      ["master", "papyrus"],
      ["master", "reeds"],
      ["master", "ibis"],
      ["wizard", "lotus"],
      ["wizard", "secondIbis"],
    ]),
    spot("lookout", { x: -1.62, y: -1.89, frame: 2.31, footprint: 0.87 }, [
      ["master", "post"],
      ["master", "platform"],
      ["master", "ladder"],
      ["master", "flag"],
      ["wizard", "roof"],
      ["wizard", "signalFire", { lights: [SIGNAL] }],
    ]),
    spot("godStatues", { x: 1.33, y: 1.87, frame: 1.8, footprint: 1.62 }, [
      ["wizard", "thoth"],
      ["wizard", "bastet"],
      ["wizard", "anubis"],
      ["wizard", "ra"],
    ]),
    spot("starCanopy", { x: 0.65, y: -2.79, frame: 1.12, footprint: 1.01 }, [
      ["wizard", "poles"],
      ["wizard", "cloth"],
      ["wizard", "stars"],
      ["wizard", "planets"],
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
