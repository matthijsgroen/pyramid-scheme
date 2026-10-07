import { describe, expect, it } from "vitest"
import { resolveEncounterMeta } from "@/mods/allFamilyMeta"
import { TOPOLOGY_OFF } from "@/game/testSupport/modOff"
import { oneWayRuns } from "../gridNavigation"
import type { Control } from "../obstacles"
import type { CorridorCell, Direction, FloorGrid, GridCell, RoomCell } from "../siteTypes"
import { degradeUnrealised, unrealisedSequences, unrealisedWeights } from "./realisations"

const sequence = (encounter?: string): Control => ({
  id: "plates",
  control: "sequence",
  steps: [{ in: "a" }, { in: "b" }],
  resetAt: "grate",
  opens: { done: ["grate"] },
  ...(encounter === undefined ? {} : { encounter }),
})

describe("a sequence's realisation is asked of the build like any other control's", () => {
  it("is unrealised when the realisation its lock was bound to is one no registered mod provides", () => {
    expect([...unrealisedSequences([sequence("nowhere")], resolveEncounterMeta)]).toEqual(["plates"])
  })

  it("is realised when a registered mod provides the realisation it was bound to", () => {
    expect([...unrealisedSequences([sequence("torch")], resolveEncounterMeta)]).toEqual([])
  })

  it("is read at the door's face when authored longhand, so it is realised only where a face is", () => {
    expect([...unrealisedSequences([sequence()], resolveEncounterMeta)]).toEqual([])
    expect([...unrealisedSequences([sequence()], TOPOLOGY_OFF.resolveEncounter)]).toEqual(["plates"])
  })
})

const ground = (dirs: Direction[], more: Partial<CorridorCell> = {}): CorridorCell => ({
  type: "corridor",
  dirs: new Set(dirs),
  state: "fogged",
  sectionAddress: "main",
  ...more,
})

const room = (dirs: Direction[], more: Partial<RoomCell> = {}): RoomCell => ({
  type: "room",
  roomType: "encounter",
  dirs: new Set(dirs),
  state: "fogged",
  sectionAddress: "main",
  ...more,
})

const rowGrid = (cells: GridCell[]): FloorGrid => ({
  cells: [cells],
  rows: 1,
  cols: cells.length,
  entrancePos: [0, 0],
  exitPos: [0, cells.length - 1],
  siteId: "spec",
  staircases: {},
})

const KEY = "obstacle:spec#0#0:door"
const lever = (family: string): RoomCell =>
  room(["e"], {
    family,
    tags: ["handle"],
    mechanismId: family,
    mark: { glyph: 1, color: "red" },
    mechanism: {
      states: ["a", "b"],
      initial: "a",
      returnsToInitial: true,
      positions: [{ state: "b", gateKeyId: KEY }],
    },
  })
const door = (more: Partial<RoomCell> = {}): RoomCell =>
  room(["w", "e"], { tags: ["gate"], requiredKeyId: KEY, gateVariant: "floor-key", ...more })
const NOTHING = { sequences: new Set<string>(), oneWays: false }

