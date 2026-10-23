// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import type { ComponentProps } from "react"
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

  it("drops later-chapter spots when the chapter goes down", () => {
    const steps = fullSteps(catalogue, "wizard")
    const { rerender } = render(<Scene chapter="wizard" steps={steps} catalogue={catalogue} />)
    expect(screen.getByText("thoth")).toBeTruthy()

    rerender(<Scene chapter="starter" steps={steps} catalogue={catalogue} />)
    expect(screen.queryByText("thoth")).toBeNull()
  })
})
