// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render } from "@testing-library/react"
import { getFamilyPlugin, resolveEncounter, type FamilyContext } from "@/app/families/familyRegistry"
import { useJourneys } from "@/app/state/useJourneys"
import { classifyForkShape } from "@/game/forkShape"
import { assembleFloor } from "@/game/siteAssembler"
import { completeCell, findPath, revealAll, walkableFrom } from "@/game/gridNavigation"
import type { Direction as WayOut, FloorConfig, FloorGrid, RoomCell } from "@/game/siteTypes"
import { clearGameData, writeGameData } from "@/support/useGameStorage"
import { cellKey as beamCellKey } from "@/mods/core/game/beam/physics"
import { routesTo } from "../../game/shrineBeam/shrineBeam"
import type { LightbeamSwitchBoard } from "../../game/lightbeamSwitch/generateLightbeamSwitch"
import { cellAddress, cellKey } from "@/app/SiteMap/cellIdentity"
import { offeredTargets } from "@/app/SiteMap/clickTargets"
import { buildRoomClaims } from "@/app/SiteMap/roomClaims"
import { encodeEdge } from "@/app/SiteMap/edgeId"
import { useAssembledFloor } from "@/app/SiteMap/useAssembledFloor"
import { useOpenWaysOut } from "@/app/SiteMap/useOpenWaysOut"
import "@/mods/registerModApps"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const JOURNEY = "junior_2"
const LEVEL_NR = 2

const floorConfig: FloorConfig = {
  pathPuzzles: 2,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
    { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
  ],
  forks: [{ exits: 2, count: 1 }],
  switches: { encounter: "lightbeamSwitch", min: 1, max: 1 },
}

const forkIn = (grid: FloorGrid): { at: [number, number]; cell: RoomCell } | undefined => {
  for (let row = 0; row < grid.rows; row++)
    for (let col = 0; col < grid.cols; col++) {
      const cell = grid.cells[row][col]
      if (cell.type === "room" && cell.roomType === "fork" && cell.family === "lightbeamSwitch")
        return { at: [row, col], cell }
    }
  return undefined
}

/** One step of the map, per bearing. Nodes sit two of these apart, the doorway between them one. */
const STEP: Record<WayOut, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

// Carving two hundred floors to find one that stands a switch in a three-way junction is the real cost
// in this file; every test below reads the same carve.
let SEED = 0
let STOOD_IN_THE_FORK: Record<string, string[]> = {}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.scrollTo = () => {}
  for (let seed = 0; seed < 200; seed++) {
    const result = assembleFloor(JOURNEY, floorConfig, seed, resolveEncounter, {
      floorRef: { journeyId: JOURNEY, levelIndex: LEVEL_NR - 1, floorIndex: 0 },
    })
    if (!result.success) continue
    const fork = forkIn(result.grid)
    if (!fork || (fork.cell.exits ?? []).filter(exit => exit.gateKeyId).length < 3) continue
    const key = cellKey(result.grid, 0, fork.at[0], fork.at[1])
    if (!key) throw new Error("the carved fork has no key to file it under")
    SEED = seed
    STOOD_IN_THE_FORK = { [fork.cell.sectionAddress ?? ""]: [key] }
    return
  }
  throw new Error("no seed carved a switch fork with three shut ways out")
}, 60_000)

type Seen = { grid: FloorGrid | null; board?: LightbeamSwitchBoard; ctx?: FamilyContext }
const latest: Seen = { grid: null }
const report = (seen: Seen) => Object.assign(latest, seen)

