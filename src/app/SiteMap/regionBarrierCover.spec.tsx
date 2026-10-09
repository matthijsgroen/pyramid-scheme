// @vitest-environment jsdom
import { readFileSync } from "fs"
import { join } from "path"
import { render, renderHook, cleanup, act } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import type { FloorConfig, FloorGrid, GridCell, RoomCell } from "@/game/siteTypes"
import { assembleFloor } from "@/game/siteAssembler"
import { openDoorsFor } from "@/game/mechanismDoors"
import { cellAddress } from "@/game/cellAddress"
import { concealShutGround, concealedBehindBarriers } from "@/game/concealment"
import { walkableFrom } from "@/game/gridNavigation"
import { journeys as allKnownJourneys } from "@/data/journeys"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { resolveKeyRequirements } from "@/mods/allFamilyMeta"
import { MOD_REGION_BARRIER_REALISATIONS } from "@/mods/registeredMods"
import { offRouteSluiceFloor, onRouteSluiceFloor } from "@/game/testSupport/regionBarrierFixtures"
import { soloLeverDoorFloor } from "@/game/testSupport/gateFaceFixtures"
import { useAssembledFloor } from "./useAssembledFloor"
import { SiteMapView } from "./SiteMapView"
import { REGION_COVER_FADE_OUT_MS } from "./useRegionBarrierCovers"
import { cellCenter } from "./mapScale"
import { tileUrl } from "./tileAssets"
import "@/mods/registerModApps"

vi.mock("./tileAssets", async importOriginal => {
  const actual = await importOriginal<typeof import("./tileAssets")>()
  return { ...actual, tileUrl: vi.fn(actual.tileUrl) }
})

// jsdom has no scrollTo; the map scrolls itself to the explorer on mount.
Element.prototype.scrollTo = Element.prototype.scrollTo ?? (() => {})

const COVER_TEXTURES = new Set(MOD_REGION_BARRIER_REALISATIONS.flatMap(r => (r.texture ? [r.texture] : [])))

const JOURNEY = allKnownJourneys[0].id
const floorRef = { journeyId: JOURNEY, floorIndex: 0 }

type Scenario = { name: string; realisation: string; config: FloorConfig }
const SCENARIOS: Scenario[] = (["water", "sand"] as const).flatMap(realisation => [
  {
    name: `a hall on the route, ${realisation}`,
    realisation,
    config: { ...onRouteSluiceFloor(), regionBarrierRealisation: realisation },
  },
  {
    name: `a hall and a vault off the route, ${realisation}`,
    realisation,
    config: { ...offRouteSluiceFloor(), regionBarrierRealisation: realisation },
  },
])
const STATES = ["dry", "wet"]

const roomsOf = (grid: FloorGrid): { cell: RoomCell; at: [number, number] }[] =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) => (cell.type === "room" ? [{ cell, at: [r, c] as [number, number] }] : []))
  )

const carve = (config: FloorConfig): { seed: number; grid: FloorGrid } => {
  for (let seed = 0; seed < 120; seed++) {
    const result = assembleFloor(JOURNEY, config, seed, resolveEncounter, { resolveKeyRequirements, floorRef })
    if (result.success) return { seed, grid: result.grid }
  }
  throw new Error("no seed carved this floor")
}

const carved = new Map<string, { seed: number; grid: FloorGrid }>()
beforeAll(() => {
  for (const scenario of SCENARIOS) carved.set(scenario.name, carve(scenario.config))
}, 240_000)

const positionsAt = (name: string, state: string): ReadonlyMap<string, string> => {
  const { grid } = carved.get(name)!
  const at = roomsOf(grid).find(({ cell }) => cell.mechanism)!.at
  return new Map([[cellAddress(grid, 0, at[0], at[1])!, state]])
}

const revealed = (grid: FloorGrid): FloorGrid => ({
  ...grid,
  cells: grid.cells.map(row =>
    row.map((cell): GridCell => (cell.type === "empty" ? cell : { ...cell, state: "reachable" }))
  ),
})

