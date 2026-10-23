import type { Difficulty } from "@/data/difficultyLevels"
import type { CampCatalogue, CampLight, CampPiece, CampSpot, CampSpotId } from "./campTypes"

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
const fireGlow = (radius: number) => light(radius, "255,150,55", "flicker", 0.75, 0, -0.3)
const OVEN = light(0.7, FIRE, "flicker", 0.8, -0.3, -0.35)
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
 * spot art fills. Re-measured when a spot's art lands.
 */
const spot = (
  id: CampSpotId,
  row: CampSpot["row"],
  slot: number,
  { frame, footprint }: Pick<CampSpot, "frame" | "footprint">,
  steps: [Difficulty, string, Pick<PieceOptions, "replaces" | "lights">?][]
): CampSpot => ({
  id,
  row,
  slot,
  frame,
  footprint,
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
    spot("fire", 1, 0, { frame: 1.91, footprint: 1.72 }, [
      ["starter", "stoneRing", { replaces: ["campfire"], lights: [fireGlow(2.1)] }],
      ["starter", "fire", { lights: [fireGlow(2.9)] }],
      ["starter", "cookingStones", { lights: [fireGlow(2.9)] }],
      ["junior", "pot", { lights: [fireGlow(2.9)] }],
      ["expert", "seatingStones", { lights: [fireGlow(2.9)] }],
      ["master", "clayOven", { lights: [fireGlow(2.9), OVEN] }],
      ["wizard", "seatCushions", { lights: [fireGlow(2.9), OVEN] }],
    ]),
    spot("sleeping", 0, -1, { frame: 1.53, footprint: 1.38 }, [
      ["starter", "reedMat"],
      ["starter", "blanket"],
      ["starter", "windbreak"],
      ["junior", "tent"],
      ["junior", "tentRug"],
      ["expert", "tentFlag"],
      ["master", "secondTent"],
      ["wizard", "pavilion"],
    ]),
    spot("water", 1, 1, { frame: 1.21, footprint: 0.91 }, [
      ["starter", "gourd"],
      ["starter", "jar"],
      ["junior", "secondJar"],
      ["expert", "waterTrough"],
      ["master", "well"],
      ["wizard", "wellPulley"],
    ]),
    spot("cooking", 1, -1, { frame: 1.89, footprint: 1.7 }, [
      ["junior", "tripod"],
      ["junior", "spiceRack"],
      ["junior", "breadBoard"],
      ["expert", "breadOven"],
      ["master", "dryingRack"],
      ["wizard", "feast"],
    ]),
    spot("donkey", 1, -2, { frame: 1.49, footprint: 1.34 }, [
      ["junior", "halter"],
      ["junior", "donkey"],
      ["junior", "saddlebags"],
      ["expert", "cart"],
      ["expert", "donkeyBlanket"],
      ["master", "secondDonkey"],
      ["wizard", "paintedCart"],
    ]),
    spot("camel", 1, 2, { frame: 1.46, footprint: 1.19 }, [
      ["expert", "rope"],
      ["expert", "camel"],
      ["expert", "saddle"],
      ["master", "secondCamel"],
      ["master", "camelTrough"],
      ["wizard", "caravanBanner"],
    ]),
    spot("mapTable", 2, 0, { frame: 1.67, footprint: 1.5 }, [
      ["expert", "map"],
      ["expert", "table"],
      ["expert", "compass"],
      ["master", "starMap"],
      ["master", "scrollCase"],
      ["wizard", "astrolabe"],
      ["wizard", "reedGlobe"],
    ]),
    spot("palmGarden", 0, 2, { frame: 2.51, footprint: 1.07 }, [
      ["expert", "seed"],
      ["expert", "sprout"],
      ["expert", "palm"],
      ["master", "secondPalm"],
      ["master", "dates"],
      ["wizard", "lotusPlanter"],
      ["wizard", "figTree"],
    ]),
    spot("ibisPond", 2, -2.5, { frame: 2.46, footprint: 2.21 }, [
      ["master", "hollow"],
      ["master", "pond"],
      ["master", "reeds"],
      ["master", "ibis"],
      ["wizard", "lotus"],
      ["wizard", "secondIbis"],
    ]),
    spot("lookout", 0, -2.5, { frame: 2.31, footprint: 0.87 }, [
      ["master", "post"],
      ["master", "platform"],
      ["master", "ladder"],
      ["master", "flag"],
      ["wizard", "roof"],
      ["wizard", "signalFire", { lights: [SIGNAL] }],
    ]),
    spot("godStatues", 2, 2.5, { frame: 1.8, footprint: 1.62 }, [
      ["wizard", "thoth"],
      ["wizard", "bastet"],
      ["wizard", "anubis"],
      ["wizard", "ra"],
    ]),
    spot("starCanopy", 0, 0, { frame: 1.12, footprint: 1.01 }, [
      ["wizard", "poles"],
      ["wizard", "cloth"],
      ["wizard", "stars"],
      ["wizard", "planets"],
    ]),
  ],
  fixed: [
    {
      id: "chest",
      row: 2,
      slot: -1,
      footprint: 0.83,
      piece: piece("chest", { lights: [light(0.8, "255,200,80", "breathe", 0.4, 0, -0.35)] }),
    },
    {
      id: "window",
      row: 0,
      slot: 1,
      footprint: 0.55,
      // The mosaic window is the camp's landmark: drawn a little above its size in the impression (~0.8),
      // so the goal stays in sight.
      piece: piece("window", {
        lights: [
          light(1.3, "90,150,255", "breathe", 0.55, 0, -0.39),
          light(1.0, "255,200,120", "breathe", 0.5, 0, -0.79),
        ],
      }),
    },
    {
      id: "campfire",
      row: 1,
      slot: 0,
      footprint: 0.45,
      piece: piece("campfire", {
        lights: [light(2.1, "255,150,55", "flicker", 0.75, 0, -0.2)],
      }),
    },
  ],
}
