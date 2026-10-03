import type { FloorConfig } from "@/game/siteTypes"

type Control = NonNullable<FloorConfig["controls"]>[number]

const torch = (id: string, region: string, opens: string[]): Control => ({
  id,
  in: region,
  encounter: "torch",
  states: ["unlit", "lit"],
  initial: "unlit",
  returnsToInitial: false,
  opens: { unlit: [], lit: opens },
})

const lever = (id: string, region: string, opens: string[]): Control => ({
  id,
  in: region,
  states: ["left", "right"],
  initial: "left",
  returnsToInitial: true,
  opens: { left: [], right: opens },
})

// Three regions in a row with one door on the way to the exit; `controls` decide who owns it.
const doorFloor = (controls: Control[], mode?: "any"): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [{ pathPuzzles: 0, difficulty: "expert", end: "treasure" }],
  regionLayout: {
    regions: [
      { name: "mouth", appetite: "free" },
      { name: "hall", appetite: "free" },
      { name: "vault", appetite: "free" },
    ],
    connections: [
      ["mouth", "hall"],
      ["hall", "vault"],
    ],
    in: "mouth",
    out: "vault",
  },
  obstacles: [
    { id: "vaultDoor", kind: "gate", at: { on: "connection", between: ["hall", "vault"] }, ...(mode ? { mode } : {}) },
  ],
  controls,
})

/** A door a torch and a lever both own: it opens only once both name it. */
export const andDoorFloor = (): FloorConfig =>
  doorFloor([torch("flame", "mouth", ["vaultDoor"]), lever("beam", "hall", ["vaultDoor"])])

/** Three owners on one `and` door: two torches and a lever. */
export const threeOwnerDoorFloor = (): FloorConfig =>
  doorFloor([
    torch("flameA", "mouth", ["vaultDoor"]),
    torch("flameB", "mouth", ["vaultDoor"]),
    lever("beam", "hall", ["vaultDoor"]),
  ])

/** The same two owners, but the first one touched opens the door. */
export const anyDoorFloor = (): FloorConfig =>
  doorFloor([torch("flame", "mouth", ["vaultDoor"]), lever("beam", "hall", ["vaultDoor"])], "any")

/** One owner, a torch: a single owner teaches by consequence. */
export const soloTorchDoorFloor = (): FloorConfig => doorFloor([torch("flame", "mouth", ["vaultDoor"])])

/** One owner, a lever. */
export const soloLeverDoorFloor = (): FloorConfig => doorFloor([lever("beam", "mouth", ["vaultDoor"])])

/** A section behind a floor-key door, beside no mechanism at all. */
export const floorKeyDoorFloor = (): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", gate: { type: "floor-key", color: "red" } },
    { pathPuzzles: 0, difficulty: "junior", end: "treasure" },
  ],
})