/** The floor as the screen draws it for one position of the control: every cell seen, concealment applied. */
const floorAt = (name: string, state: string) => {
  const scenario = SCENARIOS.find(s => s.name === name)!
  const { seed, grid: base } = carved.get(name)!
  const positions = positionsAt(name, state)
  const { result } = renderHook(() =>
    useAssembledFloor(JOURNEY, scenario.config, seed, 0, {}, null, 0, undefined, undefined, positions)
  )
  const from = result.current.explorerPos
  const live = revealed(result.current.grid!)
  const open = openDoorsFor(base, 0, positions)
  const shut = roomsOf(base).filter(({ cell }) => cell.regionBarrier && !open.has(cell.requiredKeyId!))
  const unseen = concealShutGround(result.current.grid!, from)
  return { grid: concealShutGround(live, from), live, unseen, from, shut, realisation: scenario.realisation }
}

const eachFloor = (run: (name: string, state: string) => void) => {
  for (const { name } of SCENARIOS) for (const state of STATES) run(name, state)
}

const flat = (colour: string) => {
  const probe = document.createElement("div")
  probe.style.backgroundColor = colour
  return probe.style.backgroundColor
}
const coverCells = (container: HTMLElement, region?: string) =>
  Array.from(
    container.querySelectorAll<HTMLElement>(
      `${region ? `[data-region-cover="${region}"]` : "[data-region-cover]"} [data-cover-cell]`
    )
  )
const keyOf = (el: HTMLElement) => el.getAttribute("data-cover-cell")!
const visibleDoors = (grid: FloorGrid, shut: { cell: RoomCell; at: [number, number] }[]) =>
  shut.filter(({ at: [r, c] }) => {
    const cell = grid.cells[r][c]
    return cell.type !== "empty" && cell.state !== "fogged"
  })
const regionsOf = (shut: { cell: RoomCell }[]) => [...new Set(shut.map(({ cell }) => cell.regionBarrier!.region))]

/** The cells a region shows: in it, and not fogged by concealment. Read off the cells, apart from the code under test. */
const visibleRegion = (grid: FloorGrid, region: string): string[] =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) =>
      cell.type !== "empty" && cell.region === region && cell.state !== "fogged" ? [`${r},${c}`] : []
    )
  )

