import { beforeAll, describe, expect, it } from "vitest"
import { assembleFloor, defaultResolveEncounter, type ResolveEncounter } from "./siteAssembler"
import { cellAddress } from "./cellAddress"
import { withGateFaces } from "./gateFace"
import { parseLock } from "./lockNotation"
import { carveLockFloor } from "./testSupport/lockFixtures"
import { SHELF_AND_DOOR } from "./testSupport/stoneFixtures"
import { openDoorsFor, openWaysOut } from "./mechanismDoors"
import type { FloorConfig, FloorGrid, GridCell, RoomCell } from "./siteTypes"
import { designerDoubleBack, forkSwitchFloorConfig } from "./testSupport/forkSwitchFixtures"
import { handleFloorConfig } from "./testSupport/handleFixtures"
import {
  andDoorFloor,
  anyDoorFloor,
  floorKeyDoorFloor,
  soloLeverDoorFloor,
  soloTorchDoorFloor,
  threeOwnerDoorFloor,
} from "./testSupport/gateFaceFixtures"

const GATE_FACE_FAMILY = "gate-face"

const reEnterable: ResolveEncounter = (encounter, defaultTag) => ({
  ...defaultResolveEncounter(encounter, defaultTag),
  reEnterable: true,
})

type Floor = { name: string; config: FloorConfig }

const floors: Floor[] = [
  { name: "an and door owned by a torch and a lever", config: andDoorFloor() },
  { name: "an and door owned by two torches and a lever", config: threeOwnerDoorFloor() },
  { name: "an any door owned by a torch and a lever", config: anyDoorFloor() },
  { name: "a door owned by one torch", config: soloTorchDoorFloor() },
  { name: "a door owned by one lever", config: soloLeverDoorFloor() },
  { name: "a floor-key door", config: floorKeyDoorFloor() },
  { name: "the doubleBack's single-owner doors", config: designerDoubleBack() },
  { name: "a fork-switch's own doors", config: forkSwitchFloorConfig() },
  {
    name: "two levers each driving its own section",
    config: handleFloorConfig(
      { in: "lever", left: ["vault"], right: ["pocket"] },
      { in: "lever2", left: ["vault2"], right: ["pocket2"] }
    ),
  },
]

const carved = new Map<string, FloorGrid>()

beforeAll(() => {
  for (const { name, config } of floors) {
    for (let seed = 1; seed <= 60; seed++) {
      const result = assembleFloor(`site-gate-face`, config, seed, reEnterable)
      if (result.success) {
        carved.set(name, result.grid)
        break
      }
    }
  }
}, 600_000)

const doorsOf = (grid: FloorGrid): RoomCell[] =>
  grid.cells
    .flat()
    .filter(
      (cell): cell is RoomCell => cell.type === "room" && !!cell.requiredKeyId && (cell.tags?.includes("gate") ?? false)
    )

const ownerRooms = (grid: FloorGrid) =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) => (cell.type === "room" && cell.mechanism ? [{ cell, at: [r, c] as const }] : []))
  )

// The authored owners of an obstacle, read from the CONFIG and not from the carved floor: a control that
// names the obstacle in any state owns it. The authored encounter is the control's realisation.
const configOwners = (config: FloorConfig, obstacleId: string) =>
  (config.controls ?? []).flatMap(control =>
    "opens" in control && Object.values(control.opens).some(ids => ids.includes(obstacleId))
      ? [{ id: control.id, family: control.encounter ?? "handle" }]
      : []
  )

const obstacleIdOf = (door: RoomCell) => door.requiredKeyId!.split(":").pop()!

