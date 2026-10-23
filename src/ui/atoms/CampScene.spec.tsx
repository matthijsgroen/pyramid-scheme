// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import type { ComponentProps } from "react"
import type { CampArt } from "./campScene/campArt"
import type { CampCatalogue, CampPiece } from "./campScene/campTypes"
import { fullSteps } from "./campScene/campLayout"
import { CampScene } from "./CampScene"

const piece = (id: string, options: Partial<CampPiece> = {}): CampPiece => ({
  id,
  dx: 0,
  dy: 0,
  width: 0.8,
  height: 0.8,
  ...options,
})

const catalogue: CampCatalogue = {
  spots: [
    { id: "fire", x: 0, y: 0, frame: 1, footprint: 0.8, steps: [{ chapter: "starter", pieces: [piece("ring")] }] },
    {
      id: "mapTable",
      x: 0,
      y: 1,
      frame: 1,
      footprint: 0.8,
      steps: [{ chapter: "starter", pieces: [piece("table")] }],
    },
    {
      id: "godStatues",
      x: 2,
      y: 1,
      frame: 1,
      footprint: 0.8,
      steps: [{ chapter: "wizard", pieces: [piece("thoth")] }],
    },
  ],
  fixed: [
    { id: "chest", x: -1, y: 1, frame: 1, footprint: 0.8, piece: piece("chest") },
    { id: "window", x: 1, y: -1, frame: 1, footprint: 0.8, piece: piece("window") },
    { id: "campfire", x: 0, y: 0, frame: 1, footprint: 0.8, piece: piece("smallFlame") },
  ],
}

const noop = () => {}

const art = vi.hoisted(() => new Map<string, CampArt>())
vi.mock("./campScene/campArt", () => ({ campArt: (id: string) => art.get(id) }))
afterEach(() => art.clear())

const fireLight = { dx: 0, dy: -0.3, radius: 3, color: "#ffb24a", mode: "flicker" as const, strength: 0.6 }
const firelit: CampCatalogue = {
  spots: [
    { id: "water", x: 1, y: 0, frame: 1, footprint: 0.8, steps: [{ chapter: "starter", pieces: [piece("jar")] }] },
  ],
  fixed: [{ id: "campfire", x: 0, y: 0, frame: 1, footprint: 0.8, piece: piece("flame", { lights: [fireLight] }) }],
}

type SceneProps = Omit<ComponentProps<typeof CampScene>, "width" | "height"> & { width?: number; height?: number }
const Scene = ({ width = 390, height = 844, ...props }: SceneProps) => (
  <CampScene width={width} height={height} {...props} />
)