beforeEach(async () => {
  const actual = await vi.importActual<typeof import("./tileAssets")>("./tileAssets")
  // Whether the real texture files are painted yet must not change what these tests see.
  vi.mocked(tileUrl).mockImplementation((tier, name) =>
    COVER_TEXTURES.has(name) ? undefined : actual.tileUrl(tier, name)
  )
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("a shut region barrier's region is covered by its realisation", { timeout: 60_000 }, () => {
  eachFloor((name, state) =>
    it(`${name}, ${state}: every visible cell of each shut barrier's region the explorer cannot walk to carries the cover, and no other cell does`, () => {
      const { grid, from, shut, realisation } = floorAt(name, state)
      const { container } = render(<SiteMapView grid={grid} />)
      const walkable = walkableFrom(grid, from)
      const wanted = regionsOf(shut).flatMap(region => visibleRegion(grid, region).filter(key => !walkable.has(key)))
      expect(coverCells(container).map(keyOf).sort(), `${name} / ${state}`).toEqual(wanted.sort())
      for (const { at } of visibleDoors(grid, shut))
        expect(coverCells(container).map(keyOf), `${name} / ${state}: the blockage is covered`).toContain(at.join(","))
      for (const region of regionsOf(shut)) {
        const layer = container.querySelector(`[data-region-cover="${region}"]`)!
        expect(layer.getAttribute("data-realisation")).toBe(realisation)
      }
    })
  )

  it("leaves some walkable cell of a shut region uncovered, so the explorer walks up to the water's edge", () => {
    let dry = 0
    for (const { name } of SCENARIOS)
      for (const state of STATES) {
        const { grid, from, shut } = floorAt(name, state)
        const walkable = walkableFrom(grid, from)
        for (const region of regionsOf(shut)) dry += visibleRegion(grid, region).filter(key => walkable.has(key)).length
      }
    expect(dry).toBeGreaterThan(0)
  })

  it("shuts a region in some position of every floor, so the cases above are not empty", () => {
    for (const { name } of SCENARIOS)
      expect(Math.max(...STATES.map(state => floorAt(name, state).shut.length)), name).toBeGreaterThan(0)
  })

  it("draws no cover over a shut edge gate", () => {
    const { seed, grid } = carve(soloLeverDoorFloor())
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(roomsOf(grid).some(({ cell }) => cell.requiredKeyId !== undefined)).toBe(true)
    const { container } = render(<SiteMapView grid={revealed(grid)} />)
    expect(container.querySelectorAll("[data-region-cover]")).toHaveLength(0)
  })

  eachFloor((name, state) =>
    it(`${name}, ${state}: with no texture painted every cover cell is the flat fill its realisation declares`, () => {
      const { grid, shut, realisation } = floorAt(name, state)
      const { container } = render(<SiteMapView grid={grid} />)
      const meta = MOD_REGION_BARRIER_REALISATIONS.find(r => r.id === realisation)!
      for (const region of regionsOf(shut))
        for (const el of coverCells(container, region)) {
          expect(el.style.backgroundColor, `${keyOf(el)}`).toBe(flat(meta.fallback))
          expect(el.style.backgroundImage, `${keyOf(el)}`).toBe("")
        }
    })
  )

  it.each(["water", "sand"])(
    "draws %s from its painted seamless texture, not the flat fill, once it exists",
    realisation => {
      const meta = MOD_REGION_BARRIER_REALISATIONS.find(r => r.id === realisation)!
      vi.mocked(tileUrl).mockImplementation((_tier, name) =>
        name === meta.texture ? "/painted-texture.png" : undefined
      )
      const name = SCENARIOS.find(s => s.realisation === realisation)!.name
      const state = STATES.find(s => floorAt(name, s).shut.length > 0)!
      const { grid, shut } = floorAt(name, state)
      const { container } = render(<SiteMapView grid={grid} />)
      const cells = regionsOf(shut).flatMap(region => coverCells(container, region))
      expect(cells.length).toBeGreaterThan(0)
      for (const el of cells) {
        expect(el.style.backgroundImage).toContain("/painted-texture.png")
        expect(el.style.backgroundColor).toBe("")
      }
    }
  )
})

describe("the cover fades in across the blockage and is full past it", { timeout: 60_000 }, () => {
  const MOVES = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] } as const
  const TOWARD = { n: "bottom", s: "top", w: "right", e: "left" } as const
  /** The sides of a cell the explorer can step up to it from — read off the walk, apart from the code under test. */
  const walkedUpFrom = (grid: FloorGrid, walkable: ReadonlySet<string>, key: string) => {
    const [r, c] = key.split(",").map(Number)
    const cell = grid.cells[r][c]
    if (cell.type === "empty") return []
    return (["n", "e", "s", "w"] as const).filter(
      dir => cell.dirs.has(dir) && walkable.has(`${r + MOVES[dir][0]},${c + MOVES[dir][1]}`)
    )
  }

  eachFloor((name, state) =>
    it(`${name}, ${state}: a blockage fades from the sides the explorer walks up to it from, and every other covered cell is full`, () => {
      const { grid, from, shut } = floorAt(name, state)
      const { container } = render(<SiteMapView grid={grid} />)
      const walkable = walkableFrom(grid, from)
      const doors = new Set(shut.map(({ at }) => at.join(",")))
      for (const region of regionsOf(shut))
        for (const el of coverCells(container, region)) {
          const key = keyOf(el)
          const sides = walkedUpFrom(grid, walkable, key)
          if (!doors.has(key)) expect(sides, `${name} / ${key}: only a blockage borders walkable ground`).toEqual([])
          // "to bottom" is a gradient's default direction, and the style serialises it away.
          const wanted = sides
            .map(dir => `linear-gradient(to ${TOWARD[dir]}, transparent, black 56px)`.replace("to bottom, ", ""))
            .join(", ")
          expect(el.style.maskImage, `${name} / ${state} / ${region} / ${key}`).toBe(wanted)
          expect(el.style.opacity, `${name} / ${key}: no flat thinning`).toBe("")
        }
    })
  )

  it("fades some blockage, so the cases above are not empty", () => {
    let faded = 0
    for (const { name } of SCENARIOS)
      for (const state of STATES) {
        const { grid, shut } = floorAt(name, state)
        const { container } = render(<SiteMapView grid={grid} />)
        const doors = new Set(shut.map(({ at }) => at.join(",")))
        for (const el of coverCells(container)) if (el.style.maskImage && doors.has(keyOf(el))) faded++
        cleanup()
      }
    expect(faded).toBeGreaterThan(0)
  })
})