describe("a gate that waits on several owners", () => {
  it("every floor under test carved", () => {
    expect([...carved.keys()]).toEqual(floors.map(f => f.name))
  })

  it.each(floors)(
    "$name: a gate wears a face exactly when it is an and door with more than one owner",
    ({ name, config }) => {
      const grid = carved.get(name)!
      const doors = doorsOf(grid)
      expect(doors.length).toBeGreaterThan(0)
      for (const door of doors) {
        const obstacle = (config.obstacles ?? []).find(o => o.id === obstacleIdOf(door))
        const owners = obstacle ? configOwners(config, obstacle.id) : []
        const mode = obstacle && obstacle.kind === "gate" ? obstacle.mode : undefined
        const owed = owners.length > 1 && mode !== "any"
        expect(door.gateFace !== undefined, `${door.requiredKeyId}`).toBe(owed)
        expect(door.family === GATE_FACE_FAMILY, `${door.requiredKeyId}`).toBe(owed)
      }
    }
  )

  it("the set of floors puts a face on some doors and leaves others bare, so the test above is not vacuous", () => {
    const faced = [...carved.values()].flatMap(doorsOf).filter(door => door.gateFace)
    const bare = [...carved.values()].flatMap(doorsOf).filter(door => !door.gateFace)
    expect(faced.length).toBeGreaterThanOrEqual(2)
    expect(bare.length).toBeGreaterThan(faced.length)
  })

  it.each(["an and door owned by a torch and a lever", "an and door owned by two torches and a lever"])(
    "%s: the markers are the owners the config names, each with its own realisation's icon, and nothing is authored for them",
    name => {
      const config = floors.find(f => f.name === name)!.config
      const [door] = doorsOf(carved.get(name)!).filter(d => d.gateFace)
      const wanted = configOwners(config, "vaultDoor").sort((a, b) => a.id.localeCompare(b.id))
      expect(wanted.length).toBeGreaterThan(1)
      expect(door.gateFace!.markers.map(m => ({ id: m.id, icon: m.icon }))).toEqual(
        wanted.map(({ id, family }) => ({ id, icon: { kind: "mechanism", family } }))
      )
      expect(JSON.stringify(config)).not.toMatch(/face/i)
    }
  )

  describe("an and door with two owners", () => {
    const name = "an and door owned by a torch and a lever"
    const base = () => carved.get(name)!
    const statesOf = (grid: FloorGrid) => ownerRooms(grid).map(({ cell, at }) => ({ id: cell.mechanismId!, at, cell }))

    // Every combination of the two owners' states, as the save would hold them.
    const combinations = () => {
      const owners = statesOf(base())
      return owners[0].cell.mechanism!.states.flatMap(a =>
        owners[1].cell.mechanism!.states.map(b => ({ [owners[0].id]: a, [owners[1].id]: b }))
      )
    }
    const positionsFor = (states: Record<string, string>) =>
      new Map(
        statesOf(base()).map(({ id, at }) => [cellAddress(base(), 0, at[0], at[1])!, states[id]] as [string, string])
      )

    it("lights each marker exactly when its owner's current state names the door, in all four combinations", () => {
      const combos = combinations()
      expect(combos).toHaveLength(4)
      const key = doorsOf(base()).find(d => d.gateFace)!.requiredKeyId!
      for (const states of combos) {
        const grid = withGateFaces(base(), 0, positionsFor(states))
        const door = doorsOf(grid).find(d => d.requiredKeyId === key)!
        for (const marker of door.gateFace!.markers) {
          const owner = statesOf(base()).find(o => o.id === marker.id)!
          const names = owner.cell.mechanism!.positions.some(p => p.gateKeyId === key && p.state === states[marker.id])
          expect(marker.lit, `${JSON.stringify(states)} ${marker.id}`).toBe(names)
        }
      }
      const litCounts = combos.map(states =>
        withGateFaces(base(), 0, positionsFor(states))
          .cells.flat()
          .find(c => c.type === "room" && c.gateFace)!
      )
      expect(new Set(litCounts.map(c => (c as RoomCell).gateFace!.markers.filter(m => m.lit).length))).toEqual(
        new Set([0, 1, 2])
      )
    })

    it("the door stays shut and wearing its face until every owner names it, then opens as a plain corridor", () => {
      const key = doorsOf(base()).find(d => d.gateFace)!.requiredKeyId!
      for (const states of combinations()) {
        const grid = withGateFaces(base(), 0, positionsFor(states))
        const open = openDoorsFor(grid, 0, positionsFor(states))
        const after = openWaysOut(grid, open)
        const door = doorsOf(after).find(d => d.requiredKeyId === key)
        const allLit = doorsOf(grid)
          .find(d => d.requiredKeyId === key)!
          .gateFace!.markers.every(m => m.lit)
        expect(open.has(key), JSON.stringify(states)).toBe(allLit)
        if (allLit) expect(door, JSON.stringify(states)).toBeUndefined()
        else expect(door?.gateFace, JSON.stringify(states)).toBeDefined()
      }
    })

    it("writes only the door's family and face, so no wall, direction or slot of the carve can have moved", () => {
      const faced = base()
      const bare = (cell: GridCell): GridCell =>
        cell.type === "room" && cell.gateFace ? { ...cell, family: undefined, gateFace: undefined } : cell
      const stripped: FloorGrid = { ...faced, cells: faced.cells.map(row => row.map(bare)) }
      const again = withGateFaces(stripped, 0, new Map())
      stripped.cells.forEach((row, r) =>
        row.forEach((cell, c) => {
          const after = again.cells[r][c]
          const door = faced.cells[r][c].type === "room" && (faced.cells[r][c] as RoomCell).gateFace
          if (door) expect({ ...after, family: undefined, gateFace: undefined }).toEqual(cell)
          else expect(after).toBe(cell)
        })
      )
    })

    it("leaves every opening joined from both sides, the door's included", () => {
      const opposite = { n: "s", s: "n", e: "w", w: "e" } as const
      const step = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] } as const
      const grid = base()
      grid.cells.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (cell.type === "empty") return
          for (const dir of cell.dirs) {
            const next = grid.cells[r + step[dir][0]]?.[c + step[dir][1]]
            expect(next && next.type !== "empty" && next.dirs.has(opposite[dir]), `${r},${c} ${dir}`).toBe(true)
          }
        })
      )
      const door = doorsOf(grid).find(d => d.gateFace)!
      expect(door.dirs.size).toBeGreaterThan(0)
    })
  })
})

