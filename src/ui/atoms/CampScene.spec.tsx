// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import type { CampCatalogue, CampPiece } from "./campScene/campTypes"
import { fullSteps } from "./campScene/campLayout"
import { CampScene } from "./CampScene"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

let measured: { width: number; height: number } | null = null

class ResizeObserverStub {
  private callback: ResizeObserverCallback
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }
  observe(target: Element) {
    if (!measured) return
    const entry = { target, contentRect: measured } as unknown as ResizeObserverEntry
    this.callback([entry], this as unknown as ResizeObserver)
  }
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  measured = { width: 390, height: 844 }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

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
    { id: "fire", row: 1, slot: 0, steps: [{ chapter: "starter", pieces: [piece("ring")] }] },
    { id: "mapTable", row: 2, slot: 0, steps: [{ chapter: "starter", pieces: [piece("table")] }] },
    { id: "godStatues", row: 2, slot: 2, steps: [{ chapter: "wizard", pieces: [piece("thoth")] }] },
  ],
  fixed: [
    { id: "chest", row: 2, slot: -1, piece: piece("chest") },
    { id: "window", row: 0, slot: 1, piece: piece("window") },
    { id: "campfire", row: 1, slot: 0, piece: piece("smallFlame") },
  ],
}

const noop = () => {}

describe("CampScene", () => {
  it("renders only the sky before it has been measured", () => {
    measured = null
    render(
      <CampScene
        chapter="starter"
        steps={{ fire: 1 }}
        catalogue={catalogue}
        entrances={{ chest: { onOpen: noop }, window: { onOpen: noop } }}
      />
    )
    expect(screen.queryByText("ring")).toBeNull()
    expect(screen.queryByText("chest")).toBeNull()
    expect(screen.queryAllByRole("button")).toHaveLength(0)
  })

  it("opens the collection from the chest", () => {
    const onOpen = vi.fn()
    render(<CampScene chapter="starter" steps={{}} catalogue={catalogue} entrances={{ chest: { onOpen } }} />)
    fireEvent.click(screen.getByRole("button", { name: /camp\.entrance\.collection/ }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it("shows a badge only when one is given", () => {
    render(
      <CampScene
        chapter="starter"
        steps={{}}
        catalogue={catalogue}
        entrances={{ chest: { onOpen: noop, badge: 3 }, window: { onOpen: noop, label: "61/252" } }}
      />
    )
    const chest = screen.getByRole("button", { name: /camp\.entrance\.collection/ })
    const window = screen.getByRole("button", { name: /camp\.entrance\.mosaic/ })
    expect(within(chest).getByText("3")).toBeTruthy()
    expect(window.textContent).toBe("camp.entrance.mosaic 61/252")
  })

  it("offers the journeys entrance only once the map table stands", () => {
    const entrances = { mapTable: { onOpen: noop } }
    const { rerender } = render(
      <CampScene chapter="starter" steps={{ mapTable: 0 }} catalogue={catalogue} entrances={entrances} />
    )
    expect(screen.queryByRole("button", { name: /camp\.entrance\.journeys/ })).toBeNull()

    rerender(<CampScene chapter="starter" steps={{ mapTable: 1 }} catalogue={catalogue} entrances={entrances} />)
    expect(screen.getByRole("button", { name: /camp\.entrance\.journeys/ })).toBeTruthy()
  })

  it("draws a stand-in naming a piece without art", () => {
    render(<CampScene chapter="starter" steps={{ fire: 1 }} catalogue={catalogue} />)
    expect(screen.getByText("ring")).toBeTruthy()
  })

  it("drops later-chapter spots when the chapter goes down", () => {
    const steps = fullSteps(catalogue, "wizard")
    const { rerender } = render(<CampScene chapter="wizard" steps={steps} catalogue={catalogue} />)
    expect(screen.getByText("thoth")).toBeTruthy()

    rerender(<CampScene chapter="starter" steps={steps} catalogue={catalogue} />)
    expect(screen.queryByText("thoth")).toBeNull()
  })
})
