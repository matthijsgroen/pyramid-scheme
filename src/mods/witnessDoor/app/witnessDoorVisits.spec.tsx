// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import type { FloorConfig } from "@/game/siteTypes"
import { assembleFloor } from "@/game/siteAssembler"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { hashString } from "@/support/hashString"
import { encodeEdge } from "@/app/SiteMap/edgeId"
import { COL_PITCH, PAD, PAD_TOP, ROW_PITCH, SIDE_W, WALL_H } from "@/app/SiteMap/mapScale"
import { clearGameData, writeGameData } from "@/support/useGameStorage"
import { ownedKeysFromSources } from "@/app/families/ownedKeySources"
import { cellKey } from "@/mods/core/game/beam/physics"
import { generateWitnessDoor, solutionsFor } from "../game/generateWitnessDoor"
import { witnessKeyId, witnessSite, WITNESS_SHRINES } from "../game/witnessKeys"

// Keys are enough to tell the controls apart, and a shrine's key still says which shrine it is.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const { SiteMapScreen } = await import("@/app/SiteMap/SiteMapScreen")

const JOURNEY = "junior_2"
const LEVEL_NR = 2
const SEED = 4242

// One main-path room, and it is the door. Authored here rather than taken from the baked world so the
// walk is three cells long and the thing under test is the visit, not the maze.
const floorConfig: FloorConfig = {
  pathPuzzles: 1,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  encounter: "witnessDoor",
}

const settle = async () => {
  await act(async () => {
    await Promise.resolve()
  })
}

const fixture = (() => {
  const result = assembleFloor(JOURNEY, floorConfig, SEED, resolveEncounter, {
    floorRef: { journeyId: JOURNEY, floorIndex: 0 },
  })
  if (!result.success) throw new Error("the fixture floor does not assemble")
  return result.grid
})()

const STEPS: Record<string, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

const doorPosition = (): [number, number] => {
  for (let row = 0; row < fixture.rows; row++)
    for (let col = 0; col < fixture.cols; col++) {
      const cell = fixture.cells[row][col]
      if (cell.type === "room" && cell.family === "witnessDoor") return [row, col]
    }
  throw new Error("no witness door on the fixture floor")
}

const [DOOR_ROW, DOOR_COL] = doorPosition()

/** How many cells each square is from the door, so the walk below can always tap the tap that gets closer. */
const stepsToTheDoor = ((): Map<string, number> => {
  const distance = new Map<string, number>([[`${DOOR_ROW},${DOOR_COL}`, 0]])
  const work: [number, number][] = [[DOOR_ROW, DOOR_COL]]
  while (work.length > 0) {
    const [row, col] = work.shift()!
    const cell = fixture.cells[row]?.[col]
    if (!cell || cell.type === "empty") continue
    for (const dir of cell.dirs) {
      const [dr, dc] = STEPS[dir]
      const key = `${row + dr},${col + dc}`
      if (distance.has(key)) continue
      distance.set(key, distance.get(`${row},${col}`)! + 1)
      work.push([row + dr, col + dc])
    }
  }
  return distance
})()
// The board the room deals itself — useEncounter seeds it from the journey and the cell.
const board = generateWitnessDoor(hashString(JOURNEY + encodeEdge(0, DOOR_ROW, DOOR_COL)), "junior")
const SITE = witnessSite(JOURNEY, LEVEL_NR, 0)

/** Which cell a marker stands on. A marker's box IS its cell (SiteMapView), so its corner names it. */
const markerCell = (el: HTMLElement): [number, number] => [
  Math.round((parseFloat(el.style.top) - PAD_TOP - WALL_H) / ROW_PITCH),
  Math.round((parseFloat(el.style.left) - PAD - SIDE_W) / COL_PITCH),
]

/** Every square the player could tap right now — the map offers no others, whatever the floor holds. */
const offered = (container: HTMLElement): [HTMLElement, [number, number]][] =>
  Array.from(container.querySelectorAll<HTMLElement>("[data-marker-cell]"))
    .filter(el => el.style.cursor === "pointer")
    .map(el => [el, markerCell(el)])

/**
 * The walk in: tap whichever offered square is nearest the door, until the door itself is one of them.
 * A floor comes out of the fog as it is walked, so this is several taps, and none of them is a teleport.
 */
