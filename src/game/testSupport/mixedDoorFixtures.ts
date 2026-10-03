import type { FloorConfig } from "@/game/siteTypes"

/** Where these floors are authored, and so what their gate key ids are derived from. */
export const MIXED_DOOR_FLOOR_REF = { journeyId: "mixed-door", levelIndex: 0, floorIndex: 0 }

/** The obstacle id of the one door these floors stand, and the gate key it mints. */
export const MIXED_DOOR_ID = "vaultDoor"
export const mixedDoorKey = `obstacle:mixed-door#0#0:${MIXED_DOOR_ID}`

// Three regions in a row with one door on the way to the exit. A torch owns it; so does the floor key
// that opens the side path "pocket", whose chest the floor grows in "keeper". `mode` says how the two
// owners combine.
export const torchAndFloorKeyDoorFloor = (mode?: "any"): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    {
      pathPuzzles: 0,
      difficulty: "expert",
      end: "treasure",
      label: "pocket",
      gate: { type: "floor-key", color: "red" },
    },
    { pathPuzzles: 0, difficulty: "expert", end: "treasure", label: "keeper" },
  ],
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
    {
      id: MIXED_DOOR_ID,
      kind: "gate",
      at: { on: "connection", between: ["hall", "vault"] },
      floorKeys: ["pocket"],
      ...(mode ? { mode } : {}),
    },
  ],
  controls: [
    {
      id: "flame",
      in: "mouth",
      encounter: "torch",
      states: ["unlit", "lit"],
      initial: "unlit",
      returnsToInitial: false,
      opens: { unlit: [], lit: [MIXED_DOOR_ID] },
    },
  ],
})