describe("CampScene", () => {
  it("renders only the sky when width or height is 0", () => {
    for (const size of [
      { width: 0, height: 844 },
      { width: 390, height: 0 },
    ]) {
      const { unmount } = render(
        <Scene
          {...size}
          chapter="starter"
          steps={{ fire: 1 }}
          catalogue={catalogue}
          entrances={{ chest: { label: "Collection", onOpen: noop }, window: { label: "Mosaic", onOpen: noop } }}
        />
      )
      expect(screen.queryByText("ring")).toBeNull()
      expect(screen.queryByText("chest")).toBeNull()
      expect(screen.queryAllByRole("button")).toHaveLength(0)
      unmount()
    }
  })

  it("opens the collection from the chest", () => {
    const onOpen = vi.fn()
    render(
      <Scene
        chapter="starter"
        steps={{}}
        catalogue={catalogue}
        entrances={{ chest: { label: "Collection", onOpen } }}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Collection" }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it("shows a badge only when one is given, and names its count", () => {
    render(
      <Scene
        chapter="starter"
        steps={{}}
        catalogue={catalogue}
        entrances={{
          chest: { label: "Collection", onOpen: noop, badge: 3 },
          window: { label: "Mosaic 61/252", onOpen: noop },
        }}
      />
    )
    const chest = screen.getByRole("button", { name: "Collection (3)" })
    const window = screen.getByRole("button", { name: "Mosaic 61/252" })
    expect(within(chest).getByText("3")).toBeTruthy()
    expect(window.textContent).toBe("Mosaic 61/252")
  })

  it("never draws an entrance label below 11px, however far the camera zooms out", () => {
    render(
      <Scene
        width={160}
        height={320}
        chapter="wizard"
        steps={{}}
        catalogue={catalogue}
        entrances={{ chest: { label: "Collection", onOpen: noop } }}
      />
    )
    const tag = screen.getByText("Collection")
    expect(parseFloat(tag.style.fontSize)).toBeGreaterThanOrEqual(11)
  })

  it("offers the journeys entrance only once the map table stands", () => {
    const entrances = { mapTable: { label: "Journeys", onOpen: noop } }
    const { rerender } = render(
      <Scene chapter="starter" steps={{ mapTable: 0 }} catalogue={catalogue} entrances={entrances} />
    )
    expect(screen.queryByRole("button", { name: "Journeys" })).toBeNull()

    rerender(<Scene chapter="starter" steps={{ mapTable: 1 }} catalogue={catalogue} entrances={entrances} />)
    expect(screen.getByRole("button", { name: "Journeys" })).toBeTruthy()
  })

  it("draws a stand-in naming a piece without art", () => {
    render(<Scene chapter="starter" steps={{ fire: 1 }} catalogue={catalogue} />)
    expect(screen.getByText("ring")).toBeTruthy()
  })

  it("casts no shadow under a stand-in", () => {
    const standIns: CampCatalogue = { spots: [catalogue.spots[0]], fixed: [] }
    const { container } = render(<Scene chapter="starter" steps={{ fire: 1 }} catalogue={standIns} />)
    expect(screen.getByText("ring")).toBeTruthy()
    expect(container.querySelectorAll(".camp-shadow")).toHaveLength(0)
  })

  it("drops later-chapter spots when the chapter goes down", () => {
    const steps = fullSteps(catalogue, "wizard")
    const { rerender } = render(<Scene chapter="wizard" steps={steps} catalogue={catalogue} />)
    expect(screen.getByText("thoth")).toBeTruthy()

    rerender(<Scene chapter="starter" steps={steps} catalogue={catalogue} />)
    expect(screen.queryByText("thoth")).toBeNull()
  })

  it("stacks a second frame when a piece has one", () => {
    art.set("flame", { url: "/flame.webp", frameB: "/flame-b.webp" })
    art.set("jar", { url: "/jar.webp" })
    const { container } = render(<Scene chapter="starter" steps={{ water: 1 }} catalogue={firelit} />)
    const frames = [...container.querySelectorAll("img.camp-piece")].map(img => img.getAttribute("src"))
    expect(frames).toEqual(expect.arrayContaining(["/flame.webp", "/flame-b.webp", "/jar.webp"]))
    expect(container.querySelectorAll(".camp-frame--a")).toHaveLength(1)
    expect(container.querySelectorAll(".camp-frame--b")).toHaveLength(1)
    expect(container.querySelector("img[src='/jar.webp']")!.classList.contains("camp-frame--a")).toBe(false)
  })

  it("draws a spot's earlier steps hidden under the current one", () => {
    art.set("jar", { url: "/jar.webp", shadow: "/jar-shadow.webp" })
    art.set("urn", { url: "/urn.webp", shadow: "/urn-shadow.webp" })
    const twoSteps: CampCatalogue = {
      spots: [
        {
          id: "water",
          x: 1,
          y: 0,
          frame: 1,
          footprint: 0.8,
          steps: [
            { chapter: "starter", pieces: [piece("jar")] },
            { chapter: "starter", pieces: [piece("urn", { replaces: ["jar"] })] },
          ],
        },
      ],
      fixed: firelit.fixed,
    }
    const { container } = render(<Scene chapter="starter" steps={{ water: 2 }} catalogue={twoSteps} />)
    const jar = container.querySelector("img[src='/jar.webp']")!
    const urn = container.querySelector("img[src='/urn.webp']")!
    expect(jar.parentElement!.classList.contains("camp-fade--hidden")).toBe(true)
    expect(urn.parentElement!.classList.contains("camp-fade--hidden")).toBe(false)
    expect(jar.compareDocumentPosition(urn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(container.querySelectorAll(".camp-shadow")).toHaveLength(1)
    expect(container.querySelector(".camp-shadow")!.getAttribute("src")).toBe("/urn-shadow.webp")
    expect(container.querySelectorAll(".camp-shade")).toHaveLength(1)
  })

  it("adds a self-shade overlay masked by the piece's own art", () => {
    art.set("jar", { url: "/jar.webp", shadow: "/jar-shadow.webp" })
    const { container } = render(<Scene chapter="starter" steps={{ water: 1 }} catalogue={firelit} />)
    const shades = container.querySelectorAll<HTMLElement>(".camp-shade")
    expect(shades).toHaveLength(1)
    const jar = container.querySelector<HTMLElement>("img[src='/jar.webp']")!
    expect(shades[0].style.maskImage).toMatch(/^url\("?\/jar.webp"?\)$/)
    expect(shades[0].style.backgroundImage).toContain("linear-gradient")
    expect([shades[0].style.left, shades[0].style.top, shades[0].style.width, shades[0].style.height]).toEqual([
      jar.style.left,
      jar.style.top,
      jar.style.width,
      jar.style.height,
    ])
    expect(jar.compareDocumentPosition(shades[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("gives a burning piece neither shadow nor self-shade", () => {
    art.set("flame", { url: "/flame.webp", shadow: "/flame-shadow.webp" })
    const { container } = render(<Scene chapter="starter" steps={{}} catalogue={firelit} />)
    expect(container.querySelector("img[src='/flame.webp']")).toBeTruthy()
    expect(container.querySelectorAll(".camp-shadow")).toHaveLength(0)
    expect(container.querySelectorAll(".camp-shade")).toHaveLength(0)
  })

  describe("lighting", () => {
    const breathe = { dx: 0, dy: 0, radius: 1, color: "#5a96ff", mode: "breathe" as const, strength: 0.5 }
    const lit: CampCatalogue = {
      spots: [],
      fixed: [
        { id: "campfire", x: 0, y: 0, frame: 1, footprint: 0.8, piece: piece("flame", { lights: [fireLight] }) },
        { id: "window", x: 1, y: -1, frame: 1, footprint: 0.8, piece: piece("window", { lights: [breathe] }) },
      ],
    }

    it("lays no tint over the whole camp, so the pieces keep their colour", () => {
      const { container } = render(<Scene chapter="starter" steps={{}} catalogue={lit} />)
      expect(container.querySelector(".camp-night")).toBeNull()
    })

    it("gives every light a wide pool that saturates and a small core that brightens", () => {
      const { container } = render(<Scene chapter="starter" steps={{}} catalogue={lit} />)
      const pools = container.querySelectorAll<HTMLElement>(".camp-glow--pool")
      const cores = container.querySelectorAll<HTMLElement>(".camp-glow--core")
      expect(pools).toHaveLength(2)
      expect(cores).toHaveLength(2)
      for (let i = 0; i < 2; i++)
        expect(parseFloat(pools[i].style.width)).toBeGreaterThan(parseFloat(cores[i].style.width))
    })

    it("lays a light's pool on the sand at its piece's foot, below its core", () => {
      const { container } = render(<Scene chapter="starter" steps={{}} catalogue={lit} />)
      const pool = container.querySelector<HTMLElement>(".camp-glow--pool.camp-glow--flicker")!
      const core = container.querySelector<HTMLElement>(".camp-glow--core.camp-glow--flicker")!
      expect(parseFloat(pool.style.top)).toBeGreaterThan(parseFloat(core.style.top))
    })

    it("raises a handful of embers from a burning piece only", () => {
      const { container } = render(<Scene chapter="starter" steps={{}} catalogue={lit} />)
      const embers = container.querySelectorAll(".camp-ember")
      expect(embers.length).toBeGreaterThan(0)
      expect(embers.length).toBeLessThanOrEqual(8)
    })

    it("twinkles a few stars and leaves the rest still", () => {
      const { container } = render(<Scene chapter="starter" steps={{}} catalogue={lit} />)
      const twinkling = container.querySelectorAll(".camp-star--twinkle").length
      expect(twinkling).toBeGreaterThan(0)
      expect(twinkling).toBeLessThanOrEqual(10)
      expect(container.querySelectorAll(".camp-star").length).toBeGreaterThan(twinkling)
    })
  })
})