describe("a door the stones hold", () => {
  const stoneFloor = (text: string, more: Record<string, string> = {}) =>
    carveLockFloor(parseLock(text, "stones").lock, { weights: "stonePlate", ...more })
  const faceOf = (grid: FloorGrid, positions: ReadonlyMap<string, string> = new Map()) =>
    withGateFaces(grid, 0, positions, undefined, GATE_FACE_FAMILY)
      .cells.flat()
      .find((cell): cell is RoomCell => cell.type === "room" && cell.gateFace !== undefined)
  const homeAddress = (grid: FloorGrid) => {
    const home = grid.cells.flat().findIndex(cell => cell.type === "room" && cell.mechanism && cell.plate)
    return cellAddress(grid, 0, Math.floor(home / grid.cols), home % grid.cols)!
  }
  const TWO_PLATES = "in -[a+b]- out\na plate @in\nb plate @in\ns plate @in stone\nt plate @in stone\nin ?\nout ?"

  it("wears no face with one plate, as a door with one owner wears none", () => {
    const grid = stoneFloor(SHELF_AND_DOOR)
    expect(withGateFaces(grid, 0, new Map(), undefined, GATE_FACE_FAMILY)).toBe(grid)
  })

  it("wears a face with two plates, one marker per plate, a stone wanted on each", () => {
    const door = faceOf(stoneFloor(TWO_PLATES))
    expect(door?.family).toBe(GATE_FACE_FAMILY)
    expect(door?.gateFace?.markers).toEqual([
      { id: "stones.a", icon: { kind: "plate", wants: "stone" }, lit: false },
      { id: "stones.b", icon: { kind: "plate", wants: "stone" }, lit: false },
    ])
  })

  it("lights a plate's marker once the plate agrees", () => {
    const grid = stoneFloor(TWO_PLATES)
    const lit = faceOf(grid, new Map([[homeAddress(grid), "stones.a stones.t"]]))?.gateFace?.markers
    expect(lit?.map(m => m.lit)).toEqual([true, false])
  })

  it("marks a plate wanting none lit while it is empty, and empty hands lit while nothing is carried", () => {
    const door = faceOf(stoneFloor("in -[p:empty+unladen]- out\np plate @in\nshelf plate @in stone\nin ?\nout ?"))
    expect(door?.gateFace?.markers).toEqual([
      { id: "stones.p", icon: { kind: "plate", wants: "empty" }, lit: true },
      { id: "unladen", icon: { kind: "hands" }, lit: true },
    ])
  })

  it("puts a plate beside a lever on one face, the lever's marker first", () => {
    const grid = stoneFloor("in -[p+L]- out\np plate @in\nshelf plate @in stone\nL toggle @in\nin ?\nout ?", {
      toggle: "handle",
    })
    expect(faceOf(grid)?.gateFace?.markers.map(m => m.icon.kind)).toEqual(["mechanism", "plate"])
  })

  it("wears no face on an `any` door, however many plates it lists", () => {
    const grid = stoneFloor("in -[a|b]- out\na plate @in\nb plate @in\nshelf plate @in stone\nin ?\nout ?")
    expect(withGateFaces(grid, 0, new Map(), undefined, GATE_FACE_FAMILY)).toBe(grid)
  })
})