const Room = ({ explored = {} }: { explored?: Record<string, string[]> }) => {
  const journeys = useJourneys()
  const open = useOpenWaysOut(journeys, JOURNEY)
  const { grid } = useAssembledFloor(JOURNEY, floorConfig, SEED, 0, explored, null, 0, undefined, LEVEL_NR - 1, open)
  const fork = grid ? forkIn(grid) : undefined
  const plugin = getFamilyPlugin("lightbeamSwitch")
  if (!grid || !fork || !plugin) {
    report({ grid })
    return null
  }
  const [row, col] = fork.at
  const edgeId = encodeEdge(0, row, col)
  const ctx: FamilyContext = {
    journeyId: JOURNEY,
    levelNr: LEVEL_NR,
    edgeId,
    address: cellAddress(grid, 0, row, col) ?? edgeId,
    sectionHash: fork.cell.sectionHash ?? "",
    freshArrival: true,
    difficulty: fork.cell.difficulty ?? "junior",
    boardIndex: fork.cell.boardIndex,
    exits: fork.cell.exits,
    forkShape: classifyForkShape((fork.cell.exits ?? []).filter(exit => exit.gateKeyId).map(exit => exit.dir)),
  }
  const board = plugin.generate(0, ctx) as LightbeamSwitchBoard
  report({ grid, ctx, board })
  const Component = plugin.Component
  const services = undefined as never
  return (
    <Component
      puzzle={board}
      ctx={ctx}
      journeys={journeys}
      progression={services}
      inventory={services}
      applyReward={services}
      onSolved={() => {}}
      onCancel={() => {}}
    />
  )
}

const settle = async () => {
  await act(async () => {
    await Promise.resolve()
  })
}

const seen = (): FloorGrid => {
  if (!latest.grid) throw new Error("no floor")
  return latest.grid
}

const board = (): LightbeamSwitchBoard => {
  if (!latest.board) throw new Error("the switch room never rendered a board")
  return latest.board
}

const fork = (): [number, number] => {
  const found = forkIn(seen())
  if (!found) throw new Error("the switch is not standing in the floor the map drew")
  return found.at
}

/** Which bearings out of the fork still stand shut, read off the doorway each one is barred at. */
const shutWays = (): WayOut[] => {
  const [row, col] = fork()
  return (latest.ctx?.exits ?? [])
    .filter(exit => {
      if (!exit.gateKeyId) return false
      const [dr, dc] = STEP[exit.dir]
      const doorway = seen().cells[row + dr]?.[col + dc]
      return doorway?.type === "room" && doorway.requiredKeyId === exit.gateKeyId
    })
    .map(exit => exit.dir)
}

/** The same, with the check that this fork really has all three of its ways out shut: a test that
 * found none would otherwise pass by looping over nothing. */
const allShutWays = (): WayOut[] => {
  const ways = shutWays()
  expect(ways).toHaveLength(3)
  return ways
}

const at = ([row, col]: [number, number]) => seen().cells[row]?.[col]
const step = ([row, col]: [number, number], way: WayOut, times: number): [number, number] => [
  row + STEP[way][0] * times,
  col + STEP[way][1] * times,
]
const stateAt = (pos: [number, number]) => {
  const cell = at(pos)
  return cell === undefined || cell.type === "empty" ? "empty" : cell.state
}

const mirrorCells = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>("button")).filter(el => el.className.includes("aspect-square"))

/** Sends the light to one way out's shrine, the way a player does: one tap per mirror to turn. */
const routeTo = async (container: HTMLElement, way: WayOut) => {
  const shrine = board().shrines.findIndex(candidate => candidate.canonicalDir === way)
  if (shrine === -1) throw new Error(`the board carries no shrine for the ${way} way out`)
  const routes = routesTo(
    board().grid,
    board().shrines.map(spot => spot.at),
    shrine
  )
  if (routes.length !== 1) throw new Error(`the ${way} shrine owes ${routes.length} routes, not one`)
  const cells = mirrorCells(container)
  const angles = [...board().grid.initial]
  for (const { at: mirrorAt, angle } of routes[0]) {
    const mirror = board().grid.mirrors.findIndex(candidate => beamCellKey(candidate) === beamCellKey(mirrorAt))
    if (angles[mirror] === angle) continue
    await act(async () => {
      cells[mirror].click()
    })
    angles[mirror] = angle
  }
  await settle()
}

