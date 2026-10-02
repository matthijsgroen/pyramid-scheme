// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, renderHook, screen, within } from "@testing-library/react"
import "@/mods/registerModApps"
import { getFamilyPlugin } from "@/app/families/familyRegistry"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { useAssembledFloor } from "@/app/SiteMap/useAssembledFloor"
import { useEncounter } from "@/app/SiteMap/useEncounter"
import { cellAddress } from "@/game/cellAddress"
import type { FloorGrid, RoomCell } from "@/game/siteTypes"
import { andDoorFloor } from "@/game/testSupport/gateFaceFixtures"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}|${Object.values(options).join(",")}` : key,
  }),
}))

afterEach(cleanup)

const JOURNEY = "gate-face-journey"
const SEED = 3
const CONFIG = andDoorFloor()

const doorAt = (grid: FloorGrid) => {
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "room" && cell.gateFace) return { at: [r, c] as const, cell }
    }
  return undefined
}

const ownersAt = (grid: FloorGrid) =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) =>
      cell.type === "room" && cell.mechanism ? [{ id: cell.mechanismId!, address: cellAddress(grid, 0, r, c)! }] : []
    )
  )

// The floor as a player meets it — real carve, real registry — with the door's reading open on it.
const stand = (states: Record<string, string>) => {
  const mechanismSetter = vi.fn()
  const markExplored = vi.fn()
  const journeys = {
    markCellExplored: markExplored,
    setMechanismState: mechanismSetter,
    getMechanismStates: () => new Map<string, string>(),
  } as unknown as JourneyAPI
  const first = renderHook(() => useAssembledFloor(JOURNEY, CONFIG, SEED, 0, {}, null, 0, new Set()))
  const owners = ownersAt(first.result.current.grid!)
  first.unmount()
  const positions = new Map(owners.filter(o => states[o.id] !== undefined).map(o => [o.address, states[o.id]]))
  const hook = renderHook(() => {
    const floor = useAssembledFloor(JOURNEY, CONFIG, SEED, 0, {}, null, 0, new Set(), undefined, positions)
    const encounter = useEncounter({
      journeys,
      journeyId: JOURNEY,
      levelNr: 1,
      currentFloor: 0,
      difficulty: "expert",
      grid: floor.grid,
      ownedKeys: floor.openGateKeys,
      onReward: vi.fn(),
    })
    return { floor, encounter }
  })
  return { hook, journeys, mechanismSetter, markExplored, positions }
}

const read = (states: Record<string, string>) => {
  const setup = stand(states)
  const grid = setup.hook.result.current.floor.grid!
  const door = doorAt(grid)!
  act(() => setup.hook.result.current.encounter.open(door.at, true))
  const { family, ctx, puzzle } = setup.hook.result.current.encounter
  const onCancel = vi.fn()
  const onSolved = vi.fn()
  const Component = family!.Component
  render(
    <Component
      puzzle={puzzle}
      ctx={ctx!}
      progression={{} as never}
      journeys={setup.journeys as never}
      inventory={{} as never}
      applyReward={vi.fn()}
      onSolved={onSolved}
      onCancel={onCancel}
    />
  )
  return { ...setup, grid, door, onCancel, onSolved }
}

const markers = () => screen.getAllByRole("listitem")

describe("the face of a door that waits on a torch and a lever", () => {
  it("is the family the shut door stands in, found in the real registry", () => {
    const { hook } = stand({})
    const door = doorAt(hook.result.current.floor.grid!)!
    expect(getFamilyPlugin(door.cell.family!)?.meta.ownerMod).toBe("topology")
  })

  it("can be read while the door is shut: one marker per owner, each with its own icon", () => {
    const { door } = read({ flame: "unlit", beam: "left" })
    expect(door.cell.requiredKeyId).toBeDefined()
    expect(markers()).toHaveLength(2)
    const icons = markers().map(m => m.textContent)
    expect(icons.sort()).toEqual(["🎚️", "🔥"])
  })

  it("lights the marker of an owner that names the door and leaves the other dark", () => {
    read({ flame: "lit", beam: "left" })
    const lit = markers().filter(m => m.getAttribute("data-lit") === "true")
    expect(lit).toHaveLength(1)
    expect(lit[0].textContent).toBe("🔥")
  })

  it("lights both markers once both owners name the door, and the door is then no longer shut", () => {
    const { hook } = stand({ flame: "lit", beam: "right" })
    expect(doorAt(hook.result.current.floor.grid!)).toBeUndefined()
    expect(hook.result.current.floor.openGateKeys.size).toBe(1)
  })

  it("keeps the door shut and changes nothing when read: no mechanism written, nothing marked explored, nothing solved", () => {
    const { mechanismSetter, markExplored, onCancel, onSolved, hook, door } = read({ flame: "lit", beam: "left" })
    fireEvent.click(screen.getByRole("button", { name: "gate.turnAround" }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onSolved).not.toHaveBeenCalled()
    expect(mechanismSetter).not.toHaveBeenCalled()
    expect(markExplored).not.toHaveBeenCalled()
    const now = hook.result.current.floor.grid!
    const still = now.cells[door.at[0]][door.at[1]] as RoomCell
    expect(still.requiredKeyId).toBe(door.cell.requiredKeyId)
    expect(still.state).not.toBe("completed")
    expect(hook.result.current.floor.openGateKeys.size).toBe(0)
  })

  it("offers nothing but turning around: no control on the face can open the door", () => {
    read({ flame: "unlit", beam: "left" })
    const buttons = screen.getAllByRole("button")
    expect(buttons.map(b => b.textContent)).toEqual(["gate.turnAround"])
    expect(within(document.body).queryByText("gate.pass")).toBeNull()
  })
})

describe("the face of a door that waits on torches and a floor key", () => {
  it("draws a key for the key owner and a flame for each torch, lit as each stands", () => {
    const Component = getFamilyPlugin("gate-face")!.Component
    render(
      <Component
        puzzle={{}}
        ctx={
          {
            gateFace: {
              markers: [
                { id: "a", icon: { kind: "mechanism", family: "torch" }, lit: true },
                { id: "b", icon: { kind: "mechanism", family: "torch" }, lit: false },
                { id: "k", icon: { kind: "key", color: "red" }, lit: false },
              ],
            },
          } as never
        }
        progression={{} as never}
        journeys={{} as never}
        inventory={{} as never}
        applyReward={vi.fn()}
        onSolved={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const items = markers()
    expect(items.map(m => m.textContent)).toEqual(["🔥", "🔥", ""])
    expect(items[2].querySelector("svg")).not.toBeNull()
    expect(items.map(m => m.getAttribute("data-lit"))).toEqual(["true", "false", "false"])
  })
})
