// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { FezContext } from "@/app/fez/context"
import { wallFor } from "@/mods/story/game/reading/walls"

// What the player has finished collecting — the only thing that decides what they can read or fix.
let held = new Set<string>()
vi.mock("@/mods/hieroglyph/app/useHieroglyphProgress", () => ({
  useHieroglyphProgress: () => ({ completedHieroglyphKeys: held }),
}))
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("@/mods/registeredMods", () => ({ isModEnabled: () => false }))

const { ReadingComponent } = await import("./plugin")

const wall = wallFor("junior_treasure_tomb")!
const symbols = { art5: "𓍷", a11: "𓅐", a7: "𓅬", a12: "𓅓" }

const show = (ids: string[], journeyId = "junior_treasure_tomb") => {
  held = new Set(ids.map(id => `hieroglyph:${id}`))
  const showConversation = vi.fn()
  const onCancel = vi.fn()
  render(
    <FezContext value={{ showConversation } as unknown as React.ContextType<typeof FezContext>}>
      <ReadingComponent
        ctx={{ journeyId, edgeId: "e", address: "a", sectionHash: "s", freshArrival: true }}
        puzzle={{}}
        progression={{} as never}
        journeys={{ markCellExplored: vi.fn() } as never}
        inventory={{} as never}
        applyReward={vi.fn()}
        onSolved={vi.fn()}
        onCancel={onCancel}
      />
    </FezContext>
  )
  return { showConversation, onCancel }
}

describe("a wall with a sign cut wrong", () => {
  it("shows the line as cut, wrong sign and all", () => {
    show([])

    for (const id of wall.cut)
      expect(screen.getAllByText(symbols[id as keyof typeof symbols]).length).toBeGreaterThan(0)
  })

  it("says plainly that it cannot be fixed yet, when the sign is not known", () => {
    show(["art5", "a11"])

    expect(screen.getByText("story.wall.cannot")).toBeTruthy()
  })

  it("offers the repair once the right sign has been collected", () => {
    show(["a12"])

    expect(screen.getByText("story.wall.pick")).toBeTruthy()
  })

  it("carries on the conversation when the right sign goes in", () => {
    const { showConversation } = show(["a12", "a7"])

    fireEvent.click(screen.getAllByRole("button").find(b => b.textContent === symbols.a12)!)

    expect(showConversation).toHaveBeenCalledWith(wall.after, expect.any(Function), { story: true, forceReplay: true })
  })

  it("does not carry on for a sign that does not belong there", () => {
    const { showConversation } = show(["a12", "a7"])

    fireEvent.click(screen.getAllByRole("button").find(b => b.textContent === symbols.a7)!)

    expect(showConversation).not.toHaveBeenCalled()
  })
})

describe("the Sphinx, with a sign the sand took", () => {
  const sphinx = wallFor("starter_1")!
  const gap = () => screen.getByLabelText("story.sphinx.gap")

  it("shows the signs still cut, and a space where the last one was", () => {
    show(["art5", "d3"], "starter_1")

    expect(screen.getByText("𓍷")).toBeTruthy()
    expect(screen.getByText("𓅃")).toBeTruthy()
    expect(gap().textContent).toBe("")
  })

  it("offers no tray — the space takes what the player holds, not a choice", () => {
    show(["art5", "d3", "a12", "a7"], "starter_1")

    expect(screen.queryByText("𓅓")).toBeNull()
  })

  it("says plainly it cannot be read yet, and does nothing when the space is touched", () => {
    const { showConversation } = show(["art5", "d3"], "starter_1")

    expect(screen.getByText("story.sphinx.cannot")).toBeTruthy()
    fireEvent.click(gap())

    expect(showConversation).not.toHaveBeenCalled()
  })

  it("plays the ending once the reed leaf goes in", () => {
    const { showConversation } = show(["art5", "d3", "s1"], "starter_1")

    fireEvent.click(gap())

    expect(showConversation).toHaveBeenCalledWith(sphinx.after, expect.any(Function), {
      story: true,
      forceReplay: true,
    })
    expect(screen.getByText("𓇋")).toBeTruthy()
  })
})
