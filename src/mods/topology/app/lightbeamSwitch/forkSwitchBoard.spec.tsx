// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { getFamilyPlugin, resolveEncounter, type FamilyContext } from "@/app/families/familyRegistry"
import { classifyForkShape } from "@/game/forkShape"
import { assembleFloor } from "@/game/siteAssembler"
import type { Direction as WayOut, FloorConfig, FloorGrid, RoomCell } from "@/game/siteTypes"
import { keyColorHex } from "@/ui/tokens/keyColors"
import "@/mods/registerModApps"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { way?: string }) => (options?.way ? `${key}|${options.way}` : key),
  }),
}))

const MOVE: Record<WayOut, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const DOOR_OPEN = (way: WayOut) => `lightbeamSwitch.doorOpen|lightbeamSwitch.way.${way}`
const DOOR_SHUT = (way: WayOut) => `lightbeamSwitch.doorShut|lightbeamSwitch.way.${way}`

const JOURNEY = "fork-switch-board"

// The fork named by region with a fork-switch standing in it: two chains hang off `entrance`, and each
// of their first cells is a gate the switch owns.
const floor: FloorConfig = {
  pathPuzzles: 0,
  packing: 7,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 0, difficulty: "junior", end: "treasure" },
    { pathPuzzles: 0, difficulty: "junior", end: "treasure" },
  ],
  forks: [{ in: "entrance" }],
  regionLayout: {
    regions: [
      { name: "entrance", appetite: "free" },
      { name: "leftLower", appetite: "free" },
      { name: "rightLower", appetite: "free" },
      { name: "wayOut", appetite: "free" },
    ],
    connections: [
      ["entrance", "leftLower"],
      ["entrance", "rightLower"],
      ["entrance", "wayOut"],
    ],
    in: "entrance",
    out: "wayOut",
  },
  obstacles: [
    { id: "forkLeft", kind: "gate", at: { on: "connection", between: ["entrance", "leftLower"] }, owners: ["Y"] },
    { id: "forkRight", kind: "gate", at: { on: "connection", between: ["entrance", "rightLower"] }, owners: ["Y"] },
  ],
  controls: [{ id: "Y", in: "entrance", control: "fork-switch", encounter: "lightbeamSwitch" }],
}

type Carved = { grid: FloorGrid; junction: RoomCell; at: [number, number] }
let carved: Carved | undefined

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  for (let seed = 1; seed <= 120 && !carved; seed++) {
    const result = assembleFloor(JOURNEY, floor, seed, resolveEncounter, {
      floorRef: { journeyId: JOURNEY, floorIndex: 0 },
    })
    if (!result.success) continue
    result.grid.cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell.type === "room" && cell.mechanismId === "Y") carved = { grid: result.grid, junction: cell, at: [r, c] }
      })
    )
  }
}, 120_000)

afterEach(cleanup)

const seamExits = (junction: RoomCell) => (junction.exits ?? []).filter(exit => exit.gateKeyId !== undefined)

/** The board as the app mounts it: the family plugin, the junction's own ctx, the save a player has. */
const renderBoard = (stored?: string) => {
  const { junction } = carved!
  const plugin = getFamilyPlugin("lightbeamSwitch")!
  const address = "fork-switch-address"
  const ctx: FamilyContext = {
    journeyId: JOURNEY,
    levelNr: 1,
    edgeId: "e",
    address,
    sectionHash: "",
    freshArrival: true,
    difficulty: "junior",
    boardIndex: junction.boardIndex,
    exits: junction.exits,
    forkShape: classifyForkShape(seamExits(junction).map(exit => exit.dir)),
    mark: junction.mark,
  }
  const journeys = {
    getMechanismStates: () => new Map(stored === undefined ? [] : [[address, stored]]),
    setMechanismState: vi.fn(),
  } as never
  const services = undefined as never
  const Component = plugin.Component
  render(
    <Component
      puzzle={plugin.generate(0, ctx)}
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

/** Every doorway the board draws, by the way out it stands for. */
const doorways = () =>
  screen.getAllByRole("img").map(el => ({
    el,
    way: /way\.([nesw])$/.exec(el.getAttribute("aria-label")!)![1] as WayOut,
    open: el.getAttribute("aria-label")!.startsWith("lightbeamSwitch.doorOpen"),
  }))

describe("the board standing in a fork-switch's junction", () => {
  it("draws a doorway for each seam exit in its real compass direction, and none for the main path onward", () => {
    expect(carved).toBeDefined()
    renderBoard()
    expect(
      doorways()
        .map(door => door.way)
        .sort()
    ).toEqual(
      seamExits(carved!.junction)
        .map(exit => exit.dir)
        .sort()
    )
    expect(seamExits(carved!.junction)).toHaveLength(2)
  })

  it("draws each doorway with the mark its own gate wears on the map", () => {
    renderBoard()
    const { grid, junction, at } = carved!
    for (const { el, way } of doorways()) {
      const [dr, dc] = MOVE[way]
      const gate = grid.cells[at[0] + dr * 2][at[1] + dc * 2] as RoomCell
      expect(gate.mark).toBeDefined()
      expect(el.textContent, way).toContain(String.fromCodePoint(gate.mark!.glyph))
      expect(el.querySelector("circle")?.getAttribute("fill"), way).toBe(keyColorHex[gate.mark!.color].reachable)
      expect(junction.exits!.find(exit => exit.dir === way)!.mark).toEqual(gate.mark)
    }
  })

  it("shuts every doorway while the stored state is rest", () => {
    renderBoard("rest")
    for (const { el, way } of doorways()) expect(el.getAttribute("aria-label"), way).toBe(DOOR_SHUT(way))
  })

  it("draws open the one doorway whose gate the stored state names, and shut the other", () => {
    const exits = seamExits(carved!.junction)
    for (const standing of exits) {
      renderBoard(standing.gateKeyId)
      for (const { el, way } of doorways())
        expect(el.getAttribute("aria-label"), `${standing.dir} stored, ${way}`).toBe(
          way === standing.dir ? DOOR_OPEN(way) : DOOR_SHUT(way)
        )
      cleanup()
    }
  })
})
