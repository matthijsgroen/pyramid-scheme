// @vitest-environment jsdom
import { act, fireEvent, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { revealAll } from "@/game/gridNavigation"
import { parseLock } from "@/game/lockNotation"
import { passageSides } from "@/game/passages"
import { carveLockFloor } from "@/game/testSupport/lockFixtures"
import { CRACK, PASSAGE_BINDING, passageAt } from "@/game/testSupport/stoneFixtures"
import { SqueezeRider, squeezeFoot } from "./SqueezeRider"
import { sharedTileFrames } from "./tileAssets"
import type { Squeeze } from "./useSqueeze"

// jsdom has no scrollTo; the map scrolls itself to the explorer on mount.
Element.prototype.scrollTo = Element.prototype.scrollTo ?? (() => {})
const SEEDS = Array.from({ length: 60 }, (_, n) => n)

const squeeze = (over: Partial<Squeeze["traversal"]> = {}): Squeeze => ({
  traversal: { kind: "narrowPassage", from: [1, 0], via: [1, 1], to: [1, 2], dir: "e", ...over },
  msPerLeg: 350,
  end: vi.fn(),
})
const px = (v: string) => Number.parseFloat(v)
const riderOf = (c: HTMLElement) => c.querySelector("[data-squeeze-rider]") as HTMLElement
const spriteOf = (c: HTMLElement) => c.querySelector("[data-squeeze-sprite]") as HTMLElement
const at = (el: HTMLElement) => ({ x: px(el.style.left), y: px(el.style.top) })

describe("SqueezeRider", () => {
  it("starts on the near side's foot line, then moves into the wall's cell", async () => {
    const { container } = render(<SqueezeRider squeeze={squeeze()} />)
    expect(at(riderOf(container))).toEqual(squeezeFoot([1, 0]))
    await act(async () => new Promise(requestAnimationFrame))
    expect(at(riderOf(container))).toEqual(squeezeFoot([1, 1]))
  })

  it("goes on to the far side when the first leg ends, and ends the crossing when the second does", async () => {
    const s = squeeze()
    const { container } = render(<SqueezeRider squeeze={s} />)
    await act(async () => new Promise(requestAnimationFrame))
    fireEvent.transitionEnd(riderOf(container))
    expect(at(riderOf(container))).toEqual(squeezeFoot([1, 2]))
    expect(s.end).not.toHaveBeenCalled()
    fireEvent.transitionEnd(riderOf(container))
    expect(s.end).toHaveBeenCalledTimes(1)
  })

  it("turns with the crack at a corner: the second leg wears its own heading", async () => {
    const s = squeeze({ from: [0, 1], via: [1, 1], to: [1, 2], dir: "e" })
    const { container } = render(<SqueezeRider squeeze={s} />)
    expect(spriteOf(container).dataset.squeezeSprite).toBe("s")
    await act(async () => new Promise(requestAnimationFrame))
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
    await act(async () => new Promise(requestAnimationFrame))
    fireEvent.transitionEnd(riderOf(container))
    fireEvent.transitionEnd(container.querySelector("img")!)
    expect(s.end).not.toHaveBeenCalled()
  })
})

describe("SqueezeRider on the map", () => {
  it("is drawn while a squeeze plays", async () => {
    const { SiteMapView } = await import("./SiteMapView")
    const grid = revealAll(carveLockFloor(parseLock(CRACK, "stones").lock, PASSAGE_BINDING, SEEDS))
    const wall = passageAt(grid)
    const [near, far] = passageSides(grid, wall[0], wall[1])!
    const { container } = render(
      <SiteMapView
        grid={grid}
        explorerPos={near}
        explorerHidden
        squeeze={{
          traversal: { kind: "narrowPassage", from: near, via: wall, to: far, dir: "e" },
          msPerLeg: 350,
          end: () => {},
        }}
      />
    )
    expect(container.querySelector("[data-squeeze-rider]")).not.toBeNull()
  })

  it("is drawn over the wall it squeezes through, coming from the side behind the wall", async () => {
    const { SiteMapView } = await import("./SiteMapView")
    const grid = revealAll(carveLockFloor(parseLock(CRACK, "stones").lock, PASSAGE_BINDING, SEEDS))
    const wall = passageAt(grid)
    const sides = passageSides(grid, wall[0], wall[1])!
    // From the north the wall's floor line is lower than his, which alone would draw it over him.
    const north = sides.find(([r]) => r < wall[0])
    const other = sides.find(side => side !== north)
    expect(north, "the carve's passage has a side north of it").toBeDefined()
    const { container } = render(
      <SiteMapView
        grid={grid}
        explorerPos={north}
        explorerHidden
        squeeze={{
          traversal: { kind: "narrowPassage", from: north!, via: wall, to: other!, dir: "s" },
          msPerLeg: 350,
          end: () => {},
        }}
      />
    )
    const wallSprite = [...container.querySelectorAll("[data-node-sprite]")].find(
      el => el.getAttribute("data-node-sprite")!.split(":").pop() === `${wall[0]},${wall[1]}`
    )
    expect(wallSprite).toBeDefined()
    const rider = container.querySelector("[data-squeeze-rider]")!
    expect(wallSprite!.compareDocumentPosition(rider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