describe("taking off what no registered mod realises", () => {
  it("makes the room of a mechanism with no realisation ground and stands its door open as ground", () => {
    const grid = rowGrid([lever("nowhere"), door(), ground(["w"])])
    const bare = degradeUnrealised(grid, TOPOLOGY_OFF.resolveEncounter, NOTHING)

    expect(bare.cells[0].map(cell => cell.type)).toEqual(["corridor", "corridor", "corridor"])
    expect(bare.cells[0].map(cell => (cell.type === "empty" ? "" : [...cell.dirs].join("")))).toEqual(["e", "we", "w"])
    expect(bare.cells[0][1]).not.toHaveProperty("openGate")
  })

  it("keeps a door another realised mechanism still owns, and one a floor key still waits on", () => {
    const owned = rowGrid([lever("nowhere"), lever("handle"), door(), ground(["w"])])
    const kept = degradeUnrealised(owned, resolveEncounterMeta, NOTHING)
    expect(kept.cells[0].map(cell => cell.type)).toEqual(["corridor", "room", "room", "corridor"])

    const withBothOff = degradeUnrealised(owned, TOPOLOGY_OFF.resolveEncounter, NOTHING)
    expect(withBothOff.cells[0].map(cell => cell.type)).toEqual(["corridor", "corridor", "corridor", "corridor"])

    const keyed = rowGrid([lever("nowhere"), door({ requiredKeyIds: ["held"] }), ground(["w"])])
    const bare = degradeUnrealised(keyed, TOPOLOGY_OFF.resolveEncounter, NOTHING)
    expect(bare.cells[0].map(cell => cell.type)).toEqual(["corridor", "room", "corridor"])
  })

  it("empties a junction of what stood in it and of the ways out the mechanism shut", () => {
    const junction = room(["e", "w"], {
      roomType: "fork",
      family: "nowhere",
      tags: ["puzzle"],
      mechanismId: "Y",
      mechanism: {
        states: ["rest", KEY],
        initial: "rest",
        returnsToInitial: true,
        positions: [{ state: KEY, gateKeyId: KEY }],
      },
      exits: [
        { dir: "e", kind: "side", gateKeyId: KEY, mark: { glyph: 1, color: "red" } },
        { dir: "w", kind: "main" },
      ],
    })
    const bare = degradeUnrealised(rowGrid([junction, door(), ground(["w"])]), TOPOLOGY_OFF.resolveEncounter, NOTHING)
    const [left] = bare.cells[0] as RoomCell[]

    expect(left).toMatchObject({
      type: "room",
      roomType: "fork",
      exits: [
        { dir: "e", kind: "side" },
        { dir: "w", kind: "main" },
      ],
    })
    expect([left.family, left.mechanism, left.mechanismId, left.tags]).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ])
    expect(left.exits?.map(exit => exit.gateKeyId)).toEqual([undefined, undefined])
    expect(bare.cells[0][1].type).toBe("corridor")
  })

  it("changes nothing on a floor whose every mechanism is realised", () => {
    const grid = rowGrid([lever("handle"), door(), ground(["w"])])
    expect(degradeUnrealised(grid, resolveEncounterMeta, NOTHING)).toBe(grid)
  })

  it("stands a region barrier's door as plain ground when its realisation is missing, and keeps it otherwise", () => {
    const barrier = door({ regionBarrier: { region: "vault", entrance: "hall", realisation: "water" } })
    const grid = rowGrid([ground(["e"]), barrier, ground(["w"])])

    expect(degradeUnrealised(grid, resolveEncounterMeta, NOTHING)).toBe(grid)
    const bare = degradeUnrealised(grid, resolveEncounterMeta, { ...NOTHING, regionBarriers: true })
    expect(bare.cells[0][1]).toMatchObject({ type: "corridor", dirs: new Set(["w", "e"]) })
  })

  it("joins a drop's launch, span and landing into a passage walked both ways", () => {
    const grid = rowGrid([
      ground(["e"]),
      ground(["w"]),
      ground([], { obstacle: { dir: "e", kind: "zipline" } }),
      ground(["e"]),
      ground(["w"]),
    ])
    expect(oneWayRuns(grid)).toHaveLength(1)

    const bare = degradeUnrealised(grid, TOPOLOGY_OFF.resolveEncounter, { ...NOTHING, oneWays: true })

    expect(oneWayRuns(bare)).toEqual([])
    expect(bare.cells[0].map(cell => (cell.type === "empty" ? "" : [...cell.dirs].sort().join("")))).toEqual([
      "e",
      "ew",
      "ew",
      "ew",
      "w",
    ])
  })
})

describe("the pressure plate that realises a sequence", () => {
  it("is realised with its mod on and left as bare tiles with it off, never stood in by another family", () => {
    expect([...unrealisedSequences([sequence("pressure-plate")], resolveEncounterMeta)]).toEqual([])
    expect([...unrealisedSequences([sequence("pressure-plate")], TOPOLOGY_OFF.resolveEncounter)]).toEqual(["plates"])
  })
})

describe("the stone plate that realises a lock's stones", () => {
  const stones = (encounter: string): Control => ({
    id: "a.stones",
    control: "weights",
    plates: [{ id: "a.p", in: "a.in", stone: true }],
    states: ["a.p", "+ hand"],
    initial: "a.p",
    opens: { "a.p": [], "+ hand": [] },
    moves: [],
    carrying: ["+ hand"],
    underfoot: [],
    terms: {},
    encounter,
  })
  const plate = (dirs: Direction[], id: string, home: boolean): RoomCell =>
    room(dirs, {
      plate: { id },
      worksMechanism: { mechanismId: "a.stones", transition: 0 },
      ...(home
        ? {
            mechanismId: "a.stones",
            mechanism: {
              states: ["a.p", "+ hand"],
              initial: "a.p",
              returnsToInitial: true,
              placedOnly: true,
              positions: [{ state: "a.p", gateKeyId: KEY }],
              transitions: [{ from: "a.p", to: "+ hand", at: [0, 0] }],
            },
          }
        : {}),
    })

  it("is realised with its mod on and unrealised with it off", () => {
    expect([...unrealisedWeights([stones("stonePlate")], resolveEncounterMeta)]).toEqual([])
    expect([...unrealisedWeights([stones("stonePlate")], TOPOLOGY_OFF.resolveEncounter)]).toEqual(["a.stones"])
  })

  it("leaves every plate as ground, and the doors only the stones held stand open as ground", () => {
    const grid = rowGrid([plate(["e"], "a.p", true), plate(["w", "e"], "a.q", false), door(), ground(["w"])])
    const bare = degradeUnrealised(grid, TOPOLOGY_OFF.resolveEncounter, { ...NOTHING, weights: new Set(["a.stones"]) })
    expect(bare.cells[0].map(cell => cell.type)).toEqual(["corridor", "corridor", "corridor", "corridor"])
  })
})