describe("the region past the blockage lies under water where seen, and in fog where not", { timeout: 60_000 }, () => {
  const drawnAt = (container: HTMLElement) => {
    const at = new Map<string, string>()
    for (let r = 0; r < 40; r++)
      for (let c = 0; c < 40; c++) at.set(`${cellCenter(r, c).cx},${cellCenter(r, c).cy}`, `${r},${c}`)
    const drawn = new Set<string>()
    for (const el of container.querySelectorAll<HTMLElement>("[data-marker-cell]")) {
      const key = at.get(`${parseFloat(el.style.left) + 28},${parseFloat(el.style.top) + 28}`)
      if (key) drawn.add(key)
    }
    return drawn
  }

  /** Every cell of a shut region only the shut barrier leads to, on each floor and position. */
  const eachCutOff = (run: (name: string, state: string, key: string, region: string) => void) => {
    for (const { name } of SCENARIOS)
      for (const state of STATES) {
        const { live, from, shut } = floorAt(name, state)
        const hidden = concealedBehindBarriers(live, from)
        for (const region of regionsOf(shut))
          for (const key of hidden) {
            const [r, c] = key.split(",").map(Number)
            const cell = live.cells[r][c]
            if (cell.type !== "empty" && cell.region === region) run(name, state, key, region)
          }
      }
  }

  it("covers every seen cell of the region ground only the shut barrier leads to", () => {
    let covered = 0
    eachCutOff((name, state, key, region) => {
      const { grid, from } = floorAt(name, state)
      const { container } = render(<SiteMapView grid={grid} explorerPos={from} />)
      expect(coverCells(container, region).map(keyOf), `${name} / ${state} / ${key}`).toContain(key)
      covered++
      cleanup()
    })
    expect(covered, "some region ground lies past a blockage").toBeGreaterThan(0)
  })

  it("covers nothing and draws nothing of that ground while it has never been seen", () => {
    let fogged = 0
    eachCutOff((name, state, key, region) => {
      const { unseen, from } = floorAt(name, state)
      const [r, c] = key.split(",").map(Number)
      if (unseen.cells[r][c].type === "empty" || (unseen.cells[r][c] as { state: string }).state !== "fogged") return
      const { container } = render(<SiteMapView grid={unseen} explorerPos={from} />)
      expect(coverCells(container, region).map(keyOf), `${name} / ${state} / ${key}`).not.toContain(key)
      expect(drawnAt(container).has(key), `${name} / ${state} / ${key} is drawn`).toBe(false)
      fogged++
      cleanup()
    })
    expect(fogged, "some region ground past a blockage was never seen").toBeGreaterThan(0)
  })
})