/** The same floor, entered by a player whose save says they are standing at `address`. */
const standing: [number, number] = [0, 0]
const stand = (at: readonly [number, number]) => {
  standing[0] = at[0]
  standing[1] = at[1]
}
const StandingAt = ({ address }: { address: string }) => {
  const journeys = useJourneys()
  const open = useOpenWaysOut(journeys, JOURNEY)
  const { grid, explorerPos } = useAssembledFloor(
    JOURNEY,
    floorConfig,
    SEED,
    0,
    STOOD_IN_THE_FORK,
    address,
    0,
    undefined,
    LEVEL_NR - 1,
    open
  )
  report({ grid })
  stand(explorerPos)
  return null
}

describe("a way out a switch has shut", () => {
  beforeEach(async () => {
    await clearGameData()
    await writeGameData({
      storageVersions: { journeys: 3, inventory: 1, answers: 1 },
      journeys: [
        {
          journeyId: JOURNEY,
          levelNr: LEVEL_NR,
          completionCount: 0,
          active: true,
          exploredSections: {},
          position: null,
          interiorLevelNr: null,
          cellKeyVersion: 3,
        },
      ],
    })
  })
  afterEach(() => {
    cleanup()
  })

  const walkIn = async (explored: Record<string, string[]> = STOOD_IN_THE_FORK) => {
    const result = render(<Room explored={explored} />)
    await settle()
    return result
  }

  it("bars the doorway out of the junction, not a node further down the branch", async () => {
    await walkIn()
    for (const way of allShutWays()) {
      const doorway = at(step(fork(), way, 1))
      expect(doorway?.type === "room" && doorway.tags?.includes("gate")).toBe(true)
    }
  })

  it("leaves the node beyond it in the dark", async () => {
    await walkIn()
    for (const way of allShutWays()) expect(stateAt(step(fork(), way, 2))).toBe("fogged")
  })

  it("cannot be walked onto", async () => {
    await walkIn()
    const walkable = walkableFrom(seen(), fork())
    for (const way of allShutWays()) {
      const [row, col] = step(fork(), way, 1)
      expect(walkable.has(`${row},${col}`)).toBe(false)
      expect(findPath(seen(), fork(), [row, col])).toEqual([])
    }
  })

  it("cannot be walked through", async () => {
    await walkIn()
    const walkable = walkableFrom(seen(), fork())
    for (const way of allShutWays()) {
      const [row, col] = step(fork(), way, 2)
      expect(walkable.has(`${row},${col}`)).toBe(false)
      expect(findPath(seen(), fork(), [row, col])).toEqual([])
    }
  })

  it("is offered no move by the map the player is looking at", async () => {
    await walkIn()
    const grid = seen()
    const offers = offeredTargets(grid, buildRoomClaims(grid), fork())
    const toward = allShutWays().flatMap(way => [step(fork(), way, 1), step(fork(), way, 2)])
    const offered = [...offers].filter(([, [row, col]]) => toward.some(([r, c]) => r === row && c === col))
    expect(offered).toEqual([])
  })

  /**
   * BOTH SIDES. The bars are a wall whichever side of them the player is on, and the floor is lit end
   * to end here so that the dark is not what stops the walk — what stops it is the door.
   *
   * No carve makes the shape this is really aimed at: swept over the baked world with a junction added
   * to every floor, 103 of them stood a switch and not one left the ground behind two of its shut ways
   * out connected to each other. So the far side is reached by lighting the floor rather than by
   * walking round, and what is asserted is the same thing either way — nothing crosses a shut way out.
   */
  it("is as impassable from behind as it is from in front", async () => {
    await walkIn()
    const lit = revealAll(seen())
    const claims = buildRoomClaims(lit)
    for (const way of allShutWays()) {
      const doorway = step(fork(), way, 1)
      const behind = step(fork(), way, 2)
      expect(lit.cells[behind[0]][behind[1]].type).not.toBe("empty")
      expect(walkableFrom(lit, behind).has(`${doorway[0]},${doorway[1]}`)).toBe(false)
      expect(findPath(lit, behind, doorway)).toEqual([])
      expect(findPath(lit, behind, fork())).toEqual([])
      const offers = [...offeredTargets(lit, claims, behind).values()]
      expect(offers).not.toContainEqual(doorway)
      expect(offers).not.toContainEqual(fork())
    }
  })

  it("reveals nothing on the junction's side when the far side is walked", async () => {
    await walkIn()
    const way = allShutWays()[0]
    const [fr, fc] = fork()
    const doorway = step(fork(), way, 1)
    // The same carve with nobody having walked it, so what comes out of the dark below is what this
    // one step reveals and nothing the player did earlier.
    const unwalked = {
      ...seen(),
      cells: seen().cells.map(row => row.map(cell => (cell.type === "empty" ? cell : { ...cell, state: "fogged" }))),
    } as FloorGrid

    const walked = completeCell(unwalked, ...step(fork(), way, 2))
    const stateOf = ([r, c]: [number, number]) => {
      const cell = walked.cells[r][c]
      return cell.type === "empty" ? "empty" : cell.state
    }
    expect(stateOf(doorway)).toBe("reachable")
    expect(stateOf([fr, fc])).toBe("fogged")
  })

  it("is not opened by a save that calls it explored", async () => {
    await walkIn()
    const way = shutWays()[0]
    const [row, col] = step(fork(), way, 1)
    const doorway = at([row, col])
    const key = cellKey(seen(), 0, row, col)
    if (doorway?.type !== "room" || !key) throw new Error("the doorway the switch barred has no key to save")
    const section = doorway.sectionAddress ?? ""
    cleanup()

    await walkIn({ ...STOOD_IN_THE_FORK, [section]: [...(STOOD_IN_THE_FORK[section] ?? []), key] })
    expect(shutWays()).toContain(way)
    expect(stateAt([row, col])).not.toBe("completed")
    expect(stateAt(step(fork(), way, 2))).toBe("fogged")
  })

  it("is not somewhere a save can put the player, so a stale one sends them to the entrance", async () => {
    await walkIn()
    const grid = seen()
    const [row, col] = step(fork(), shutWays()[0], 1)
    const address = cellAddress(grid, 0, row, col)
    if (!address) throw new Error("the doorway the switch barred has no address to save")
    cleanup()

    render(<StandingAt address={address} />)
    await settle()
    expect(standing).toEqual([...seen().entrancePos])
  })
})

