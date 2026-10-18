import { describe, expect, it } from "vitest"
import { doorOpen, type DoorMode } from "./doorOpen"
import { floorLock } from "./floorLock"
import { walkFloorLock } from "./floorLockWalk"
import { INPUT_HELD, INPUT_MISSING, openGates, reachableStates, walkLock, type LockConfig } from "./lockWalk"
import { douseFloor, openDoorsFor } from "./mechanismDoors"
import { cellAddress } from "./cellAddress"
import type { Direction, FloorGrid, GridCell, MechanismRecord } from "./siteTypes"

type Cell = Extract<GridCell, { type: "room" }>

const G = "obstacle:web#0#0:door"
const OUT = "obstacle:web#0#0:out"
const web = (n: number) => `web:k${n}`

const everyBooleanList = (n: number): boolean[][] =>
  n === 0
    ? [[]]
    : everyBooleanList(n - 1).flatMap(rest => [
        [false, ...rest],
        [true, ...rest],
      ])

// A made-up floor, one row walked west to east: the entrance, then each room `rooms` lists with a corridor after it,
// then the exit.
const rowOf = (rooms: Partial<Cell>[]) => {
  const dirs = new Set<Direction>(["e", "w"])
  const corridor = (): GridCell => ({ type: "corridor", dirs, state: "fogged" })
  const cells: GridCell[] = [corridor()]
  const at: number[] = []
  for (const extra of rooms) {
    at.push(cells.length)
    cells.push(
      {
        type: "room",
        roomType: "encounter",
        dirs,
        state: "fogged",
        pathIndex: 1,
        sectionAddress: `s${cells.length}`,
        ...extra,
      },
      corridor()
    )
  }
  cells.push({ type: "room", roomType: "encounter", dirs, state: "fogged", pathIndex: 1, sectionAddress: "end" })
  const grid: FloorGrid = {
    cells: [cells],
    rows: 1,
    cols: cells.length,
    entrancePos: [0, 0],
    exitPos: [0, cells.length - 1],
    siteId: "web",
    staircases: {},
  }
  return { grid, at }
}

const lever = (gateKeyId: string, any: boolean): MechanismRecord => ({
  states: ["rest", "thrown"],
  initial: "rest",
  returnsToInitial: true,
  positions: [{ state: "thrown", gateKeyId, ...(any ? { mode: "any" as const } : {}) }],
})

const statesOf = (grid: FloorGrid, arriving?: ReadonlySet<string>) => {
  const found = reachableStates(floorLock(grid, { arriving })!)
  if (found === "tooLarge") throw new Error("too large")
  return found
}

const atExit = (grid: FloorGrid) => floorLock(grid)!.out

describe("a web door in the floor walk", () => {
  const webDoor = () => rowOf([{ tags: ["gate"], requiredKeyId: web(0) }]).grid

  it("compiles a floor whose only door is a web door, its key an outside input that starts missing", () => {
    const lock = floorLock(webDoor())!
    expect(lock.mechanisms[`outside ${web(0)}`]).toMatchObject({ initial: INPUT_MISSING, transitions: [] })
    expect(lock.arrivals).toEqual([{ mechanism: `outside ${web(0)}`, from: INPUT_MISSING, to: INPUT_HELD }])
    expect(floorLock(rowOf([]).grid)).toBeUndefined()
  })

  it("keeps the door shut before its key arrives and opens it after", () => {
    const grid = webDoor()
    const { order } = statesOf(grid)
    const reached = order.filter(state => state.region === atExit(grid))
    expect(reached.length).toBeGreaterThan(0)
    expect(reached.every(state => state.config[`outside ${web(0)}`] === INPUT_HELD)).toBe(true)
    expect(walkFloorLock(grid)).toMatchObject({ sound: true })
  })

  it("never lets a key outside the given set arrive: it is sealed", () => {
    const grid = rowOf([
      { tags: ["gate"], requiredKeyId: web(0) },
      { tags: ["gate"], requiredKeyId: web(1) },
    ]).grid
    const lock = floorLock(grid, { arriving: new Set([web(0)]) })!
    expect(lock.arrivals).toEqual([{ mechanism: `outside ${web(0)}`, from: INPUT_MISSING, to: INPUT_HELD }])
    expect(lock.mechanisms[`sealed ${web(1)}`]).toBeDefined()
    expect(statesOf(grid, new Set([web(0)])).order.some(state => state.config[`outside ${web(1)}`])).toBe(false)
    expect(walkFloorLock(grid, { arriving: new Set([web(0)]) })).toEqual({
      sound: false,
      failure: { type: "unsolvable" },
    })
    expect(walkFloorLock(grid)).toMatchObject({ sound: true })
  })

  it("opens a door with a web key and a lever under all only with both, under any with either", () => {
    for (const mode of ["all", "any"] as const) {
      const { grid, at } = rowOf([
        { mechanism: lever(G, mode === "any") },
        { tags: ["gate"], requiredKeyId: G, requiredKeyIds: [web(0)] },
      ])
      const lock = floorLock(grid)!
      const door = Object.keys(lock.gates).filter(id => id.startsWith(`door 0,${at[1]}|`))
      for (const [thrown, held] of everyBooleanList(2)) {
        const config: LockConfig = {
          [`obstacle 0,${at[0]}`]: thrown ? "thrown" : "rest",
          [`outside ${web(0)}`]: held ? INPUT_HELD : INPUT_MISSING,
        }
        const want = mode === "any" ? thrown || held : thrown && held
        const open = openGates(lock, config)
        expect(
          door.map(id => open.has(id)),
          `${mode} thrown ${thrown} held ${held}`
        ).toEqual(door.map(() => want))
      }
    }
  })

  it("douses a torch in the region a web key's barrier covers, and lets it be lit once the key arrives", () => {
    const { grid, at } = rowOf([
      { tags: ["gate"], requiredKeyId: web(0), regionBarrier: { region: "hall", entrance: "w", realisation: "sand" } },
      {
        mechanism: {
          states: ["off", "on"],
          initial: "on",
          returnsToInitial: false,
          placedOnly: true,
          positions: [{ state: "on", gateKeyId: OUT }],
          // Lit where it stands: the second room of the row.
          transitions: [{ from: "off", to: "on", at: [0, 3] }],
          torch: { region: "hall" },
        },
      },
      { tags: ["gate"], requiredKeyId: OUT },
    ])
    expect(at[1]).toBe(3)
    const torch = `obstacle 0,${at[1]}`
    const key = `outside ${web(0)}`
    const { order } = statesOf(grid)
    expect(order[0].config[torch]).toBe("off")
    expect(order.some(state => state.config[key] === INPUT_MISSING && state.config[torch] === "on")).toBe(false)
    expect(order.some(state => state.config[key] === INPUT_HELD && state.config[torch] === "on")).toBe(true)
    expect(walkFloorLock(grid)).toMatchObject({ sound: true })
    // Play douses by the same rule: the torch is out while the key is missing, and stays lit once it is held.
    expect([...douseFloor(grid, 0, new Map()).values()]).toEqual(["off"])
    expect(douseFloor(grid, 0, new Map(), new Set([web(0)])).size).toBe(0)
  })
})