describe("a barrier opening while the player watches fades its cover away", { timeout: 60_000 }, () => {
  /** A position that shuts `region` and one that leaves it open, on the same floor. */
  const shutAndOpen = (name: string) => {
    for (const region of ["hall", "vault"])
      for (const closed of STATES) {
        const open = STATES.find(s => s !== closed)!
        if (
          floorAt(name, closed).shut.some(({ cell }) => cell.regionBarrier!.region === region) &&
          !floorAt(name, open).shut.some(({ cell }) => cell.regionBarrier!.region === region)
        )
          return { region, closed, open }
      }
    throw new Error(`no barrier of ${name} opens`)
  }

  const reduceMotion = (reduce: boolean) =>
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))

  it.each(SCENARIOS.map(s => s.name))("%s: the cover goes into its fade-out, then leaves plain ground", name => {
    vi.useFakeTimers()
    reduceMotion(false)
    const { region, closed, open } = shutAndOpen(name)
    const before = floorAt(name, closed)
    const after = floorAt(name, open)
    const { container, rerender } = render(<SiteMapView grid={before.grid} />)
    const shown = coverCells(container, region).map(el => [keyOf(el), el.style.maskImage])
    expect(shown.length).toBeGreaterThan(0)

    rerender(<SiteMapView grid={after.grid} />)
    const layer = container.querySelector<HTMLElement>(`[data-region-cover="${region}"]`)!
    expect(layer, "the cover is kept to fade").not.toBeNull()
    expect(layer.hasAttribute("data-leaving")).toBe(true)
    expect(layer.className).toContain("animate-region-cover-out")
    expect(layer.style.animationDuration).toBe(`${REGION_COVER_FADE_OUT_MS}ms`)
    expect(coverCells(container, region).map(el => [keyOf(el), el.style.maskImage])).toEqual(shown)

    act(() => vi.advanceTimersByTime(REGION_COVER_FADE_OUT_MS))
    expect(container.querySelectorAll(`[data-region-cover="${region}"]`)).toHaveLength(0)
    for (const [key] of shown) {
      const [r, c] = key.split(",").map(Number)
      expect(after.grid.cells[r][c].type, `${key} is ground again`).not.toBe("empty")
    }
    for (const { at } of before.shut.filter(({ cell }) => cell.regionBarrier!.region === region)) {
      const door = after.grid.cells[at[0]][at[1]]
      expect(door.type, `${at}: the blockage is plain ground`).toBe("corridor")
    }
  })

  it.each(SCENARIOS.map(s => s.name))(
    "%s: under reduced motion the cover is gone the moment the barrier opens",
    name => {
      vi.useFakeTimers()
      reduceMotion(true)
      const { region, closed, open } = shutAndOpen(name)
      const { container, rerender } = render(<SiteMapView grid={floorAt(name, closed).grid} />)
      expect(coverCells(container, region).length).toBeGreaterThan(0)
      rerender(<SiteMapView grid={floorAt(name, open).grid} />)
      expect(container.querySelectorAll(`[data-region-cover="${region}"]`)).toHaveLength(0)
    }
  )

  it("keeps no cover to fade when the floor is opened already, or when ground is only concealed", () => {
    vi.useFakeTimers()
    reduceMotion(false)
    const name = SCENARIOS[0].name
    const { region, closed, open } = shutAndOpen(name)
    const opened = render(<SiteMapView grid={floorAt(name, open).grid} />)
    expect(opened.container.querySelectorAll("[data-region-cover]")).toHaveLength(0)
    opened.unmount()

    const { grid } = floorAt(name, closed)
    const { container, rerender } = render(<SiteMapView grid={grid} />)
    const fogged: FloorGrid = {
      ...grid,
      cells: grid.cells.map(row =>
        row.map((cell): GridCell =>
          cell.type !== "empty" && cell.region === region ? { ...cell, state: "fogged" } : cell
        )
      ),
    }
    rerender(<SiteMapView grid={fogged} />)
    expect(container.querySelectorAll("[data-leaving]")).toHaveLength(0)
  })

  it("keeps no cover to fade when the player has moved to another floor", () => {
    vi.useFakeTimers()
    reduceMotion(false)
    const name = SCENARIOS[0].name
    const { closed, open } = shutAndOpen(name)
    const { container, rerender } = render(<SiteMapView grid={floorAt(name, closed).grid} currentFloor={0} />)
    expect(container.querySelectorAll("[data-region-cover]").length).toBeGreaterThan(0)
    rerender(<SiteMapView grid={floorAt(name, open).grid} currentFloor={1} />)
    expect(container.querySelectorAll("[data-region-cover]")).toHaveLength(0)
  })

  it("defines the fade-out animation the cover asks for", () => {
    const css = readFileSync(join(__dirname, "..", "..", "index.css"), "utf8")
    expect(css).toContain("--animate-region-cover-out:")
    expect(css).toContain("@keyframes region-cover-out")
  })
})

describe("a region barrier's blockage carries no marker", { timeout: 60_000 }, () => {
  const markCount = (grid: FloorGrid) => {
    const { container } = render(<SiteMapView grid={grid} />)
    const count = Array.from(container.querySelectorAll("svg")).filter(
      svg => svg.getAttribute("viewBox") === "-12 -12 24 24"
    ).length
    cleanup()
    return count
  }

  it("draws the same markers whether or not the blockage cells carry a mark", () => {
    let checked = 0
    for (const { name } of SCENARIOS)
      for (const state of STATES) {
        const { grid, shut } = floorAt(name, state)
        const bare: FloorGrid = {
          ...grid,
          cells: grid.cells.map(row =>
            row.map(cell => (cell.type === "room" && cell.regionBarrier ? { ...cell, mark: undefined } : cell))
          ),
        }
        expect(markCount(grid), `${name} / ${state}`).toBe(markCount(bare))
        checked += shut.length
      }
    expect(checked).toBeGreaterThan(0)
  })
})

describe("the textures the covers are owed are queued for painting", () => {
  const queue = readFileSync(join(__dirname, "..", "..", "..", "docs", "instructions", "repaint-queue.md"), "utf8")

  it("names a repaint entry and an import line for every texture a realisation declares", () => {
    expect([...COVER_TEXTURES].sort()).toEqual(["regionSand", "regionWater"])
    for (const texture of COVER_TEXTURES) {
      expect(queue, texture).toContain(`### \`default/${texture}\``)
      expect(queue, texture).toContain(`--tier=default --name=${texture} --slot=floor`)
    }
  })
})
