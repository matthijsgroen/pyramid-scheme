import type { FloorConfig } from "@/game/siteTypes"

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
    [plates(["hall", "vault", "hall"])],
    [],
    ["hall", "vault"]
  )

/** Tiles in the hall, in an annex off it and in the hall again; the sequence opens the way on to the vault. */
export const hallAnnexSequenceFloor = (): FloorConfig =>
  floor(hallAndAnnex, [plates(["hall", "annex", "hall"])], [3], ["hall", "vault"])

/** Three tiles, all in the hall. */
export const oneRegionSequenceFloor = (): FloorConfig =>
  floor(hallAndAnnex, [plates(["hall", "hall", "hall"])], [3], ["hall", "vault"])

/** Tiles in two annexes that each hang off the hall, and in the hall. */
export const offRouteSequenceFloor = (): FloorConfig =>
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
    [plates(["east", "west", "hall", "east"])],
    [2, 2],
    ["hall", "vault"]
  )

/** Both tiles belong in an annex that is a hidden section, so no tile the player could find stands there. */
export const hiddenAnnexSequenceFloor = (): FloorConfig => {
  const base = floor(hallAndAnnex, [plates(["annex", "annex"])], [3], ["hall", "vault"])
  return { ...base, sideSections: base.sideSections.map(section => ({ ...section, hidden: true })) }
}

/** Six tiles, which with the sequence's own mark need seven glyphs where six exist. */
export const tooManyTilesSequenceFloor = (): FloorConfig =>
  floor(hallAndAnnex, [plates(["hall", "hall", "hall", "hall", "hall", "hall"])], [3], ["hall", "vault"])

export { plates as sequenceControl, floor as sequenceFloor }
