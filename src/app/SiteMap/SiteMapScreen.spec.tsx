// @vitest-environment jsdom
import { render, act, fireEvent, cleanup } from "@testing-library/react"
import { describe, expect, it, vi, beforeAll, beforeEach, afterEach } from "vitest"
import type { FloorConfig, FloorGrid, GridCell, KeyColor, RoomCell, TombKeyReward } from "@/game/siteTypes"
import { CELL, cellCenter } from "./mapScale"
import { clearGameData } from "@/support/useGameStorage"
import { registerFamily, resolveEncounter } from "@/app/families/familyRegistry"
import { registerHeldKeysProvider } from "@/app/SiteMap/keyProviders"
import { assembleFloor } from "@/game/siteAssembler"
import { completeCell, revealAll } from "@/game/gridNavigation"
import { allFloors, resolveKeyRequirements } from "./worldFloors.testing"

// Keys are enough to tell the buttons apart; none of these assertions read copy. Interpolated data
// is appended so a label built from a nested lookup (the key ring's "<colour> key — in hand") still
// says which colour it stands for.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key),
  }),
}))

// The screen's own click handling is what's under test, so the floor comes from here rather than
// from a real assembly the player would have to walk through first.
const entrance: GridCell = { type: "room", roomType: "portal", dirs: new Set(["e"]), state: "completed" }
const corridor: GridCell = { type: "corridor", dirs: new Set(["w", "e"]), state: "completed" }
const exitRoom: GridCell = { type: "room", roomType: "portal", dirs: new Set(["w"]), state: "reachable" }

const gridOf = (cells: GridCell[]): FloorGrid => ({
  cells: [cells],
  rows: 1,
  cols: cells.length,
  entrancePos: [0, 0],
  exitPos: [0, cells.length - 1],
  siteId: "test-site",
  staircases: {},
})

const walkableFloor = gridOf([entrance, corridor, exitRoom])
// Swapped per test (the mock below reads it lazily), so a floor-key test can supply its own layout.
let grid: FloorGrid = walkableFloor
// Where the explorer stands when the screen mounts. A carved floor's entrance is not [0,0].
let explorerPos: readonly [number, number] = [0, 0]
// What a floor's own mechanisms currently hold open, the way the real hook would compute it from the
// stored lever/control positions. Swapped per test, same as `grid`.
let openGateKeys: ReadonlySet<string> = new Set()

vi.mock("./useAssembledFloor", async importOriginal => {
  const actual = await importOriginal<typeof import("./useAssembledFloor")>()
  return {
    ...actual,
    useAssembledFloor: () => ({
      grid,
      explorerPos,
      hiddenJunctions: new Set<string>(),
      hiddenSections: new Set<string>(),
      junctionSections: new Map<string, ReadonlySet<string>>(),
      openGateKeys,
    }),
  }
})

// The keys a save carries into a site, the way the tomb-treasure mod hands them over.
let heldWardKeys: ReadonlySet<string> = new Set()
registerHeldKeysProvider(() => heldWardKeys)

type CarvedKeys = {
  grid: FloorGrid
  chestAt: readonly [number, number]
  doorAt: readonly [number, number]
  doorColor: KeyColor
  wardAt: readonly [number, number]
  wardKeyId: string
}

// The first baked floor carrying all three at once: a chest whose tombKey reward opens a coloured
// door standing on the same floor, and a ward gate wanting a key no chest here holds. Its colour is
// required to be the only one of its hue on the floor, so a ring reading that colour can only be
// reading this door.
const carvedFloorWithKeys = (): CarvedKeys | null => {
  for (const floor of allFloors()) {
    const result = assembleFloor(floor.journeyId, floor.config, floor.seed, resolveEncounter, {
      resolveKeyRequirements,
      floorRef: { journeyId: floor.journeyId, levelIndex: floor.levelIndex, floorIndex: floor.floorIndex },
    })
    if (!result.success) continue
    const rooms: { cell: RoomCell; at: readonly [number, number] }[] = []
    result.grid.cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell.type === "room") rooms.push({ cell, at: [r, c] })
      })
    )
    const chest = rooms.find(({ cell }) => cell.reward?.type === "tombKey" && !!cell.keyColor)
    if (!chest) continue
    const keyId = (chest.cell.reward as TombKeyReward).keyId
    const door = rooms.find(({ cell }) => cell.gateVariant === "floor-key" && cell.requiredKeyId === keyId)
    const ward = rooms.find(({ cell }) => cell.gateVariant === "tomb-key" && !!cell.requiredKeyId)
    if (!door?.cell.keyColor || !ward?.cell.requiredKeyId) continue
    const sameHue = rooms.filter(({ cell }) => cell.gateVariant === "floor-key" && cell.keyColor === door.cell.keyColor)
    if (sameHue.length !== 1) continue
    return {
      grid: result.grid,
      chestAt: chest.at,
      doorAt: door.at,
      doorColor: door.cell.keyColor,
      wardAt: ward.at,
      wardKeyId: ward.cell.requiredKeyId,
    }
  }
  return null
}

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

