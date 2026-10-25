// @vitest-environment jsdom
import { render, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MOSAIC_TIERS, MOSAIC_TOTAL } from "@/mods/mosaic/game/mosaicCurrency"
import type { TierCounts } from "@/mods/mosaic/game/placementQueue"
import { MosaicWindow } from "./MosaicWindow"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

afterEach(cleanup)

const counts = (n: number): TierCounts => Object.fromEntries(MOSAIC_TIERS.map(t => [t, n])) as TierCounts

describe(MosaicWindow, () => {
  it("keeps the place button's space with nothing in hand, so the window never resizes under the player", () => {
    const { container } = render(<MosaicWindow owned={counts(0)} placed={counts(0)} onPlace={() => {}} />)

    const button = container.querySelector("button")!
    expect(button.className).toContain("invisible")
    expect(button.disabled).toBe(true)
  })

  it("offers the carried pieces once there are any", () => {
    const owned = { ...counts(0), [MOSAIC_TIERS[0]]: 2 }
    const { container } = render(<MosaicWindow owned={owned} placed={counts(0)} onPlace={() => {}} />)

    const button = container.querySelector("button")!
    expect(button.className).not.toContain("invisible")
    expect(button.disabled).toBe(false)
  })
})

describe("MosaicWindow count", () => {
  it("counts found as placed plus carried, with the carried ones as new", () => {
    const owned = { ...counts(0), [MOSAIC_TIERS[0]]: 3 }
    const placed = { ...counts(0), [MOSAIC_TIERS[0]]: 1 }
    const { getByRole, getByText } = render(<MosaicWindow owned={owned} placed={placed} onPlace={() => {}} />)

    expect(getByRole("progressbar").getAttribute("aria-valuenow")).toBe("3")
    expect(getByRole("progressbar").getAttribute("aria-valuemax")).toBe(String(MOSAIC_TOTAL))
    expect(getByText("mosaic.window.count")).toBeTruthy()
    expect(getByText("mosaic.window.new")).toBeTruthy()
  })

  it("says nothing is new with nothing carried", () => {
    const { queryByText } = render(<MosaicWindow owned={counts(0)} placed={counts(0)} onPlace={() => {}} />)
    expect(queryByText("mosaic.window.new")).toBeNull()
  })
})
