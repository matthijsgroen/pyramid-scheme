// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render } from "@testing-library/react"
import { getFamilyPlugin, resolveEncounter, type FamilyContext } from "@/app/families/familyRegistry"
import { useJourneys } from "@/app/state/useJourneys"
import { classifyForkShape } from "@/game/forkShape"
import { assembleFloor } from "@/game/siteAssembler"
import type { Direction as WayOut, FloorConfig, FloorGrid, RoomCell } from "@/game/siteTypes"
import { clearGameData, writeGameData } from "@/support/useGameStorage"
import { cellKey as beamCellKey, type MirrorAngle } from "@/mods/core/game/beam/physics"
import { routesTo } from "../../game/shrineBeam/shrineBeam"
import type { LightbeamSwitchBoard } from "../../game/lightbeamSwitch/generateLightbeamSwitch"
import { cellAddress, cellKey } from "@/app/SiteMap/cellIdentity"
import { encodeEdge } from "@/app/SiteMap/edgeId"
import { useAssembledFloor } from "@/app/SiteMap/useAssembledFloor"
import { useEncounter } from "@/app/SiteMap/useEncounter"
import { PuzzleRoomContext } from "@/mods/core/app/puzzleState"
import { useOpenWaysOut } from "@/app/SiteMap/useOpenWaysOut"
import "@/mods/registerModApps"

// Keys are enough to tell the controls apart; nothing here reads the copy.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const JOURNEY = "junior_2"
const LEVEL_NR = 2

// A floor that carves a junction and stands a switch in it. Authored here rather than taken from the
// baked world, because what is under test is the doors, not which pyramid happens to hold one.
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

// The first seed whose carve stands a switch in a junction with three ways out — three, so "the others
// shut" is a claim about more than one door — and the save of a player who has walked as far as it.
const { SEED, STOOD_IN_THE_FORK } = (() => {
  for (let seed = 0; seed < 200; seed++) {
    const result = assembleFloor(JOURNEY, floorConfig, seed, resolveEncounter, {
      floorRef: { journeyId: JOURNEY, levelIndex: LEVEL_NR - 1, floorIndex: 0 },
    })
    if (!result.success) continue
    const fork = forkIn(result.grid)
    if (!fork || (fork.cell.exits ?? []).filter(exit => exit.gateKeyId).length < 3) continue
    const key = cellKey(result.grid, 0, fork.at[0], fork.at[1])
    if (!key) throw new Error("the carved fork has no key to file it under")
    return { SEED: seed, STOOD_IN_THE_FORK: { [fork.cell.sectionAddress ?? ""]: [key] } }
  }
  throw new Error("no seed carved a switch fork with three shut ways out")
})()

/** What the screen is looking at: the floor as the switch has left it, and the room's own board. */
type Seen = { grid: FloorGrid | null; board?: LightbeamSwitchBoard; ctx?: FamilyContext; enter?: () => void }
const latest: Seen = { grid: null }
// Reported through a call rather than written to from the render: a component may not reach out and
// assign to what lives around it, and a spec's harness is no exception.
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
  // The switch reads its board, its room and the journey; the rest of a family's props are core's other
  // services and this room never asks for one.
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

// The save of a player standing in this pyramid: a switch files its answer against the ACTIVE journey,
// so without one nothing it decides is ever written down.
const standingInThisPyramid = async () => {
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
}

const board = (): LightbeamSwitchBoard => {
  if (!latest.board) throw new Error("the switch room never rendered a board")
  return latest.board
}

/** The id each of the fork's shut ways out is named by, in the order the room carries them. */
const wayOutIds = (): Map<WayOut, string> => {
  const map = new Map<WayOut, string>()
  for (const exit of latest.ctx?.exits ?? []) if (exit.gateKeyId) map.set(exit.dir, exit.gateKeyId)
  return map
}

