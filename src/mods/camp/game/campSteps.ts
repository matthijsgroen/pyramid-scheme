import type { Difficulty } from "@/data/difficultyLevels"
import { difficulties } from "@/data/difficultyLevels"

// Where each step of the camp comes from. Every step of the ui's camp catalogue has exactly one source:
//   found      a find lying in the world, one pick-up is one step
//   structure  built from named parts lying in the world; it stands once every part is in
//   grows      comes by itself on a homecoming, after the steps it `growsFrom` stand
//   bought     sold by the shop (a later phase)
//   fixed      there from the start
//   given      ground for its spot, there once anything else in the spot is
// A step's tier is the tier of the puzzle slots its find or parts lie on. The order the art is painted in
// is the catalogue's business and never a game rule.
export type CampSource = "found" | "structure" | "grows" | "bought" | "fixed" | "given"

// `spot` is the catalogue's spot id as a plain string: the domain layer does not import the ui's types.
export type CampStepEntry = {
  id: string
  spot: string
  tier: Difficulty
  source: CampSource
  parts?: readonly string[]
  growsFrom?: readonly string[]
}

export type CampStepTable = readonly CampStepEntry[]

// How many parts a structure may have, per tier: the more a tier carries, the more a structure there takes.
export const PART_BANDS: Record<Difficulty, { min: number; max: number }> = {
  starter: { min: 2, max: 3 },
  junior: { min: 2, max: 3 },
  expert: { min: 3, max: 4 },
  master: { min: 4, max: 6 },
  wizard: { min: 4, max: 6 },
}

export type CampUnit =
  | { kind: "find"; step: CampStepEntry; tier: Difficulty }
  | { kind: "part"; structure: CampStepEntry; part: string; tier: Difficulty }

const duplicates = (ids: readonly string[]): string[] => [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]

export const campStepProblems = (table: CampStepTable): string[] => {
  const problems: string[] = []
  const sourceOf = new Map(table.map(entry => [entry.id, entry.source]))
  for (const id of duplicates(table.map(entry => entry.id))) problems.push(`step "${id}" appears more than once`)
  for (const entry of table) {
    if (entry.source === "structure") {
      const parts = entry.parts ?? []
      const band = PART_BANDS[entry.tier]
      if (parts.length === 0) problems.push(`structure "${entry.id}" has no parts`)
      else if (parts.length < band.min || parts.length > band.max)
        problems.push(
          `structure "${entry.id}" has ${parts.length} parts, ${entry.tier} allows ${band.min} to ${band.max}`
        )
      for (const part of duplicates(parts)) problems.push(`structure "${entry.id}" has part "${part}" twice`)
    } else if (entry.parts !== undefined) problems.push(`step "${entry.id}" is not a structure but has parts`)
    if (entry.source === "grows") {
      if (entry.growsFrom === undefined || entry.growsFrom.length === 0)
        problems.push(`growing step "${entry.id}" names no step it grows from`)
      else
        for (const from of entry.growsFrom)
          if (!sourceOf.has(from)) problems.push(`growing step "${entry.id}" grows from unknown step "${from}"`)
          else if (sourceOf.get(from) === "given" || sourceOf.get(from) === "bought")
            problems.push(`growing step "${entry.id}" grows from "${from}", which is ${sourceOf.get(from)}`)
    }
  }
  return problems
}

export const campDemand = (table: CampStepTable): Record<Difficulty, { finds: number; parts: number }> => {
  const demand = Object.fromEntries(difficulties.map(tier => [tier, { finds: 0, parts: 0 }])) as Record<
    Difficulty,
    { finds: number; parts: number }
  >
  for (const unit of campUnits(table)) demand[unit.tier][unit.kind === "find" ? "finds" : "parts"] += 1
  return demand
}

// Every unit the world must carry, in table order: a find is one unit, a structure is one unit per part.
export const campUnits = (table: CampStepTable): CampUnit[] =>
  table.flatMap((entry): CampUnit[] => {
    if (entry.source === "found") return [{ kind: "find", step: entry, tier: entry.tier }]
    if (entry.source === "structure")
      return (entry.parts ?? []).map(part => ({ kind: "part", structure: entry, part, tier: entry.tier }))
    return []
  })

type Row = [id: string, tier: Difficulty, parts?: readonly string[], growsFrom?: readonly string[]]
const S = "starter"
const J = "junior"
const E = "expert"
const M = "master"
const W = "wizard"

const rows = (spot: string, source: CampSource, entries: Row[]): CampStepEntry[] =>
  entries.map(([id, tier, parts, growsFrom]) => ({
    id,
    spot,
    tier,
    source,
    ...(parts && { parts }),
    ...(growsFrom && { growsFrom }),
  }))

