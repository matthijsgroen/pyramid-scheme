import type { FloorConfig } from "@/game/siteTypes"

type Control = NonNullable<FloorConfig["controls"]>[number]
type Obstacle = NonNullable<FloorConfig["obstacles"]>[number]

const barrier = (id: string, region: string): Obstacle => ({ id, kind: "gate", at: { on: "region", region } })

// A toggle that moves the water: `dry` leaves what it names open, `wet` the other set.
const sluice = (region: string, opens: { dry: string[]; wet: string[] }): Control => ({
  id: "sluice",
  in: region,
  states: ["dry", "wet"],
  initial: "dry",
  returnsToInitial: true,
  opens,
})

const floor = (
  config: Pick<FloorConfig, "regionLayout" | "obstacles" | "controls"> & { chains?: number[] }
): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: (config.chains ?? []).map(pathPuzzles => ({ pathPuzzles, difficulty: "expert", end: "treasure" })),
  regionLayout: config.regionLayout,
  obstacles: config.obstacles,
  controls: config.controls,
})

const region = (name: string) => ({ name, appetite: "free" as const })

/** The pump room opens onto the way out, the hall (with an annex behind it) and the vault each hang off it
 * as their own side path. The sluice floods the hall while the vault is dry and the vault while the hall
 * is dry, so each is reached in one state and the other never needs both. */
export const offRouteSluiceFloor = (): FloorConfig =>
  floor({
    regionLayout: {
      regions: [region("pumpRoom"), region("gallery"), region("hall"), region("annex"), region("vault")],
      connections: [
        ["pumpRoom", "gallery"],
        ["pumpRoom", "hall"],
        ["hall", "annex"],
        ["pumpRoom", "vault"],
      ],
      in: "pumpRoom",
      out: "gallery",
    },
    obstacles: [barrier("floodedHall", "hall"), barrier("floodedVault", "vault")],
    controls: [sluice("pumpRoom", { dry: ["floodedVault"], wet: ["floodedHall"] })],
    chains: [3, 1],
  })

/** The hall stands on the route between the pump room and the way out, so it has two entrances; the sluice
 * can always be thrown back, so the flooded hall is a delay and never a trap. */
export const onRouteSluiceFloor = (): FloorConfig =>
  floor({
    regionLayout: {
      regions: [region("pumpRoom"), region("hall"), region("gallery")],
      connections: [
        ["pumpRoom", "hall"],
        ["hall", "gallery"],
      ],
      in: "pumpRoom",
      out: "gallery",
    },
    obstacles: [barrier("floodedHall", "hall")],
    controls: [sluice("pumpRoom", { dry: [], wet: ["floodedHall"] })],
  })

/** The contract's own sluice on a route that needs both regions: flooding one always dries the other, so
 * the way out is never open. */
export const unwinnableSluiceFloor = (): FloorConfig =>
  floor({
    regionLayout: {
      regions: [region("pumpRoom"), region("hall"), region("vault"), region("gallery")],
      connections: [
        ["pumpRoom", "hall"],
        ["hall", "vault"],
        ["vault", "gallery"],
      ],
      in: "pumpRoom",
      out: "gallery",
    },
    obstacles: [barrier("floodedHall", "hall"), barrier("floodedVault", "vault")],
    controls: [sluice("pumpRoom", { dry: ["floodedVault"], wet: ["floodedHall"] })],
  })

/** The hall on the route is flooded by a spent activator: one press floods it for good, so a player who
 * presses it stands on a floor whose way out can never be reached again. */
export const strandingSluiceFloor = (): FloorConfig => {
  const base = onRouteSluiceFloor()
  return {
    ...base,
    controls: [
      {
        id: "sluice",
        in: "pumpRoom",
        states: ["dry", "wet"],
        initial: "dry",
        returnsToInitial: false,
        opens: { dry: ["floodedHall"], wet: [] },
      },
    ],
  }
}

/** The flooded hall drops into a wing the pump room also joins, so a player in the hall can fall out of it
 * while a player in the wing can never climb back in. */
export const dropOutOfSluiceFloor = (): FloorConfig => ({
  ...floor({
    regionLayout: {
      regions: [region("pumpRoom"), region("gallery"), region("hall"), region("wing")],
      connections: [
        ["pumpRoom", "gallery"],
        ["pumpRoom", "hall"],
        ["pumpRoom", "wing"],
      ],
      in: "pumpRoom",
      out: "gallery",
    },
    obstacles: [
      barrier("floodedHall", "hall"),
      { id: "dropToWing", kind: "oneWay", at: { on: "connection", between: ["hall", "wing"] } },
    ],
    controls: [sluice("pumpRoom", { dry: [], wet: ["floodedHall"] })],
    chains: [3, 1],
  }),
  packing: 7,
  oneWayRealisation: "zipline",
})
