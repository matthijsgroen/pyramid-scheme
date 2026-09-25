// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from "vitest"
import { act } from "react"
import { cleanup, render, screen } from "@testing-library/react"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { classifyForkShape } from "@/game/forkShape"
import { assembleFloor } from "@/game/siteAssembler"
import type { Direction as WayOut, FloorConfig, RoomCell } from "@/game/siteTypes"
import { cellKey } from "@/mods/core/game/beam/physics"
import { routesTo } from "../../game/shrineBeam/shrineBeam"
import type { LightbeamSwitchBoard } from "../../game/lightbeamSwitch/generateLightbeamSwitch"
import { buildSwitchBoard } from "./plugin"
import { LightbeamSwitchPuzzle } from "./LightbeamSwitchPuzzle"

// Keys tell the copy apart, and the interpolated way out is what several of these assertions are about.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { way?: string }) => (options?.way ? `${key}|${options.way}` : key),
  }),
}))

const WAY = (way: WayOut) => `lightbeamSwitch.way.${way}`
const DOOR_OPEN = (way: WayOut) => `lightbeamSwitch.doorOpen|${WAY(way)}`
const DOOR_SHUT = (way: WayOut) => `lightbeamSwitch.doorShut|${WAY(way)}`

const switchFloor: FloorConfig = {
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

/** One carved fork per shape, taken from a real carve: a hand-written exit list could name a fork the
 * assembler never builds, and the board would then be drawn for nothing. */
const forks = new Map<string, { exits: RoomCell["exits"]; ways: WayOut[]; board: LightbeamSwitchBoard }>()

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  for (let seed = 0; seed < 120 && forks.size < 3; seed++) {
    const result = assembleFloor(`switch-room-${seed}`, switchFloor, seed, resolveEncounter, {
      floorRef: { journeyId: `switch-room-${seed}`, floorIndex: 0 },
    })
    if (!result.success) continue
    for (const fork of result.grid.cells.flat()) {
      if (fork.type !== "room" || fork.roomType !== "fork" || fork.family !== "lightbeamSwitch") continue
      const ways = (fork.exits ?? []).filter(exit => exit.gateKeyId !== undefined).map(exit => exit.dir)
      const shape = classifyForkShape(ways)
      if (!shape || forks.has(shape)) continue
      forks.set(shape, {
        exits: fork.exits,
        ways,
        board: buildSwitchBoard(3, { difficulty: "junior", forkShape: shape, exits: fork.exits }),
      })
    }
  }
}, 120_000)

const forkOf = (shape: string) => {
  const fork = forks.get(shape)
  if (!fork) throw new Error(`no carve offered a ${shape} switch fork`)
  return fork
}

const SHAPES = ["adjacent", "opposite", "three"]

/** The mirrors, as the buttons they are drawn as, in the order the board holds them. */
const mirrorCells = () => screen.getAllByRole("button").filter(el => el.className.includes("aspect-square"))

/** Lays a way out's own route over the open board, one tap per mirror not already lying that way. */
const routeTowards = (board: LightbeamSwitchBoard, shrine: number) => {
  const routes = routesTo(
    board.grid,
    board.shrines.map(at => at.at),
    shrine
  )
  if (routes.length !== 1) throw new Error(`shrine ${shrine} owes ${routes.length} routes, not one`)
  const cells = mirrorCells()
  const angles = [...board.grid.initial]
  for (const { at, angle } of routes[0]) {
    const mirror = board.grid.mirrors.findIndex(candidate => cellKey(candidate) === cellKey(at))
    if (angles[mirror] === angle) continue
    act(() => cells[mirror].click())
    angles[mirror] = angle
  }
}

const renderRoom = (shape: string, openWayOut?: WayOut, onRoute = vi.fn()) => {
  const fork = forkOf(shape)
  render(
    <LightbeamSwitchPuzzle
      board={fork.board}
      exits={fork.exits}
      openWayOut={openWayOut}
      onRoute={onRoute}
      onSolved={vi.fn()}
    />
  )
  return { fork, onRoute }
}

describe("the doors a switch room draws", () => {
  it("draws one shrine per way out the fork shut, at that way out's own bearing", () => {
    for (const shape of SHAPES) {
      const { fork } = renderRoom(shape)
      expect(screen.getAllByLabelText(/^lightbeamSwitch\.way\./), shape).toHaveLength(fork.ways.length)
      for (const way of fork.ways) expect(screen.getAllByLabelText(WAY(way)), `${shape} ${way}`).toHaveLength(1)
      cleanup()
    }
  })

  it("draws one door per way out the fork shut, on the side of the room it leads out of", () => {
    const PLACE: Record<WayOut, string> = {
      n: "col-start-2 row-start-1",
      e: "col-start-3 row-start-2",
      s: "col-start-2 row-start-3",
      w: "col-start-1 row-start-2",
    }
    let drawn = 0
    for (const shape of SHAPES) {
      const { fork } = renderRoom(shape)
      expect(screen.getAllByRole("img"), shape).toHaveLength(fork.ways.length)
      for (const way of fork.ways) {
        expect(screen.getByLabelText(DOOR_SHUT(way)).className, `${shape} ${way}`).toContain(PLACE[way])
        drawn++
      }
      cleanup()
    }
    // Every shape really offered its doors — a sweep that drew none would otherwise pass in silence.
    expect(drawn).toBe(2 + 2 + 3)
  })

  it("says which way out this switch already stands open at, and that the rest are shut", () => {
    const fork = forkOf("three")
    const standing = fork.ways[1]
    renderRoom("three", standing)
    expect(screen.getByLabelText(DOOR_OPEN(standing))).toBeDefined()
    for (const way of fork.ways.filter(other => other !== standing))
      expect(screen.getByLabelText(DOOR_SHUT(way))).toBeDefined()
  })
})

describe("routing the light", () => {
  it("opens the way out it lands on, at every way out of every shape", () => {
    let routed = 0
    for (const shape of SHAPES) {
      const fork = forkOf(shape)
      fork.board.shrines.forEach((shrine, index) => {
        const onRoute = vi.fn()
        renderRoom(shape, undefined, onRoute)
        routeTowards(fork.board, index)
        expect(
          onRoute.mock.calls.map(call => call[0]),
          `${shape} ${shrine.canonicalDir}`
        ).toEqual([shrine.canonicalDir])
        expect(screen.getByLabelText(DOOR_OPEN(shrine.canonicalDir))).toBeDefined()
        for (const way of fork.ways.filter(other => other !== shrine.canonicalDir))
          expect(screen.getByLabelText(DOOR_SHUT(way))).toBeDefined()
        cleanup()
        routed++
      })
    }
    expect(routed).toBe(2 + 2 + 3)
  })

  it("opens nothing while the light still reaches no shrine", () => {
    const { onRoute } = renderRoom("adjacent")
    const cells = mirrorCells()
    expect(cells.length).toBeGreaterThan(1)
    // The board opens in a setting no single turn can light (generateLightbeamSwitch's honest opening),
    // so one tap anywhere is a board that still decides nothing.
    act(() => cells[0].click())
    expect(onRoute).not.toHaveBeenCalled()
  })
})