// Part counts by tier: 2 / 3 / 3 / 4 / 5. Part ids are unique within their structure.
export const CAMP_STEPS: CampStepTable = [
  ...rows("fire", "found", [
    ["pot", J],
    ["seatCushions", W],
  ]),
  ...rows("fire", "structure", [
    ["stoneRing", S, ["fieldStones", "sandBed"]],
    ["fire", S, ["tinder", "acaciaLogs"]],
    ["cookingStones", S, ["flatStone", "supportStones"]],
    ["seatingStones", E, ["smoothBoulders", "sandstoneBlock", "hewnSlab"]],
    ["clayOven", M, ["ovenFloor", "firebricks", "smokeHole", "copperGrate"]],
  ]),
  ...rows("sleeping", "found", [
    ["reedMat", S],
    ["blanket", S],
    ["tentRug", J],
    ["tentFlag", E],
  ]),
  ...rows("sleeping", "structure", [
    ["windbreak", S, ["reedBundles", "stakes"]],
    ["tent", J, ["tentPoles", "wovenCloth", "tentPegs"]],
    ["secondTent", M, ["largeCloth", "ridgePole", "guyRopes", "woolFloor"]],
    ["pavilion", W, ["pavilionPosts", "linenCanopy", "hangingCurtains", "woolRugs", "woodenFloor"]],
  ]),
  ...rows("water", "found", [
    ["gourd", S],
    ["jar", S],
    ["secondJar", J],
  ]),
  ...rows("water", "structure", [
    ["well", M, ["wellStones", "rope", "bucket", "windlass"]],
    ["wellPulley", W, ["pulleyWheel", "frame", "hoistRope", "counterweight", "leatherBucket"]],
  ]),
  ...rows("water", "bought", [["waterTrough", E]]),
  ...rows("cooking", "found", [
    ["spiceRack", J],
    ["breadBoard", J],
  ]),
  ...rows("cooking", "structure", [
    ["tripod", J, ["tripodPoles", "binding", "hook"]],
    ["breadOven", E, ["mudBricks", "clayPlaster", "ovenLid"]],
    ["dryingRack", M, ["rackPoles", "crossbar", "wickerTray", "cords"]],
    ["feast", W, ["lowTable", "breadBaskets", "roastDuck", "beerJars", "fruitBowl"]],
  ]),
  ...rows("donkey", "bought", [
    ["halter", J],
    ["donkey", J],
    ["saddlebags", J],
    ["cart", E],
    ["secondDonkey", M],
    ["paintedCart", W],
  ]),
  ...rows("camel", "bought", [
    ["camel", E],
    ["secondCamel", M],
    ["caravanBanner", W],
  ]),
  ...rows("mapTable", "found", [
    ["compass", E],
    ["starMap", M],
    ["scrollCase", M],
    ["astrolabe", W],
    ["reedGlobe", W],
  ]),
  ...rows("mapTable", "structure", [["table", E, ["tableTop", "trestles", "leatherStraps"]]]),
  ...rows("mapTable", "fixed", [["map", S]]),
  ...rows("palmGarden", "found", [
    ["seed", E],
    ["secondPalm", M],
    ["figTree", W],
  ]),
  ...rows("palmGarden", "structure", [
    ["lotusPlanter", W, ["clayTub", "nileSilt", "waterJar", "lotusTubers", "stoneRim"]],
  ]),
  ...rows("palmGarden", "grows", [
    ["sprout", E, undefined, ["seed"]],
    ["palm", E, undefined, ["sprout"]],
    ["dates", M, undefined, ["palm", "secondPalm"]],
  ]),
  ...rows("palmGarden", "given", [["bed", E]]),
  ...rows("ibisPond", "found", [
    ["papyrus", M],
    ["reeds", M],
    ["lotus", W],
  ]),
  ...rows("ibisPond", "structure", [["edgeStones", M, ["riverStones", "clayBedding", "gravel", "boundaryStakes"]]]),
  ...rows("ibisPond", "grows", [
    ["ibis", M, undefined, ["reeds"]],
    ["secondIbis", W, undefined, ["ibis", "lotus"]],
  ]),
  ...rows("lookout", "found", [["flag", W]]),
  ...rows("lookout", "structure", [
    ["post", M, ["postTrunk", "footStones", "wedges", "braces"]],
    ["platform", M, ["platformBeams", "platformPlanks", "lashingRope", "edgeRail"]],
    ["ladder", M, ["ladderRails", "rungs", "groundPegs", "leatherLoops"]],
    ["roof", M, ["roofPoles", "thatch", "clayLayer", "bindingGrass"]],
    ["signalFire", W, ["fireBasin", "pitch", "dryBrushwood", "flint", "bellows"]],
  ]),
  ...rows("godStatues", "found", [
    ["thoth", W],
    ["bastet", W],
    ["anubis", W],
    ["ra", W],
  ]),
  ...rows("godStatues", "given", [["statueBench", W]]),
  ...rows("starCanopy", "found", [["cloth", W]]),
  ...rows("starCanopy", "structure", [
    ["poles", W, ["masts", "cornerStones", "stayLines", "bigPegs", "poleSockets"]],
    ["stars", W, ["goldLeaf", "needleThread", "indigoDye", "chalk", "stencils"]],
    ["planets", W, ["ochre", "copperDiscs", "lapisPowder", "hangingLoops", "dividers"]],
  ]),
]
