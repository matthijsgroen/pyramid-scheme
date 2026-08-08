import { render, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MOSAIC_TIERS } from "@/mods/mosaic/game/mosaicCurrency"
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