describe("a way out the switch has opened", () => {
  beforeEach(async () => {
    await clearGameData()
    await writeGameData({
      storageVersions: { journeys: 3, inventory: 1, answers: 1 },
      journeys: [
        {
          journeyId: JOURNEY,
          levelNr: LEVEL_NR,
          completionCount: 0,
          active: true,
          exploredSections: {},
          position: null,
          interiorLevelNr: null,
          cellKeyVersion: 3,
        },
      ],
    })
  })
  afterEach(() => {
    cleanup()
  })

  it("is walked through like any other corridor, and the floor comes out of the fog behind it", async () => {
    const { container } = render(<Room explored={STOOD_IN_THE_FORK} />)
    await settle()
    const way = shutWays()[0]
    await routeTo(container, way)

    const doorway = step(fork(), way, 1)
    const beyond = step(fork(), way, 2)
    expect(at(doorway)?.type).toBe("corridor")
    expect(stateAt(doorway)).not.toBe("fogged")
    expect(stateAt(beyond)).not.toBe("fogged")
    const walkable = walkableFrom(seen(), fork())
    expect(walkable.has(`${doorway[0]},${doorway[1]}`)).toBe(true)
    expect(walkable.has(`${beyond[0]},${beyond[1]}`)).toBe(true)
  })
})