/** Where each way out's door cell stands, found once while every one of them is still shut. */
const doorPlaces = (): Map<WayOut, [number, number]> => {
  const grid = latest.grid
  if (!grid) throw new Error("no floor")
  const places = new Map<WayOut, [number, number]>()
  const byId = new Map([...wayOutIds()].map(([way, id]) => [id, way]))
  for (let row = 0; row < grid.rows; row++)
    for (let col = 0; col < grid.cols; col++) {
      const cell = grid.cells[row][col]
      const way = cell.type === "room" && cell.requiredKeyId ? byId.get(cell.requiredKeyId) : undefined
      if (way) places.set(way, [row, col])
    }
  if (places.size !== byId.size) throw new Error(`${byId.size} ways out were shut, and ${places.size} doors stand`)
  return places
}

/**
 * How each door stands right now, read at the cell it was cut into.
 *
 * Shut is the gate the assembler made; open is the corridor node it was cut FROM, put back whole — same
 * walls, same section, same place along the walk. Anything else is neither, and throws rather than count
 * as one of them.
 */
const doors = (places: Map<WayOut, [number, number]>): Record<string, "open" | "shut"> => {
  const grid = latest.grid
  if (!grid) throw new Error("no floor")
  const ids = wayOutIds()
  return Object.fromEntries(
    [...places].map(([way, [row, col]]) => {
      const cell = grid.cells[row][col]
      if (cell.type === "room" && cell.requiredKeyId === ids.get(way) && cell.tags?.includes("gate"))
        return [way, "shut" as const]
      if (cell.type === "corridor") return [way, "open" as const]
      throw new Error(`the ${way} door is a ${cell.type} that is neither shut nor open`)
    })
  )
}

/** The mirrors of the open board, as the buttons they are drawn as, in the order the board holds them. */
const mirrorCells = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>("button")).filter(el => el.className.includes("aspect-square"))

/** The one route that lands the light on a way out's shrine, as the mirrors it turns. */
const routeFor = (way: WayOut) => {
  const shrine = board().shrines.findIndex(candidate => candidate.canonicalDir === way)
  if (shrine === -1) throw new Error(`the board carries no shrine for the ${way} way out`)
  const routes = routesTo(
    board().grid,
    board().shrines.map(at => at.at),
    shrine
  )
  if (routes.length !== 1) throw new Error(`the ${way} shrine owes ${routes.length} routes, not one`)
  return routes[0]
}

/** Which mirror of the board stands on a route's cell. */
const mirrorAt = (at: Parameters<typeof beamCellKey>[0]): number =>
  board().grid.mirrors.findIndex(candidate => beamCellKey(candidate) === beamCellKey(at))

/** How the mirrors lie once the light has been sent to `way` from the setting the board opens in. */
const angledFor = (way: WayOut): MirrorAngle[] => {
  const angles = [...board().grid.initial]
  for (const { at, angle } of routeFor(way)) angles[mirrorAt(at)] = angle
  return angles
}

/** Sends the light to one way out's shrine, the way a player does: one tap per mirror to turn. */
const routeTo = async (container: HTMLElement, way: WayOut, from: readonly MirrorAngle[] = board().grid.initial) => {
  const cells = mirrorCells(container)
  const angles = [...from]
  for (const { at, angle } of routeFor(way)) {
    const mirror = mirrorAt(at)
    if (angles[mirror] === angle) continue
    await act(async () => {
      cells[mirror].click()
    })
    angles[mirror] = angle
  }
  await settle()
}

/** One step of the map, per bearing — what "the cell just beyond that door" means. */
const STEP: Record<WayOut, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

const wallsOf = (grid: FloorGrid | null) =>
  (grid?.cells ?? [])
    .map(row => row.map(cell => (cell.type === "empty" ? "" : [...cell.dirs].sort().join(""))).join("|"))
    .join("\n")

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.scrollTo = () => {}
})

