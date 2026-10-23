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

type PieceOptions = Partial<Pick<CampPiece, "dx" | "dy" | "width" | "height" | "replaces" | "light">>

const piece = (id: string, options: PieceOptions = {}): CampPiece => ({
  id,
  dx: 0,
  dy: 0,
  width: 1,
  height: 1,
  ...options,
})

/** One find adds one step: one piece, in the order of the "Camp loot" table in docs/game-design/camp.md. */
const spot = (
  id: CampSpotId,
  row: CampSpot["row"],
  slot: number,
  steps: [Difficulty, string, PieceOptions?][]
): CampSpot => ({
  id,
  row,
  slot,
  steps: steps.map(([chapter, name, options]) => ({ chapter, pieces: [piece(name, options)] })),
})

export const CAMP_CATALOGUE: CampCatalogue = {
  spots: [
    spot("fire", 1, 0, [
      ["starter", "stoneRing", { width: 0.9, height: 0.4 }],
      [
        "starter",
        "fire",
        { dy: -0.1, width: 0.6, height: 0.7, light: light(2.9, "255,150,55", "flicker", 0.75, 0, -0.2) },
      ],
      ["starter", "cookingStones", { dx: 0.35, width: 0.5, height: 0.3 }],
      ["junior", "pot", { dy: -0.3, width: 0.6, height: 0.5 }],
      ["expert", "seatingStones", { dx: -0.6, width: 0.7, height: 0.4 }],
      [
        "master",
        "clayOven",
        { dx: -0.45, dy: -0.1, width: 0.8, height: 0.9, light: light(0.7, FIRE, "flicker", 0.8, 0, -0.3) },
      ],
      [
        "wizard",
        "fireBowl",
        { dx: 0.4, width: 0.7, height: 1, light: light(0.9, "255,170,70", "flicker", 0.8, 0, -0.3) },
      ],
    ]),
    spot("sleeping", 0, -1, [
      ["starter", "reedMat", { width: 1, height: 0.3 }],
      ["starter", "blanket", { dx: 0.1, dy: -0.05, width: 0.8, height: 0.25 }],
      ["starter", "windbreak", { dx: -0.4, width: 0.6, height: 0.8 }],
      ["junior", "tent", { width: 1, height: 1, replaces: ["windbreak"] }],
      ["junior", "tentRug", { dy: -0.05, width: 0.6, height: 0.2 }],
      ["expert", "tentFlag", { dx: 0.3, dy: -0.8, width: 0.3, height: 0.4 }],
      ["master", "secondTent", { dx: 0.7, width: 0.9, height: 0.9 }],
      ["wizard", "pavilion", { dx: 0.3, width: 1, height: 1 }],
    ]),
    spot("water", 1, 1, [
      ["starter", "gourd", { dx: -0.2, width: 0.4, height: 0.4 }],
      ["starter", "jar", { dx: 0.2, width: 0.5, height: 0.7 }],
      ["junior", "secondJar", { dx: 0.6, width: 0.5, height: 0.7 }],
      ["expert", "waterTrough", { dx: -0.6, width: 0.8, height: 0.4 }],
      ["master", "well", { dy: -0.1, width: 0.9, height: 0.9 }],
      ["wizard", "wellPulley", { dy: -0.7, width: 0.6, height: 0.5 }],
    ]),
    spot("cooking", 1, -1, [
      ["junior", "tripod", { width: 0.7, height: 0.9 }],
      ["junior", "spiceRack", { dx: 0.5, width: 0.5, height: 0.7 }],
      ["junior", "breadBoard", { dx: -0.5, width: 0.5, height: 0.3 }],
      ["expert", "breadOven", { dx: 0.2, width: 0.9, height: 0.9 }],
      ["master", "dryingRack", { dx: -0.6, width: 0.7, height: 0.8 }],
      ["wizard", "feast", { dy: 0.05, width: 1, height: 0.4 }],
    ]),
    spot("donkey", 1, -2, [
      ["junior", "halter", { dx: 0.2, width: 0.3, height: 0.3 }],
      ["junior", "donkey", { width: 0.9, height: 0.9 }],
      ["junior", "saddlebags", { dy: -0.4, width: 0.5, height: 0.4 }],
      ["expert", "cart", { dx: 0.7, width: 1, height: 0.8 }],
      ["expert", "donkeyBlanket", { dy: -0.45, width: 0.5, height: 0.3 }],
      ["master", "secondDonkey", { dx: -0.7, width: 0.9, height: 0.9 }],
      ["wizard", "paintedCart", { dx: 0.7, width: 1, height: 0.8, replaces: ["cart"] }],
    ]),
    spot("camel", 1, 2, [
      ["expert", "rope", { dx: -0.3, width: 0.4, height: 0.2 }],
      ["expert", "camel", { width: 1, height: 1 }],
      ["expert", "saddle", { dy: -0.6, width: 0.5, height: 0.4 }],
      ["master", "secondCamel", { dx: 0.8, width: 1, height: 1 }],
      ["master", "camelTrough", { dx: -0.8, width: 0.7, height: 0.3 }],
      ["wizard", "caravanBanner", { dx: 0.4, dy: -0.8, width: 0.4, height: 0.7 }],
    ]),
    spot("mapTable", 2, 0, [
      ["expert", "map", { dy: -0.3, width: 0.7, height: 0.1 }],
      ["expert", "table", { width: 1, height: 0.5 }],
      ["expert", "compass", { dx: 0.3, dy: -0.5, width: 0.2, height: 0.2 }],
      ["master", "starMap", { dx: -0.2, dy: -0.5, width: 0.5, height: 0.1 }],
      ["master", "scrollCase", { dx: 0.5, dy: -0.1, width: 0.2, height: 0.6 }],
      ["wizard", "astrolabe", { dx: 0.1, dy: -0.5, width: 0.4, height: 0.4 }],
      ["wizard", "reedGlobe", { dx: -0.6, width: 0.5, height: 0.6 }],
    ]),
    spot("palmGarden", 0, 2, [
      ["expert", "seed", { width: 0.2, height: 0.2 }],
      ["expert", "sprout", { width: 0.3, height: 0.4, replaces: ["seed"] }],
      ["expert", "palm", { width: 0.8, height: 1, replaces: ["sprout"] }],
      ["master", "secondPalm", { dx: 0.7, width: 0.8, height: 1 }],
      ["master", "dates", { dy: -0.8, width: 0.3, height: 0.2 }],
      ["wizard", "lotusPlanter", { dx: -0.7, width: 0.6, height: 0.4 }],
      ["wizard", "figTree", { dx: 1.4, width: 0.9, height: 1 }],
    ]),
    spot("ibisPond", 2, -2.5, [
      ["master", "hollow", { width: 1, height: 0.3 }],
      ["master", "pond", { width: 0.9, height: 0.25 }],
      ["master", "reeds", { dx: 0.4, width: 0.4, height: 0.7 }],
      ["master", "ibis", { dx: -0.3, dy: -0.1, width: 0.4, height: 0.6 }],
      ["wizard", "lotus", { dx: 0.1, dy: -0.1, width: 0.3, height: 0.2 }],
      ["wizard", "secondIbis", { dx: 0.1, dy: -0.1, width: 0.4, height: 0.6 }],
    ]),
    spot("lookout", 0, -2.5, [
      ["master", "post", { width: 0.2, height: 1 }],
      ["master", "platform", { dy: -0.8, width: 0.8, height: 0.2 }],
      ["master", "ladder", { dx: 0.3, width: 0.3, height: 0.8 }],
      ["master", "flag", { dx: -0.3, dy: -1, width: 0.3, height: 0.4 }],
      ["wizard", "roof", { dy: -1, width: 1, height: 0.4 }],
      [
        "wizard",
        "signalFire",
        { dy: -0.8, width: 0.3, height: 0.4, light: light(0.8, "255,160,60", "flicker", 0.8, 0, -1) },
      ],
    ]),
    spot("godStatues", 2, 2.5, [
      ["wizard", "thoth", { dx: -0.9, width: 0.5, height: 1 }],
      ["wizard", "bastet", { dx: -0.3, width: 0.5, height: 1 }],
      ["wizard", "anubis", { dx: 0.3, width: 0.5, height: 1 }],
      ["wizard", "ra", { dx: 0.9, width: 0.5, height: 1 }],
    ]),
    spot("starCanopy", 0, 0, [
      ["wizard", "poles", { width: 1, height: 1 }],
      ["wizard", "cloth", { dy: -0.9, width: 1, height: 0.3 }],
      ["wizard", "stars", { dy: -0.9, width: 0.8, height: 0.3 }],
      ["wizard", "planets", { dy: -0.9, width: 0.6, height: 0.3 }],
    ]),
  ],
  fixed: [
    {
      id: "chest",
      row: 2,
      slot: -1,
      piece: piece("chest", { width: 0.8, height: 0.6, light: light(0.8, "255,200,80", "breathe", 0.6, 0, -0.35) }),
    },
    {
      id: "window",
      row: 0,
      slot: 1,
      piece: piece("window", { width: 1, height: 1, light: light(1.1, "90,150,255", "breathe", 0.55, 0, 0.1) }),
    },
    {
      id: "campfire",
      row: 1,
      slot: 0,
      piece: piece("campfire", { width: 0.6, height: 0.5, light: light(2.1, "255,150,55", "flicker", 0.75, 0, -0.2) }),
    },
  ],
}
