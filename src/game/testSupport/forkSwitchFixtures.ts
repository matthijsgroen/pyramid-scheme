import type { FloorConfig } from "@/game/siteTypes"

export const designerDoubleBack = (): FloorConfig => ({
  oneWayRealisation: "zipline",
  pathPuzzles: 0,
  packing: 7,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 0, difficulty: "expert", end: "treasure" },
    { pathPuzzles: 0, difficulty: "expert", end: "treasure" },
  ],
  regionLayout: {
    regions: [
      { name: "entrance", appetite: "free" },
      { name: "rightLower", appetite: "free" },
      { name: "s1Chamber", appetite: "free" },
      { name: "leftLower", appetite: "free" },
      { name: "s2Chamber", appetite: "free" },
      { name: "wayOut", appetite: "free" },
    ],
    connections: [
      ["entrance", "leftLower"],
      ["entrance", "rightLower"],
      ["rightLower", "s1Chamber"],
      ["leftLower", "s2Chamber"],
      ["entrance", "wayOut"],
    ],
    in: "entrance",
    out: "wayOut",
  },
  obstacles: [
    { id: "forkLeft", kind: "gate", at: { on: "connection", between: ["entrance", "leftLower"] } },
    { id: "forkRight", kind: "gate", at: { on: "connection", between: ["entrance", "rightLower"] } },
    { id: "greenRight", kind: "gate", at: { on: "connection", between: ["rightLower", "s1Chamber"] } },
    { id: "greenLeft", kind: "gate", at: { on: "connection", between: ["leftLower", "s2Chamber"] } },
    { id: "endDoor", kind: "gate", at: { on: "connection", between: ["entrance", "wayOut"] } },
    { id: "dropToLeft", kind: "oneWay", at: { on: "connection", between: ["s1Chamber", "leftLower"] } },
    { id: "dropToEntrance", kind: "oneWay", at: { on: "connection", between: ["leftLower", "entrance"] } },
  ],
  controls: [
    {
      id: "Y",
      in: "entrance",
      states: ["unset", "left", "right"],
      initial: "unset",
      returnsToInitial: false,
      opens: { unset: [], left: ["forkLeft"], right: ["forkRight"] },
    },
    {
      id: "S1",
      in: "s1Chamber",
      states: ["start", "thrown"],
      initial: "start",
      returnsToInitial: false,
      opens: { start: ["greenRight"], thrown: ["greenLeft"] },
    },
    {
      id: "S2",
      in: "s2Chamber",
      states: ["start", "thrown"],
      initial: "start",
      returnsToInitial: false,
      opens: { start: [], thrown: ["endDoor"] },
    },
  ],
})

/** The designer's doubleBack with its fork `Y` as a fork-switch standing in the entrance junction: the
 * two seams out of the entrance (`forkLeft`, `forkRight`) are the doors the board opens, one at a time. */
export const forkSwitchFloorConfig = (): FloorConfig => {
  const base = designerDoubleBack()
  return {
    ...base,
    forks: [{ in: "entrance" }],
    obstacles: base.obstacles!.map(o =>
      o.kind === "gate" && (o.id === "forkLeft" || o.id === "forkRight") ? { ...o, owners: ["Y"] } : o
    ),
    controls: [
      { id: "Y", in: "entrance", control: "fork-switch", encounter: "lightbeamSwitch" },
      ...base.controls!.slice(1),
    ],
  }
}