describe("the ways out of a fork a switch stands in", () => {
  beforeEach(async () => {
    await standingInThisPyramid()
  })
  afterEach(() => {
    cleanup()
  })

  const walkIn = async (explored: Record<string, string[]> = {}) => {
    const result = render(<Room explored={explored} />)
    await settle()
    return result
  }

  it("are all shut until the board in it says otherwise", async () => {
    await walkIn()
    expect(Object.values(doors(doorPlaces()))).toEqual(["shut", "shut", "shut"])
  })

  /** THE RULING. One solve, one configuration: routing to a way out opens that one and shuts the rest,
   * and routing to another moves which is open rather than opening a second. */
  it("open the one the light is routed to, and shut every other one", async () => {
    const { container } = await walkIn()
    const places = doorPlaces()
    const ways = [...wayOutIds().keys()]
    const first = ways[0]
    await routeTo(container, first)
    expect(doors(places)).toEqual(Object.fromEntries(ways.map(way => [way, way === first ? "open" : "shut"])))
  })

  it("move which one is open when the player walks back in and routes it elsewhere", async () => {
    const { container, rerender } = await walkIn()
    const places = doorPlaces()
    const ways = [...wayOutIds().keys()]
    await routeTo(container, ways[0])
    expect(doors(places)[ways[0]]).toBe("open")

    // Walking out and back in: the room is re-enterable, so the board is offered again from the start.
    rerender(<Room key="second visit" />)
    await settle()
    await routeTo(container, ways[2])

    expect(doors(places)).toEqual(Object.fromEntries(ways.map(way => [way, way === ways[2] ? "open" : "shut"])))
  })

  /**
   * An opened way out is ground the player carries on over, so the floor has to come out of the fog
   * THROUGH it. Reachability spreads out of the cells the save calls explored, so a way out opened after
   * that pass would stand open with the dark still behind it until something else redrew the floor.
   */
  it("come out of the fog with the rest of the floor, rather than after it", async () => {
    const { container } = await walkIn(STOOD_IN_THE_FORK)
    const places = doorPlaces()
    const grid = () =>
      latest.grid ??
      (() => {
        throw new Error("no floor")
      })()
    // A door the walk can carry straight on through: a corner is looked round rather than walked past,
    // whatever stands in it, so it would say nothing about the door.
    const straight = [...places].find(([way, [row, col]]) => {
      const cell = grid().cells[row][col]
      return cell.type !== "empty" && cell.dirs.has(way) && cell.dirs.size === 2
    })
    if (!straight) throw new Error("no shut way out of this fork runs straight on from the junction")
    const [way, [row, col]] = straight
    const [dr, dc] = STEP[way]
    const beyond = () => {
      const cell = grid().cells[row + dr][col + dc]
      return cell.type === "empty" ? "empty" : cell.state
    }

    expect(beyond()).toBe("fogged")
    await routeTo(container, way)
    expect(doors(places)[way]).toBe("open")
    expect(beyond()).not.toBe("fogged")
  })

  it("give the opened way out back the very corridor node it was cut from", async () => {
    const { container } = await walkIn()
    const places = doorPlaces()
    const ways = [...wayOutIds().keys()]
    const [row, col] = places.get(ways[0])!
    const shut = latest.grid!.cells[row][col]
    await routeTo(container, ways[0])
    const open = latest.grid!.cells[row][col]
    if (shut.type === "empty" || open.type === "empty") throw new Error("a door stood on no cell at all")
    expect(open.type).toBe("corridor")
    expect([...open.dirs].sort()).toEqual([...shut.dirs].sort())
    expect(open.sectionAddress).toBe(shut.sectionAddress)
    expect(open.ordinal).toBe(shut.ordinal)
  })

  it("leave the floor's own walls exactly where the carve put them, whichever one is open", async () => {
    const { container } = await walkIn()
    const places = doorPlaces()
    const carved = wallsOf(latest.grid)
    const ways = [...wayOutIds().keys()]
    await routeTo(container, ways[1])
    expect(doors(places)[ways[1]]).toBe("open")
    expect(wallsOf(latest.grid)).toBe(carved)
  })
})

const NO_KEYS: ReadonlySet<string> = new Set()
const NOTHING_EXPLORED: Record<string, string[]> = {}

/**
 * The room as core opens it: useEncounter deals the board, names the slot its unfinished state is filed
 * under, and decides what of that state a solve leaves behind. A harness that renders the family straight
 * sees none of it, which is exactly where a board that disagreed with its own doors could hide.
 */
