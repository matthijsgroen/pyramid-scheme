// @vitest-environment jsdom
import { act, fireEvent, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { revealAll } from "@/game/gridNavigation"
import { parseLock } from "@/game/lockNotation"
import { passageSides, type Place } from "@/game/passages"
import { carveLockFloor } from "@/game/testSupport/lockFixtures"
import { CRACK, PASSAGE_BINDING, passageAt } from "@/game/testSupport/stoneFixtures"
import { floorFrom, roomPiece } from "./floorFixtures.testing"
import { OCCLUDER_FADE } from "./htmlLayers"
import { SqueezeRider, squeezeFoot } from "./SqueezeRider"
import { sharedTileFrames } from "./tileAssets"
import { SQUEEZE_HEAD_ON_SLIDE, SQUEEZE_SIDEWAYS_LIFT, squeezeWay, type Squeeze } from "./useSqueeze"

// jsdom has no scrollTo; the map scrolls itself to the explorer on mount.
Element.prototype.scrollTo = Element.prototype.scrollTo ?? (() => {})
const SEEDS = Array.from({ length: 60 }, (_, n) => n)

const squeeze = (over: Partial<Squeeze["traversal"]> = {}): Squeeze => {
  const traversal: Squeeze["traversal"] = {
    kind: "narrowPassage",
    from: [1, 0],
    via: [1, 1],
    to: [1, 2],
    dir: "e",
    ...over,
  }
  return { traversal, way: squeezeWay(traversal), msPerLeg: 350, ms: 350 * 2, end: vi.fn() }
}
const GOING_NORTH = { from: [2, 1], via: [1, 1], to: [0, 1], dir: "n" } as const
const GOING_SOUTH = { from: [0, 1], via: [1, 1], to: [2, 1], dir: "s" } as const
const px = (v: string) => Number.parseFloat(v)
const riderOf = (c: HTMLElement) => c.querySelector("[data-squeeze-rider]") as HTMLElement
const figureOf = (c: HTMLElement) => c.querySelector("[data-squeeze-figure]") as HTMLElement
const spriteOf = (c: HTMLElement) => c.querySelector("[data-squeeze-sprite]") as HTMLElement
const at = (el: HTMLElement) => ({ x: px(el.style.left), y: px(el.style.top) })
const lifted = (cell: [number, number]) => {
  const foot = squeezeFoot(cell)
  return { x: foot.x, y: foot.y - SQUEEZE_SIDEWAYS_LIFT }
}
const nextFrame = () => act(async () => new Promise(requestAnimationFrame))

describe("SqueezeRider", () => {
  it("starts on the near side's foot line, then moves into the wall's cell", async () => {
    const { container } = render(<SqueezeRider squeeze={squeeze()} />)
    expect(at(riderOf(container))).toEqual(lifted([1, 0]))
    await nextFrame()
    expect(at(riderOf(container))).toEqual(lifted([1, 1]))
  })

  it("goes on to the far side when the first leg ends, and ends the crossing when the second does", async () => {
    const s = squeeze()
    const { container } = render(<SqueezeRider squeeze={s} />)
    await nextFrame()
    fireEvent.transitionEnd(riderOf(container))
    expect(at(riderOf(container))).toEqual(lifted([1, 2]))
    expect(s.end).not.toHaveBeenCalled()
    fireEvent.transitionEnd(riderOf(container))
    expect(s.end).toHaveBeenCalledTimes(1)
  })

  it("turns with the crack at a corner: the second leg wears its own heading", async () => {
    const s = squeeze({ from: [0, 1], via: [1, 1], to: [1, 2], dir: "e" })
    const { container } = render(<SqueezeRider squeeze={s} />)
    expect(spriteOf(container).dataset.squeezeSprite).toBe("s")
    await nextFrame()
    fireEvent.transitionEnd(riderOf(container))
    expect(spriteOf(container).dataset.squeezeSprite).toBe("e")
  })

  it("draws the painting at half its size, bottom-centred, and mirrors it going west", () => {
    const east = render(<SqueezeRider squeeze={squeeze()} />)
    expect(spriteOf(east.container).style.transform).toBe("translateX(-50%) scale(0.5, 0.5)")
    expect(east.container.querySelector("img")!.getAttribute("src")).toBe(sharedTileFrames("explorer-squeeze-e")[0])
    const west = render(<SqueezeRider squeeze={squeeze({ from: [1, 2], to: [1, 0], dir: "w" })} />)
    expect(spriteOf(west.container).style.transform).toBe("translateX(-50%) scale(-0.5, 0.5)")
  })

  it("ignores a transition that bubbles up from inside the rider", async () => {
    const s = squeeze()
    const { container } = render(<SqueezeRider squeeze={s} />)
    await nextFrame()
    fireEvent.transitionEnd(riderOf(container))
    fireEvent.transitionEnd(container.querySelector("img")!)
    expect(s.end).not.toHaveBeenCalled()
  })

  it("is fully seen the whole way through a sideways crack", async () => {
    const { container } = render(<SqueezeRider squeeze={squeeze()} />)
    expect(figureOf(container).style.opacity).toBe("1")
    await nextFrame()
    expect(figureOf(container).style.opacity).toBe("1")
  })
})

describe("SqueezeRider lift", () => {
  it("draws a sideways squeeze lifted above the foot line, a head-on one and a corner on it", async () => {
    const sideways = render(<SqueezeRider squeeze={squeeze()} />)
    expect(at(riderOf(sideways.container)).y).toBe(squeezeFoot([1, 0]).y - SQUEEZE_SIDEWAYS_LIFT)
    const headOn = render(<SqueezeRider squeeze={squeeze(GOING_NORTH)} />)
    expect(at(riderOf(headOn.container))).toEqual(squeezeFoot([1, 1]))
    const corner = render(<SqueezeRider squeeze={squeeze({ from: [0, 1], via: [1, 1], to: [1, 2], dir: "e" })} />)
    expect(at(riderOf(corner.container))).toEqual(squeezeFoot([0, 1]))
  })
})

describe("SqueezeRider head-on", () => {
  const face = squeezeFoot([1, 1])
  const behind = { x: face.x, y: face.y - SQUEEZE_HEAD_ON_SLIDE }

  it("going north: starts on the wall's face fully seen, then slides a bit north and fades behind it", async () => {
    const { container } = render(<SqueezeRider squeeze={squeeze(GOING_NORTH)} />)
    expect(at(riderOf(container))).toEqual(face)
    expect(figureOf(container).style.opacity).toBe("1")
    await nextFrame()
    expect(at(riderOf(container))).toEqual(behind)
    expect(figureOf(container).style.opacity).toBe(String(OCCLUDER_FADE))
  })

  it("going south: starts behind the wall half seen, then slides a bit south and comes out fully seen", async () => {
    const { container } = render(<SqueezeRider squeeze={squeeze(GOING_SOUTH)} />)
    expect(at(riderOf(container))).toEqual(behind)
    expect(figureOf(container).style.opacity).toBe(String(OCCLUDER_FADE))
    await nextFrame()
    expect(at(riderOf(container))).toEqual(face)
    expect(figureOf(container).style.opacity).toBe("1")
  })

  it.each([GOING_NORTH, GOING_SOUTH])("is one slide, the whole squeeze long, ending the crossing ($dir)", async way => {
    const s = squeeze(way)
    const { container } = render(<SqueezeRider squeeze={s} />)
    await nextFrame()
    expect(riderOf(container).style.transition).toContain(`top ${350 * 2}ms`)
    expect(figureOf(container).style.transition).toContain(`opacity ${350 * 2}ms`)
    fireEvent.transitionEnd(figureOf(container))
    expect(s.end).not.toHaveBeenCalled()
    fireEvent.transitionEnd(riderOf(container))
    expect(s.end).toHaveBeenCalledTimes(1)
  })
})

const carved = () => revealAll(carveLockFloor(parseLock(CRACK, "stones").lock, PASSAGE_BINDING, SEEDS))
/** The carved crack's wall, and its sides north and south of it. */
const acrossOf = () => {
  const grid = carved()
  const wall = passageAt(grid)
  const sides = passageSides(grid, wall[0], wall[1])!
  const north = sides.find(([r]) => r < wall[0])
  const south = sides.find(side => side !== north)
  expect(north, "the carve's passage has a side north of it").toBeDefined()
  return { grid, wall, north: north!, south: south! }
}
// An east-west crack: the wall's cell between a room either side.
const crackPiece = roomPiece({
  tags: ["gate"],
  requiredKeyId: "crack",
  passage: { realisation: "narrowPassage" },
  state: "reachable",
})
const alongOf = () => ({
  grid: revealAll(floorFrom(["E.P.R"], { P: crackPiece })),
  wall: [0, 2] as Place,
  west: [0, 1] as Place,
  east: [0, 3] as Place,
})
const wallSpriteOf = (container: HTMLElement, wall: Place) =>
  container.querySelector(`[data-node-sprite="passage:${wall[0]},${wall[1]}"]`) as HTMLElement
const drawnAfter = (first: Element, second: Element) =>
  !!(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)

const mapSqueezing = async (grid: ReturnType<typeof carved>, from: Place, via: Place, to: Place) => {
  const { SiteMapView } = await import("./SiteMapView")
  const traversal = { kind: "narrowPassage", from, via, to, dir: "e" } as const
  return render(
    <SiteMapView
      grid={grid}
      explorerPos={from}
      explorerHidden
      squeeze={{ traversal, way: squeezeWay(traversal), msPerLeg: 350, ms: 350 * 2, end: () => {} }}
    />
  )
}

describe("SqueezeRider on the map", () => {
  it("is drawn while a squeeze plays", async () => {
    const { grid, wall, north, south } = acrossOf()
    const { container } = await mapSqueezing(grid, north, wall, south)
    expect(container.querySelector("[data-squeeze-rider]")).not.toBeNull()
  })

  it.each(["north", "south"] as const)(
    "head-on, setting out %s of the wall: drawn over the wall, the wall fully seen",
    async side => {
      const { grid, wall, north, south } = acrossOf()
      const [from, to] = side === "north" ? [north, south] : [south, north]
      const { container } = await mapSqueezing(grid, from, wall, to)
      const wallSprite = wallSpriteOf(container, wall)
      expect(drawnAfter(wallSprite, container.querySelector("[data-squeeze-rider]")!)).toBe(true)
      expect(wallSprite.style.opacity).toBe("")
    }
  )

  it("head-on, the wall fades once he stands north of it, and not south of it", async () => {
    const { SiteMapView } = await import("./SiteMapView")
    const { grid, wall, north, south } = acrossOf()
    const landedNorth = render(<SiteMapView grid={grid} explorerPos={north} />)
    expect(wallSpriteOf(landedNorth.container, wall).style.opacity).toBe(String(OCCLUDER_FADE))
    landedNorth.unmount()
    const landedSouth = render(<SiteMapView grid={grid} explorerPos={south} />)
    expect(wallSpriteOf(landedSouth.container, wall).style.opacity).toBe("")
  })

  it.each(["west", "east"] as const)(
    "sideways, setting out %s of the wall: the wall is drawn over him, fully seen",
    async side => {
      const { grid, wall, west, east } = alongOf()
      const [from, to] = side === "west" ? [west, east] : [east, west]
      const { container } = await mapSqueezing(grid, from, wall, to)
      const wallSprite = wallSpriteOf(container, wall)
      expect(wallSprite).not.toBeNull()
      expect(drawnAfter(container.querySelector("[data-squeeze-rider]")!, wallSprite)).toBe(true)
      expect(wallSprite.style.opacity).toBe("")
    }
  )
})