const walkInto = async (container: HTMLElement) => {
  for (let taps = 0; taps < 20; taps++) {
    const nearest = offered(container)
      .filter(([, at]) => stepsToTheDoor.has(`${at[0]},${at[1]}`))
      .sort((a, b) => stepsToTheDoor.get(`${a[1][0]},${a[1][1]}`)! - stepsToTheDoor.get(`${b[1][0]},${b[1][1]}`)!)[0]
    if (!nearest) throw new Error("the map offers nothing that leads to the door")
    fireEvent.click(nearest[0])
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    await settle()
    if (nearest[1][0] === DOOR_ROW && nearest[1][1] === DOOR_COL) return
  }
  throw new Error("never arrived at the door")
}

/** The mirrors of the open board, as the buttons they are drawn as, in the order the board holds them. */
const mirrorButtons = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>("button")).filter(candidate =>
    candidate.className.includes("aspect-square")
  )

const shrineButton = (shrine: string): HTMLElement => {
  const found = Array.from(document.querySelectorAll<HTMLElement>("button")).find(
    candidate => candidate.textContent === `witnessDoor.shrine.${shrine}`
  )
  if (!found) throw new Error(`no ${shrine} shrine on screen`)
  return found
}

/** Lays the winning route for `shrine` over the open board, one tap per mirror not already lying that way. */
const solveTowards = async (shrine: "east" | "north") => {
  const cells = mirrorButtons()
  const angles = [...board.grid.initial]
  for (const { at, angle } of solutionsFor(board, shrine)[0]) {
    const mirror = board.grid.mirrors.findIndex(candidate => cellKey(candidate) === cellKey(at))
    if (angles[mirror] === angle) continue
    await act(async () => {
      fireEvent.click(cells[mirror])
    })
    angles[mirror] = angle
  }
}

/** Dismissing the solved board is what marks the room explored, and what closes it. */
const leaveThroughTheBanner = async () => {
  await act(async () => {
    vi.advanceTimersByTime(1000)
  })
  const banner = Array.from(document.querySelectorAll<HTMLElement>("button")).find(candidate =>
    candidate.textContent?.includes("ui.puzzleCompleted")
  )
  if (!banner) throw new Error("the board never reported itself solved")
  await act(async () => {
    fireEvent.click(banner)
  })
  await settle()
}

/**
 * The whole walk, through the app's own room-open path.
 *
 * A spec that re-renders the board component instead proves only that the component is stateless — it
 * cannot see that core closes a solved room for good, which is exactly how a door that could be opened
 * once shipped as one that could be opened twice.
 */
describe("a witness door over two visits", () => {
  beforeEach(async () => {
    Element.prototype.scrollTo = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()
    await clearGameData()
    // The save of a player standing at this pyramid's entrance: exploration is filed against an ACTIVE
    // journey, so without one the room is never written down as finished and re-entry proves nothing.
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
          cellKeyVersion: 2,
        },
      ],
    })
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  const renderSite = async () => {
    const result = render(
      <SiteMapScreen
        journeyId={JOURNEY}
        siteConfig={[floorConfig]}
        levelIndex={LEVEL_NR - 1}
        seed={SEED}
        onSiteComplete={() => {}}
        onCancel={() => {}}
      />
    )
    await settle()
    return result
  }

  it("mints the other shrine's key when the player walks back in", async () => {
    const { container } = await renderSite()

    await walkInto(container)
    await act(async () => {
      fireEvent.click(shrineButton("east"))
    })
    await solveTowards("east")
    await leaveThroughTheBanner()

    expect(ownedKeysFromSources({ journeyId: JOURNEY, levelNr: LEVEL_NR, floorIndex: 0 })).toEqual(
      new Set([witnessKeyId(SITE, "east")])
    )

    // The room is finished now. Walking onto it again has to OPEN it, or the north branch is sealed.
    await walkInto(container)
    const north = shrineButton("north")
    // A fresh board: the visit that solved this one is over, so nothing is named yet.
    expect(north.getAttribute("aria-pressed")).toBe("false")
    await act(async () => {
      fireEvent.click(north)
    })
    await solveTowards("north")

    const owned = ownedKeysFromSources({ journeyId: JOURNEY, levelNr: LEVEL_NR, floorIndex: 0 })
    expect(WITNESS_SHRINES.every(shrine => owned.has(witnessKeyId(SITE, shrine)))).toBe(true)
  })
})
