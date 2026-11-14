// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { TreasureComponent } from "./plugin"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import { registerRewardHandler } from "@/app/SiteMap/rewardHandlerRegistry"
import { chestTileUrl } from "@/app/SiteMap/tileAssets"
import type { FamilyContext } from "@/app/families/familyRegistry"

// i18n is never initialized in tests — identity passthrough is enough.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

registerRewardHandler({
  type: "madeUpRelic",
  art: () => ({ kind: "chest", tile: "wardChest" }),
  emoji: "",
  text: () => ({ itemName: "", icon: "" }),
})

// Master, because no chest of its own is painted there: shut, open and the ward key's chest all resolve apart.
const renderChest = (reward?: { type: string }, onSolved = () => {}) => {
  const ctx = { reward, difficulty: "master", tileset: "master" } as unknown as FamilyContext
  // TreasureComponent only reads ctx + onSolved; the other family props are unused here.
  const props = { ctx, onSolved } as unknown as Parameters<typeof TreasureComponent>[0]
  return render(<TreasureComponent {...props} />)
}

const chestSrc = () => screen.getByRole("button", { name: "chest.tapToOpen" }).querySelector("img")?.getAttribute("src")

afterEach(() => {
  vi.useRealTimers()
})

describe("a chest in the encounter frame", () => {
  it("leaves the frame empty, so no bar is drawn behind it, and still asks to be opened", () => {
    const ctx = {} as unknown as FamilyContext
    const props = { ctx, onSolved: () => {} } as unknown as Parameters<typeof TreasureComponent>[0]
    const { container, getByText } = render(
      <EncounterModal>
        <TreasureComponent {...props} />
      </EncounterModal>
    )

    expect((container.firstElementChild as HTMLElement).matches(":has([data-encounter-content]:empty)")).toBe(true)
    expect(getByText("chest.tapToOpen")).toBeTruthy()
  })
})

describe("the chest's painting", () => {
  it("shows the rank's chest shut, then open once tapped, and only then hands over to the reward", () => {
    vi.useFakeTimers()
    const onSolved = vi.fn()
    renderChest({ type: "mosaicPiece" }, onSolved)
    expect(chestSrc()).toBe(chestTileUrl("master", "master", "chestProp", false))

    fireEvent.click(screen.getByRole("button", { name: "chest.tapToOpen" }))
    expect(chestSrc()).toBe(chestTileUrl("master", "master", "chestProp", true))
    expect(onSolved).not.toHaveBeenCalled()

    act(() => vi.runAllTimers())
    expect(onSolved).toHaveBeenCalledTimes(1)
  })

  it("shows the chest a reward names for itself", () => {
    renderChest({ type: "madeUpRelic" })
    expect(chestSrc()).toBe(chestTileUrl("master", "master", "wardChest", false))
  })

  it("opens once, however often it is tapped", () => {
    vi.useFakeTimers()
    const onSolved = vi.fn()
    renderChest(undefined, onSolved)
    const button = screen.getByRole("button", { name: "chest.tapToOpen" })
    fireEvent.click(button)
    fireEvent.click(button)
    act(() => vi.runAllTimers())
    expect(onSolved).toHaveBeenCalledTimes(1)
  })
})

describe("the light behind an opening chest", () => {
  const glowClass = () => screen.getByTestId("chest-glow").className
  const open = () => fireEvent.click(screen.getByRole("button", { name: "chest.tapToOpen" }))

  it("is not there while the chest is shut", () => {
    renderChest({ type: "mosaicPiece" })
    expect(screen.queryByTestId("chest-glow")).toBeNull()
  })

  it("is torchlight behind a plain chest", () => {
    renderChest({ type: "mosaicPiece" })
    open()
    expect(glowClass()).toContain("--color-ember-300")
  })

  it("is the ward's light behind a chest of its own", () => {
    renderChest({ type: "madeUpRelic" })
    open()
    expect(glowClass()).toContain("--color-ward-light")
  })
})
