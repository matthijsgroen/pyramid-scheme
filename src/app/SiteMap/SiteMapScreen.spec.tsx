import { render, act, fireEvent, cleanup } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import type { FloorConfig, FloorGrid, GridCell } from "@/game/siteTypes"
import { CELL } from "./mapScale"
import { clearGameData } from "@/support/useGameStorage"

// Keys are enough to tell the buttons apart; none of these assertions read copy.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

// The screen's own click handling is what's under test, so the floor comes from here rather than
// from a real assembly the player would have to walk through first.
const entrance: GridCell = { type: "room", roomType: "portal", dirs: new Set(["e"]), state: "completed" }
const corridor: GridCell = { type: "corridor", dirs: new Set(["w", "e"]), state: "completed" }
const exitRoom: GridCell = { type: "room", roomType: "portal", dirs: new Set(["w"]), state: "reachable" }

const grid: FloorGrid = {
  cells: [[entrance, corridor, exitRoom]],
  rows: 1,
  cols: 3,
  entrancePos: [0, 0],
  exitPos: [0, 2],
  siteId: "test-site",
  staircases: {},
}

vi.mock("./useAssembledFloor", async importOriginal => {
  const actual = await importOriginal<typeof import("./useAssembledFloor")>()
  return {
    ...actual,
    useAssembledFloor: () => ({
      grid,
      explorerPos: [0, 0] as readonly [number, number],
      hiddenJunctions: new Set<string>(),
      hiddenSectionHashes: new Set<string>(),
      junctionSections: new Map<string, ReadonlySet<string>>(),
    }),
  }
})

const { SiteMapScreen } = await import("./SiteMapScreen")

const floorConfig: FloorConfig = {
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
}

const settle = async () => {
  await act(async () => {
    await Promise.resolve()
  })
}

// The exit room's own <g>, addressed by the transform SiteMapView gives it (PAD === CELL).
const exitNode = (container: HTMLElement) =>
  container.querySelector<SVGGElement>(`g[transform="translate(${CELL + 2 * CELL + CELL / 2}, ${CELL + CELL / 2})"]`)!

describe(SiteMapScreen, () => {
  beforeEach(async () => {
    // jsdom doesn't implement scrollTo; SiteMapView calls it to center on explorerPos.
    Element.prototype.scrollTo = vi.fn()
    await clearGameData()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  const renderScreen = async (onSiteComplete = () => {}) => {
    const result = render(
      <SiteMapScreen
        journeyId="test-journey"
        siteConfig={[floorConfig]}
        seed={1}
        onSiteComplete={onSiteComplete}
        onCancel={() => {}}
      />
    )
    await settle()
    return result
  }

  const walkToExit = async (container: HTMLElement) => {
    fireEvent.click(exitNode(container))
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
  }

  it("asks before leaving, so walking into an off-screen exit doesn't end the expedition", async () => {
    const onSiteComplete = vi.fn()
    const { container, queryByText } = await renderScreen(onSiteComplete)

    await walkToExit(container)

    expect(queryByText("ui.leaveSiteConfirm")).not.toBeNull()
    expect(onSiteComplete).not.toHaveBeenCalled()
  })

  it("stays in the site when the player turns back at the exit", async () => {
    const onSiteComplete = vi.fn()
    const { container, getByText, queryByText } = await renderScreen(onSiteComplete)
    await walkToExit(container)

    fireEvent.click(getByText("ui.leaveSiteCancel"))

    expect(queryByText("ui.leaveSiteConfirm")).toBeNull()
    expect(onSiteComplete).not.toHaveBeenCalled()
  })

  it("leaves the site once the player confirms", async () => {
    const { container, getByText, queryByText } = await renderScreen()
    await walkToExit(container)

    fireEvent.click(getByText("ui.leaveSiteConfirm"))

    // Confirming hands over to the exit transition, which completes the site when it finishes.
    expect(queryByText("ui.leaveSiteConfirm")).toBeNull()
    expect(container.querySelector(".animate-entrance-zoom")).not.toBeNull()
  })
})
