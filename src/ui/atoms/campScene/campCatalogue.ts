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

/** Where each source sits inside its step's square frame (bottom-centre anchored, dy positive-down). */
const fireGlow = (radius: number) => light(radius, "255,150,55", "flicker", 0.75, 0, -0.3)
const OVEN = light(0.7, FIRE, "flicker", 0.8, -0.3, -0.35)
const BOWL = light(0.9, "255,170,70", "flicker", 0.8, 0.3, -0.35)
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
 */
const spot = (
  id: CampSpotId,
  row: CampSpot["row"],
  slot: number,
  steps: [Difficulty, string, Pick<PieceOptions, "replaces" | "lights">?][]
): CampSpot => ({
  id,
  row,
  slot,
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
    spot("fire", 1, 0, [
      ["starter", "stoneRing", { replaces: ["campfire"], lights: [fireGlow(2.1)] }],
      ["starter", "fire", { lights: [fireGlow(2.9)] }],
      ["starter", "cookingStones", { lights: [fireGlow(2.9)] }],
      ["junior", "pot", { lights: [fireGlow(2.9)] }],
      ["expert", "seatingStones", { lights: [fireGlow(2.9)] }],
      ["master", "clayOven", { lights: [fireGlow(2.9), OVEN] }],
      ["wizard", "fireBowl", { lights: [fireGlow(2.9), OVEN, BOWL] }],
    ]),
    spot("sleeping", 0, -1, [
      ["starter", "reedMat"],
      ["starter", "blanket"],
      ["starter", "windbreak"],
      ["junior", "tent"],
      ["junior", "tentRug"],
      ["expert", "tentFlag"],
      ["master", "secondTent"],
      ["wizard", "pavilion"],
    ]),
    spot("water", 1, 1, [
      ["starter", "gourd"],
      ["starter", "jar"],
      ["junior", "secondJar"],
      ["expert", "waterTrough"],
      ["master", "well"],
      ["wizard", "wellPulley"],
    ]),
    spot("cooking", 1, -1, [
      ["junior", "tripod"],
      ["junior", "spiceRack"],
      ["junior", "breadBoard"],
      ["expert", "breadOven"],
      ["master", "dryingRack"],
      ["wizard", "feast"],
    ]),
    spot("donkey", 1, -2, [
      ["junior", "halter"],
      ["junior", "donkey"],
      ["junior", "saddlebags"],
      ["expert", "cart"],
      ["expert", "donkeyBlanket"],
      ["master", "secondDonkey"],
      ["wizard", "paintedCart"],
    ]),
    spot("camel", 1, 2, [
      ["expert", "rope"],
      ["expert", "camel"],
      ["expert", "saddle"],
      ["master", "secondCamel"],
      ["master", "camelTrough"],
      ["wizard", "caravanBanner"],
    ]),
    spot("mapTable", 2, 0, [
      ["expert", "map"],
      ["expert", "table"],
      ["expert", "compass"],
      ["master", "starMap"],
      ["master", "scrollCase"],
      ["wizard", "astrolabe"],
      ["wizard", "reedGlobe"],
    ]),
    spot("palmGarden", 0, 2, [
      ["expert", "seed"],
      ["expert", "sprout"],
      ["expert", "palm"],
      ["master", "secondPalm"],
      ["master", "dates"],
      ["wizard", "lotusPlanter"],
      ["wizard", "figTree"],
    ]),
    spot("ibisPond", 2, -2.5, [
      ["master", "hollow"],
      ["master", "pond"],
      ["master", "reeds"],
      ["master", "ibis"],
      ["wizard", "lotus"],
      ["wizard", "secondIbis"],
    ]),
    spot("lookout", 0, -2.5, [
      ["master", "post"],
      ["master", "platform"],
      ["master", "ladder"],
      ["master", "flag"],
      ["wizard", "roof"],
      ["wizard", "signalFire", { lights: [SIGNAL] }],
    ]),
    spot("godStatues", 2, 2.5, [
      ["wizard", "thoth"],
      ["wizard", "bastet"],
      ["wizard", "anubis"],
      ["wizard", "ra"],
    ]),
    spot("starCanopy", 0, 0, [
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
      piece: piece("chest", { width: 0.8, height: 0.6, lights: [light(0.8, "255,200,80", "breathe", 0.6, 0, -0.35)] }),
    },
    {
      id: "window",
      row: 0,
      slot: 1,
      piece: piece("window", {
        width: 1,
        height: 1,
        lights: [
          light(1.1, "90,150,255", "breathe", 0.55, 0, -0.4),
          light(0.9, "255,200,120", "breathe", 0.5, 0, -0.9),
        ],
      }),
    },
    {
      id: "campfire",
      row: 1,
      slot: 0,
      piece: piece("campfire", {
        width: 0.6,
        height: 0.5,
        lights: [light(2.1, "255,150,55", "flicker", 0.75, 0, -0.2)],
      }),
    },
  ],
}