// A cell's own marker box, addressed by where SiteMapView puts it: a marker's box IS its cell.
const nodeAt = (container: HTMLElement, col: number, row = 0) => {
  const { cx, cy } = cellCenter(row, col)
  return Array.from(container.querySelectorAll<HTMLElement>("[data-marker-cell]")).find(
    el => parseFloat(el.style.left) === cx - CELL / 2 && parseFloat(el.style.top) === cy - CELL / 2
  )!
}
const exitNode = (container: HTMLElement) => nodeAt(container, 2)

describe(SiteMapScreen, () => {
  beforeEach(async () => {
    grid = walkableFloor
    explorerPos = [0, 0]
    heldWardKeys = new Set()
    openGateKeys = new Set()
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
        levelIndex={0}
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

  /** The button the walk leaves standing beside the explorer, or a failure saying there is none. */
  const goInPrompt = (container: HTMLElement) => {
    const prompt = container.querySelector<HTMLElement>("[data-map-prompt] button")
    if (!prompt) throw new Error("the walk left no way in beside the explorer")
    return prompt
  }

  const takeTheWayOut = async (container: HTMLElement) => {
    await walkToExit(container)
    fireEvent.click(goInPrompt(container))
    await settle()
  }

  it("offers the way out beside the explorer, and asks nothing until it is taken", async () => {
    const onSiteComplete = vi.fn()
    const { container, queryByText } = await renderScreen(onSiteComplete)

    await walkToExit(container)

    expect(goInPrompt(container).textContent).toBe("ui.prompt.exit")
    // Beside the explorer, which is the cell he walked to — not wherever he set off from.
    const hanging = container.querySelector<HTMLElement>("[data-map-prompt]")!
    expect(parseFloat(hanging.style.left)).toBe(cellCenter(0, 2).cx)
    expect(queryByText("ui.leaveSiteConfirm")).toBeNull()
    expect(onSiteComplete).not.toHaveBeenCalled()
  })

  it("takes the prompt away when the player walks back off the exit", async () => {
    const { container, queryByText } = await renderScreen()
    await walkToExit(container)

    fireEvent.click(nodeAt(container, 0))
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(container.querySelector("[data-map-prompt]")).toBeNull()
    expect(queryByText("ui.leaveSiteConfirm")).toBeNull()
  })

  it("asks before leaving, so walking into an off-screen exit doesn't end the expedition", async () => {
    const onSiteComplete = vi.fn()
    const { container, queryByText } = await renderScreen(onSiteComplete)

    await takeTheWayOut(container)

    expect(queryByText("ui.leaveSiteConfirm")).not.toBeNull()
    expect(onSiteComplete).not.toHaveBeenCalled()
  })

  it("stays in the site when the player turns back at the exit", async () => {
    const onSiteComplete = vi.fn()
    const { container, getByText, queryByText } = await renderScreen(onSiteComplete)
    await takeTheWayOut(container)

    fireEvent.click(getByText("ui.leaveSiteCancel"))

    expect(queryByText("ui.leaveSiteConfirm")).toBeNull()
    expect(onSiteComplete).not.toHaveBeenCalled()
  })

  it("leaves the site once the player confirms", async () => {
    const { container, getByText, queryByText } = await renderScreen()
    await takeTheWayOut(container)

    fireEvent.click(getByText("ui.leaveSiteConfirm"))

    // Confirming hands over to the exit transition, which completes the site when it finishes.
    expect(queryByText("ui.leaveSiteConfirm")).toBeNull()
    expect(container.querySelector(".animate-entrance-zoom")).not.toBeNull()
  })

  describe("what the prompt beside the explorer says", () => {
    // A room the player stands in, whatever it holds: the state a fork is in from the moment it is
    // walked into, which is before its board has ever been opened.
    const roomOf = (cell: Partial<GridCell> & Pick<GridCell, "type">): GridCell =>
      ({ roomType: "encounter", dirs: new Set(["w"]), state: "completed", ...cell }) as GridCell

    const stallStocking = (family: string): GridCell =>
      roomOf({ type: "room", family, tags: ["shop"], stock: [{ type: "consumable", itemId: "bandage" }] })

    const QUIET_FAMILY = "spec-quiet"
    registerFamily({
      meta: {
        id: QUIET_FAMILY,
        ownerMod: "test",
        tags: ["puzzle"],
        icon: "",
        color: "",
        rewardPriority: 0,
        reEnterable: true,
      },
      generate: () => null,
      Component: () => null,
    })

    const promptAtCol1 = async (cell: GridCell) => {
      grid = gridOf([entrance, cell])
      const { container } = await renderScreen()
      fireEvent.click(nodeAt(container, 1))
      await act(async () => {
        vi.advanceTimersByTime(1000)
      })
      return goInPrompt(container).textContent
    }

    it("asks a switch fork for its mirrors, on a board the player has never once opened", async () => {
      expect(await promptAtCol1(roomOf({ type: "room", roomType: "fork", family: "lightbeamSwitch" }))).toBe(
        "lightbeamSwitch.invitation"
      )
    })

    it("asks the shop for a look over its stall", async () => {
      expect(await promptAtCol1(stallStocking("fez-shop"))).toBe("shop.invitation")
    })

    it("says only what is true of any room when the family standing there names nothing", async () => {
      expect(await promptAtCol1(roomOf({ type: "room", family: QUIET_FAMILY }))).toBe("ui.prompt.here")
    })

    it("says the same for a room left behind by a mod that is switched off", async () => {
      expect(await promptAtCol1(stallStocking("family-of-an-unregistered-mod"))).toBe("ui.prompt.here")
    })

    it("still offers the stairs as the walk they are", async () => {
      expect(await promptAtCol1(roomOf({ type: "room", roomType: "portal", stairId: "s1", state: "reachable" }))).toBe(
        "ui.prompt.stairs"
      )
    })
  })

  describe("the floor key ring", () => {
    const keyChest: GridCell = {
      type: "room",
      roomType: "encounter",
      dirs: new Set(["e"]),
      state: "completed",
      reward: { type: "tombKey", keyId: "test-site-0-0" },
      keyColor: "blue",
    }
    const redDoor: GridCell = {
      type: "room",
      roomType: "encounter",
      dirs: new Set(["w"]),
      state: "reachable",
      gateVariant: "floor-key",
      keyColor: "red",
      requiredKeyId: "test-site-0-9",
    }

    it("shows the colour of a key picked up on this floor, and of a door still shut", async () => {
      grid = gridOf([keyChest, redDoor])
      const { getByTitle } = await renderScreen()

      expect(getByTitle(/keys\.heldTitle.*keys\.blue/)).toBeTruthy()
      expect(getByTitle(/keys\.neededTitle.*keys\.red/)).toBeTruthy()
    })

    it("shows nothing on a floor with no keys and no doors", async () => {
      const { queryByTitle } = await renderScreen()

      expect(queryByTitle(/keys\./)).toBeNull()
    })
  })

  describe("a gate a mechanism opens", () => {
    // Shaped exactly as siteAssembler builds an obstacle gate on the main path (see
    // `regionGates.spec.ts`): family always set (it wears bars and is tapped, unlike a switch's own
    // shut fork exit), no key colour (the key is authored — no chest on this floor grows it), the
    // requiredKeyId a control's `positions[].gateKeyId` names, and no `gateVariant`/`keyIsAuthored` —
    // that obstacle-gate branch (siteAssembler.ts) sets neither; both are a side-section gate's own
    // fields (and unread here regardless, see useEncounter.ts/nodeShapes.tsx).
    const mechanismGate: GridCell = {
      type: "room",
      roomType: "encounter",
      dirs: new Set(["w"]),
      state: "reachable",
      family: "key-gate",
      tags: ["gate"],
      requiredKeyId: "obstacle:test-journey#0#0:vaultDoor",
    }

    const walkToGate = async (container: HTMLElement) => {
      fireEvent.click(nodeAt(container, 1))
      await act(async () => {
        vi.advanceTimersByTime(60_000)
      })
    }

    it("is passable once its mechanism holds it open", async () => {
      grid = gridOf([entrance, mechanismGate])
      openGateKeys = new Set(["obstacle:test-journey#0#0:vaultDoor"])
      const { container, queryByText } = await renderScreen()

      await walkToGate(container)

      expect(queryByText("gate.pass")).not.toBeNull()
    })

    it("stays shut when its mechanism has not opened it", async () => {
      grid = gridOf([entrance, mechanismGate])
      openGateKeys = new Set()
      const { container, queryByText } = await renderScreen()

      await walkToGate(container)

      expect(queryByText("gate.pass")).toBeNull()
    })

    it("shuts again once thrown back — the open set never keeps a key past its own render", async () => {
      grid = gridOf([entrance, mechanismGate])
      openGateKeys = new Set(["obstacle:test-journey#0#0:vaultDoor"])
      const opened = await renderScreen()
      await walkToGate(opened.container)
      expect(opened.queryByText("gate.pass")).not.toBeNull()
      cleanup()

      openGateKeys = new Set()
      const shut = await renderScreen()
      await walkToGate(shut.container)

      expect(shut.queryByText("gate.pass")).toBeNull()
    })
  })

  describe("the keys of a floor the world carved", () => {
    let carved: CarvedKeys | null = null

    beforeAll(() => {
      carved = carvedFloorWithKeys()
    }, 30_000)

    // Every test below reads `carved`, so a sweep that matched nothing would leave them all skipping
    // their own subject in silence.
    it("has a baked floor holding a key chest, the door it opens and a ward gate", () => {
      expect(carved).not.toBeNull()
    })

    const walkInto = async (container: HTMLElement, at: readonly [number, number]) => {
      fireEvent.click(nodeAt(container, at[1], at[0]))
      await act(async () => {
        vi.advanceTimersByTime(60_000)
      })
    }

    it("shows the door's colour as needed until its own chest is looted, then as held", async () => {
      const { grid: floor, chestAt, doorColor } = carved!
      grid = revealAll(floor)
      const shut = await renderScreen()

      expect(shut.queryByTitle(new RegExp(`keys\\.neededTitle.*keys\\.${doorColor}`))).not.toBeNull()
      expect(shut.queryByTitle(new RegExp(`keys\\.heldTitle.*keys\\.${doorColor}`))).toBeNull()
      cleanup()

      grid = completeCell(revealAll(floor), chestAt[0], chestAt[1])
      const looted = await renderScreen()

      expect(looted.queryByTitle(new RegExp(`keys\\.heldTitle.*keys\\.${doorColor}`))).not.toBeNull()
      expect(looted.queryByTitle(new RegExp(`keys\\.neededTitle.*keys\\.${doorColor}`))).toBeNull()
    })

    it("refuses the floor-key door until the chest holding its key is looted", async () => {
      const { grid: floor, doorAt } = carved!
      grid = revealAll(floor)
      explorerPos = floor.entrancePos
      const { container, queryByText } = await renderScreen()

      await walkInto(container, doorAt)

      expect(queryByText("gate.pass")).toBeNull()
    })

    it("passes the player through that door once the chest is looted", async () => {
      const { grid: floor, chestAt, doorAt } = carved!
      grid = completeCell(revealAll(floor), chestAt[0], chestAt[1])
      explorerPos = floor.entrancePos
      const { container, queryByText } = await renderScreen()

      await walkInto(container, doorAt)

      expect(queryByText("gate.pass")).not.toBeNull()
    })

    it("refuses a ward gate to a player carrying none of its key", async () => {
      const { grid: floor, wardAt } = carved!
      grid = revealAll(floor)
      explorerPos = floor.entrancePos
      const { container, queryByText } = await renderScreen()

      await walkInto(container, wardAt)

      expect(queryByText("gate.pass")).toBeNull()
    })

    it("passes the player through a ward gate whose key the save carried in", async () => {
      const { grid: floor, wardAt, wardKeyId } = carved!
      grid = revealAll(floor)
      explorerPos = floor.entrancePos
      heldWardKeys = new Set([wardKeyId])
      const { container, queryByText } = await renderScreen()

      await walkInto(container, wardAt)

      expect(queryByText("gate.pass")).not.toBeNull()
    })
  })
})
