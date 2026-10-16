import type { FloorConfig } from "@/game/siteTypes"
import { freeRegions } from "@/game/lockAuthoring"
import { parseLock } from "@/game/lockNotation"
import { MARK_GLYPHS } from "@/game/mark"

type Control = NonNullable<FloorConfig["controls"]>[number]
type Layout = NonNullable<FloorConfig["regionLayout"]>

const region = (name: string) => ({ name, appetite: "free" as const })

const plates = (steps: string[], overrides: Partial<Extract<Control, { control: "sequence" }>> = {}): Control => ({
  id: "plates",
  control: "sequence",
  steps: steps.map(name => ({ in: name })),
  resetAt: "vaultDoor",
  opens: { done: ["vaultDoor"] },
  ...overrides,
})

const floor = (layout: Layout, controls: Control[], chains: number[], doorBetween: [string, string]): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: chains.map(pathPuzzles => ({ pathPuzzles, difficulty: "expert", end: "treasure" })),
  regionLayout: layout,
  obstacles: [{ id: "vaultDoor", kind: "gate", at: { on: "connection", between: doorBetween } }],
  controls,
})

const hallAndAnnex: Layout = {
  regions: [region("mouth"), region("hall"), region("annex"), region("vault")],
  connections: [
    ["mouth", "hall"],
    ["hall", "annex"],
    ["hall", "vault"],
  ],
  in: "mouth",
  out: "vault",
}

/** The contract's own example: a tile in the vault, which only the sequence's own door opens onto. */
export const contractExampleFloor = (): FloorConfig =>
  floor(
    {
      regions: [region("mouth"), region("hall"), region("vault")],
      connections: [
        ["mouth", "hall"],
        ["hall", "vault"],
      ],
      in: "mouth",
      out: "vault",
    },
    [plates(["hall", "vault", "mouth"])],
    [],
    ["hall", "vault"]
  )

/** A step in an annex off the hall, then one at the mouth the floor starts in; the sequence opens the way on to
 * the vault. */
export const hallAnnexSequenceFloor = (): FloorConfig =>
  floor(hallAndAnnex, [plates(["annex", "mouth"])], [3], ["hall", "vault"])

/** Three steps, two of them in the hall. */
export const oneRegionSequenceFloor = (): FloorConfig =>
  floor(hallAndAnnex, [plates(["hall", "annex", "hall"])], [3], ["hall", "vault"])

/** A step in each of two annexes that hang off the hall. */
export const twoAnnexSequenceFloor = (): FloorConfig =>
  floor(
    {
      regions: [region("mouth"), region("hall"), region("east"), region("west"), region("vault")],
      connections: [
        ["mouth", "hall"],
        ["hall", "east"],
        ["hall", "west"],
        ["hall", "vault"],
      ],
      in: "mouth",
      out: "vault",
    },
    [plates(["east", "west"])],
    [2, 2],
    ["hall", "vault"]
  )

/** A step in the hall, entered from the way in, both annexes and the door on, then one in each annex. Laid from a
 * lock, as a lock floor is: its ids read `plates.<id>`. */
export const offRouteSequenceFloor = (): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  locks: [
    {
      lock: freeRegions(
        parseLock(
          "in -- hall\nhall -- east\nhall -- west\nhall -[plates]- out\n" +
            "plates sequence hall east west reset hall-out\nin ?\nhall ?\neast ?\nwest ?\nout ?",
          "plates"
        ).lock
      ),
    },
  ],
  realisations: { sequence: "pressure-plate" },
})

/** The first step belongs in an annex that is a hidden section, so no tile the player could find stands there. */
export const hiddenAnnexSequenceFloor = (): FloorConfig => {
  const base = floor(hallAndAnnex, [plates(["annex", "hall"])], [3], ["hall", "vault"])
  return { ...base, sideSections: base.sideSections.map(section => ({ ...section, hidden: true })) }
}

/** As many steps as there are glyphs, which with the sequence's own mark need one glyph more than exist. */
export const tooManyTilesSequenceFloor = (): FloorConfig => {
  const annexes = Array.from({ length: MARK_GLYPHS.length - 2 }, (_, i) => `a${i + 1}`)
  return floor(
    {
      regions: ["mouth", "hall", ...annexes, "vault"].map(region),
      connections: [["mouth", "hall"], ...annexes.map((annex): [string, string] => ["hall", annex]), ["hall", "vault"]],
      in: "mouth",
      out: "vault",
    },
    [plates(["mouth", "hall", ...annexes])],
    annexes.map(() => 1),
    ["hall", "vault"]
  )
}

export { plates as sequenceControl, floor as sequenceFloor }
