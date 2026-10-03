import type { FloorConfig } from "@/game/siteTypes"
import { forkSwitchFloorConfig } from "./forkSwitchFixtures"

type Control = NonNullable<FloorConfig["controls"]>[number]
type Obstacle = NonNullable<FloorConfig["obstacles"]>[number]

const gate = (id: string, between: [string, string]): Obstacle => ({
  id,
  kind: "gate",
  at: { on: "connection", between },
})

const lever = (id: string, region: string, opens: string[], returnsToInitial = true): Control => ({
  id,
  in: region,
  states: ["off", "on"],
  initial: "off",
  returnsToInitial,
  opens: { off: [], on: opens },
})

const region = (name: string) => ({ name, appetite: "free" as const })

/** Two doors of different mechanics on the one connection between hall and vault, iron first from the
 * hall: a lever in the mouth works the iron door and one in the hall the sand door. The vault is dealt
 * enough of the route to hold both. */
export const twoGatesOnRouteFloor = (): FloorConfig => ({
  pathPuzzles: 4,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  regionLayout: {
    regions: [region("mouth"), region("hall"), region("vault")],
    connections: [
      ["mouth", "hall"],
      ["hall", "vault"],
    ],
    in: "mouth",
    out: "vault",
  },
  obstacles: [gate("ironDoor", ["hall", "vault"]), gate("sandDoor", ["hall", "vault"])],
  controls: [lever("ironLever", "mouth", ["ironDoor"]), lever("sandLever", "hall", ["sandDoor"])],
  barrierOrder: [{ between: ["hall", "vault"], barriers: ["ironDoor", "sandDoor"] }],
})

/** The same pair of doors written the other way round: the order names the connection from the vault, so
 * the sand door is the one nearest the vault and the iron door still the one nearest the hall. */
export const twoGatesOnRouteWrittenBackwardsFloor = (): FloorConfig => ({
  ...twoGatesOnRouteFloor(),
  barrierOrder: [{ between: ["vault", "hall"], barriers: ["sandDoor", "ironDoor"] }],
})

/** Two doors of different mechanics on a connection the route does not thread: the annex and the cellar
 * hang off the mouth as one side path, and the cellar's way in carries a ward door and then a flame door. */
export const twoGatesOffRouteFloor = (): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [{ pathPuzzles: 8, difficulty: "expert", end: "treasure" }],
  regionLayout: {
    regions: [region("mouth"), region("gallery"), region("annex"), region("cellar")],
    connections: [
      ["mouth", "gallery"],
      ["mouth", "annex"],
      ["annex", "cellar"],
    ],
    in: "mouth",
    out: "gallery",
  },
  obstacles: [gate("wardDoor", ["annex", "cellar"]), gate("flameDoor", ["annex", "cellar"])],
  controls: [lever("wardLever", "mouth", ["wardDoor"]), lever("flameLever", "annex", ["flameDoor"])],
  barrierOrder: [{ between: ["annex", "cellar"], barriers: ["wardDoor", "flameDoor"] }],
})

/** The designer's doubleBack with its fork-switch, and a second door on the seam to the right-hand
 * landing, standing after the door the junction operates and opened by the chamber lever. */
export const forkSeamWithSecondGateFloor = (): FloorConfig => {
  const base = forkSwitchFloorConfig()
  return {
    ...base,
    packing: 10,
    sideSections: base.sideSections.map(section => ({ ...section, pathPuzzles: 4 })),
    obstacles: [...base.obstacles!, gate("extraRight", ["entrance", "rightLower"])],
    controls: base.controls!.map(control =>
      control.id === "S1" && !control.control
        ? { ...control, opens: { start: ["greenRight", "extraRight"], thrown: ["greenLeft"] } }
        : control
    ),
    barrierOrder: [{ between: ["entrance", "rightLower"], barriers: ["forkRight", "extraRight"] }],
  }
}

/** The two doors on the route, the outer one opening to its lever OR to anything else that names it, so a
 * mechanism placed between the doors can hold it open without the hall lever. */
export const anyOuterDoorFloor = (): FloorConfig => {
  const base = twoGatesOnRouteFloor()
  return {
    ...base,
    obstacles: base.obstacles!.map(o => (o.id === "ironDoor" ? { ...o, mode: "any" as const } : o)),
  }
}
