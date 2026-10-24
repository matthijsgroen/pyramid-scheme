// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TreasureComponent } from "./plugin"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import type { FamilyContext } from "@/app/families/familyRegistry"

// i18n is never initialized in tests — identity passthrough is enough (the "tap to open" copy is
// irrelevant to the variant we assert on).
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

// The ornate "vibrant" chest is the only variant that renders the ankh glyph "☥"; wooden/muted don't.
// So its presence in the DOM is a reliable proxy for "the fancy chest rendered".
const ANKH = "☥"

const renderChest = (reward?: { type: string }) => {
  const ctx = { reward } as unknown as FamilyContext
  // TreasureComponent only reads ctx + onSolved; the other family props are unused here.
  const props = { ctx, onSolved: () => {} } as unknown as Parameters<typeof TreasureComponent>[0]
  return render(<TreasureComponent {...props} />)
}

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

describe("treasure chest variant", () => {
  it("renders the ornate chest when the reward is a ward key (tombKey)", () => {
    const { baseElement: container } = renderChest({ type: "tombKey" })
    expect(container.textContent).toContain(ANKH)
  })

  it("renders the plain wooden chest for other rewards", () => {
    const { baseElement: container } = renderChest({ type: "mosaicPiece" })
    expect(container.textContent).not.toContain(ANKH)
  })

  it("renders the plain wooden chest when there is no reward", () => {
    const { baseElement: container } = renderChest(undefined)
    expect(container.textContent).not.toContain(ANKH)
  })
})