// THE SOLVER AND PLAY MUST AGREE ON A DOOR NAMING SEVERAL KEYS (docs/mods/mechanic-contract.md, "What this requires of
// the engine", item 6): a web key is one more owner of the door, held or not.
describe("openDoorsFor and floorLock on a door with levers and web keys", () => {
  const MODES: DoorMode[] = ["all", "any"]
  for (const mode of MODES)
    for (let levers = 1; levers <= 2; levers++)
      for (let keys = 1; keys <= 2; keys++)
        it(`${levers} levers and ${keys} web keys under ${mode}: the same open doors for every held set and lever position`, () => {
          const { grid, at } = rowOf([
            ...Array.from({ length: levers }, (_, n) => ({ mechanism: lever(G, mode === "any" && n === 0) })),
            { tags: ["gate"], requiredKeyId: G, requiredKeyIds: Array.from({ length: keys }, (_, n) => web(n)) },
          ])
          const door = at[levers]
          const lock = floorLock(grid)!
          const gates = Object.keys(lock.gates).filter(id => id.startsWith(`door 0,${door}|`))
          for (const thrown of everyBooleanList(levers))
            for (const held of everyBooleanList(keys)) {
              const positions = new Map(
                thrown.map((t, n) => [cellAddress(grid, 0, 0, at[n])!, t ? "thrown" : "rest"] as const)
              )
              const heldKeys = new Set(held.flatMap((h, n) => (h ? [web(n)] : [])))
              const config: LockConfig = Object.fromEntries(
                Object.entries(lock.mechanisms).map(([id, mechanism]) => [id, mechanism.initial])
              )
              thrown.forEach((t, n) => (config[`obstacle 0,${at[n]}`] = t ? "thrown" : "rest"))
              held.forEach((h, n) => (config[`outside ${web(n)}`] = h ? INPUT_HELD : INPUT_MISSING))
              const open = openGates(lock, config)
              const solver = gates.map(id => open.has(id))
              const runtime = openDoorsFor(grid, 0, positions, heldKeys).has(G)
              const want = doorOpen([...thrown, ...held], mode)
              expect({ runtime, solver }, `thrown ${thrown.join("/")} held ${held.join("/")}`).toEqual({
                runtime: want,
                solver: gates.map(() => want),
              })
            }
        })
})

describe("a floor with no web door", () => {
  it("compiles as it did: no arrival, nothing outside", () => {
    const { grid } = rowOf([{ mechanism: lever(G, false) }, { tags: ["gate"], requiredKeyId: G }])
    const lock = floorLock(grid)!
    expect(lock).not.toHaveProperty("arrivals")
    expect(Object.keys(lock.mechanisms).some(id => id.startsWith("outside "))).toBe(false)
    expect(walkLock(lock).sound).toBe(true)
  })
})