const Visited = () => {
  const journeys = useJourneys()
  const open = useOpenWaysOut(journeys, JOURNEY)
  const { grid } = useAssembledFloor(
    JOURNEY,
    floorConfig,
    SEED,
    0,
    NOTHING_EXPLORED,
    null,
    0,
    undefined,
    LEVEL_NR - 1,
    open
  )
  const encounter = useEncounter({
    journeys,
    journeyId: JOURNEY,
    levelNr: LEVEL_NR,
    currentFloor: 0,
    difficulty: floorConfig.difficulty,
    grid,
    ownedKeys: NO_KEYS,
    onReward: () => {},
  })
  const fork = grid ? forkIn(grid) : undefined
  report({
    grid,
    enter: fork ? () => encounter.open(fork.at, true) : undefined,
    ...(encounter.ctx ? { ctx: encounter.ctx, board: encounter.puzzle as LightbeamSwitchBoard } : {}),
  })
  const Component = encounter.family?.Component
  if (!Component || !encounter.ctx || !encounter.isOpen) return null
  // The switch reads its board, its room and the journey; the rest of a family's props are core's other
  // services and this room never asks for one.
  const services = undefined as never
  return (
    <PuzzleRoomContext value={encounter.roomKey}>
      <Component
        puzzle={encounter.puzzle}
        ctx={encounter.ctx}
        journeys={journeys}
        progression={services}
        inventory={services}
        applyReward={services}
        onSolved={encounter.solved}
        onCancel={encounter.cancel}
      />
    </PuzzleRoomContext>
  )
}

/** How every mirror on the open board lies, read off the glyphs the player is looking at. */
const mirrorAngles = (container: HTMLElement): string[] =>
  mirrorCells(container).map(cell => cell.querySelector("g")?.getAttribute("style") ?? "")

/** The way out whose shrine the light is standing in, read off the glyph in that shrine's own cell. */
const litShrine = (container: HTMLElement): WayOut | undefined =>
  [...wayOutIds().keys()].find(way => {
    const shrine = container.querySelector(`[aria-label="lightbeamSwitch.way.${way}"] path`)
    return shrine?.getAttribute("class")?.includes("fill-amber-200") ?? false
  })

describe("the board of a switch walked back into", () => {
  beforeEach(async () => {
    await standingInThisPyramid()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  const walkIn = async () => {
    await act(async () => {
      latest.enter?.()
    })
    await settle()
    await settle()
  }

  /** Dismissing the solved board is what hands the room back to core, and what closes it. */
  const leaveThroughTheBanner = async () => {
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    const banner = Array.from(document.querySelectorAll<HTMLElement>("button")).find(candidate =>
      candidate.textContent?.includes("ui.puzzleCompleted")
    )
    if (!banner) throw new Error("the board never reported itself solved")
    await act(async () => {
      banner.click()
    })
    await settle()
    await settle()
  }

  it("lies the way it was left, with the shrine of the open way out lit", async () => {
    const { container, rerender } = render(<Visited />)
    await settle()
    await walkIn()
    const places = doorPlaces()
    const ways = [...wayOutIds().keys()]
    const dark = mirrorAngles(container)
    await routeTo(container, ways[0])
    const routed = mirrorAngles(container)
    // Without this the comparison below could be two readings of nothing agreeing with each other.
    expect(routed).not.toEqual(dark)
    await leaveThroughTheBanner()
    expect(doors(places)[ways[0]]).toBe("open")

    rerender(<Visited key="walked back in" />)
    await settle()
    await walkIn()

    expect(mirrorAngles(container)).toEqual(routed)
    expect(litShrine(container)).toBe(ways[0])
  })

  it("takes a new routing, which opens that way out and shuts the one that stood open", async () => {
    const { container, rerender } = render(<Visited />)
    await settle()
    await walkIn()
    const places = doorPlaces()
    const ways = [...wayOutIds().keys()]
    await routeTo(container, ways[0])
    await leaveThroughTheBanner()

    rerender(<Visited key="walked back in" />)
    await settle()
    await walkIn()
    await routeTo(container, ways[2], angledFor(ways[0]))

    expect(litShrine(container)).toBe(ways[2])
    expect(doors(places)).toEqual(Object.fromEntries(ways.map(way => [way, way === ways[2] ? "open" : "shut"])))
  })
})
