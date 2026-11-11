// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { FezContext } from "@/app/fez/context"
import { allItems } from "@/mods/hieroglyph/game/symbolCatalogue"
import type { Wall } from "@/mods/story/game/reading/walls"

// What the player has finished collecting — the only thing that decides what they can read or fix.
let held = new Set<string>()
vi.mock("@/mods/hieroglyph/app/useHieroglyphProgress", () => ({
  useHieroglyphProgress: () => ({ completedHieroglyphKeys: held, loaded: true }),
}))
// The conversations the save has heard.
let heard: Record<string, boolean> = {}
vi.mock("@/support/useGameStorage", () => ({ useGameStorage: () => [heard, vi.fn(), true] }))
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("@/mods/registeredMods", () => ({ isModEnabled: () => false }))

const panel: Wall["panel"] = { aspect: 1.3, signs: { x: 0.2, y: 0.3, width: 0.6, height: 0.4 }, flow: "row" }

// Made-up walls: one miscut, one scoured, one scoured with a hint, standing on different floors of one journey.
const miscut: Wall = {
  at: { levelNr: 2, floor: 0 },
  cut: ["d1", "a1", "p1"],
  wrongAt: 1,
  answer: "a2",
  copy: "test.miscut",
  after: "test.miscutFixed",
  panel,
}
const scoured: Wall = {
  at: { levelNr: 2, floor: 1 },
  cut: ["d1", ""],
  wrongAt: 1,
  answer: "s1",
  missing: true,
  copy: "test.scoured",
  after: "test.scouredFixed",
  panel: { ...panel, frame: 0 },
}
const hinted: Wall = {
  ...scoured,
  at: { levelNr: 2, floor: 2 },
  copy: "test.hinted",
  after: "test.hintedFixed",
  hint: "test.hint",
  panel,
}
vi.mock("@/mods/story/game/reading/walls", async importOriginal => ({
  ...(await importOriginal<typeof import("@/mods/story/game/reading/walls")>()),
  wallFor: (journeyId: string, levelNr: number, floor: number) =>
    journeyId === "test_journey"
      ? [miscut, scoured, hinted].find(wall => wall.at.levelNr === levelNr && wall.at.floor === floor)
      : undefined,
}))

const { ReadingComponent } = await import("./plugin")

// The scene waits for the sign's crossfade, so every click is followed by the time it takes.
beforeEach(() => {
  vi.useFakeTimers()
  heard = {}
})
afterEach(() => vi.useRealTimers())
const settle = () => act(() => vi.advanceTimersByTime(1000))
const symbolOf = (id: string) => allItems.find(item => item.id === id)!.symbol

const show = (wall: Wall, ids: string[]) => {
  held = new Set(ids.map(id => `hieroglyph:${id}`))
  const showConversation = vi.fn()
  const onCancel = vi.fn()
  render(
    <FezContext value={{ showConversation } as unknown as React.ContextType<typeof FezContext>}>
      <ReadingComponent
        ctx={{
          journeyId: "test_journey",
          edgeId: "e",
          address: `main#${wall.at.floor}/p3`,
          sectionHash: "s",
          levelNr: wall.at.levelNr,
          freshArrival: true,
        }}
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
    show(miscut, [])

    for (const id of miscut.cut) expect(screen.getAllByText(symbolOf(id)).length).toBeGreaterThan(0)
  })

  it("says plainly that it cannot be fixed yet, when the sign is not known", () => {
    show(miscut, ["d1", "a1"])

    expect(screen.getByText("test.miscut.cannot")).toBeTruthy()
  })

  it("offers the repair once the right sign has been collected", () => {
    show(miscut, [miscut.answer])

    expect(screen.getByText("test.miscut.pick")).toBeTruthy()
  })

  it("carries on the conversation when the right sign goes in", () => {
    const { showConversation } = show(miscut, [miscut.answer, "a1"])

    fireEvent.click(screen.getAllByRole("button").find(b => b.textContent === symbolOf(miscut.answer))!)
    settle()

    expect(showConversation).toHaveBeenCalledWith(miscut.after, expect.any(Function), {
      story: true,
      forceReplay: true,
    })
  })

  it("does not carry on for a sign that does not belong there", () => {
    const { showConversation } = show(miscut, [miscut.answer, "a1"])

    fireEvent.click(screen.getAllByRole("button").find(b => b.textContent === symbolOf("a1"))!)
    settle()

    expect(showConversation).not.toHaveBeenCalled()
  })
})

describe("a wall with a sign scoured away", () => {
  const gap = () => screen.getByLabelText("test.scoured.gap")

  it("shows the signs still cut, and a space where the last one was", () => {
    show(scoured, ["d1"])

    expect(screen.getByText(symbolOf("d1"))).toBeTruthy()
    expect(gap().textContent).toBe("")
  })

  it("offers no tray — the space takes what the player holds, not a choice", () => {
    show(scoured, ["d1", "a1", "a2"])

    expect(screen.queryByText(symbolOf("a1"))).toBeNull()
  })

  it("says plainly it cannot be read yet, and does nothing when the space is touched", () => {
    const { showConversation } = show(scoured, ["d1"])

    expect(screen.getByText("test.scoured.cannot")).toBeTruthy()
    fireEvent.click(gap())
    settle()

    expect(showConversation).not.toHaveBeenCalled()
  })

  it("plays its scene once the sign goes in", () => {
    const { showConversation } = show(scoured, ["d1", scoured.answer])

    fireEvent.click(gap())
    settle()

    expect(showConversation).toHaveBeenCalledWith(scoured.after, expect.any(Function), {
      story: true,
      forceReplay: true,
    })
    expect(screen.getByText(symbolOf(scoured.answer))).toBeTruthy()
  })
})

describe("the wall on this floor", () => {
  it("is the one standing at the room's place, not another of the same journey", () => {
    show(scoured, [])

    expect(screen.getByText("test.scoured.wrong")).toBeTruthy()
    expect(screen.queryByText("test.miscut.wrong")).toBeNull()
  })

  it("closes the room where no wall stands", () => {
    const { onCancel } = show({ ...miscut, at: { levelNr: 9, floor: 9 } }, [])

    expect(onCancel).toHaveBeenCalled()
  })
})

describe("a cartouche", () => {
  it("is drawn round the signs only on a wall that has one", () => {
    show(scoured, [])
    expect(screen.queryByTestId("cartouche-rope")).not.toBeNull()
  })

  it("is not drawn on a bare stela", () => {
    show(miscut, [])
    expect(screen.queryByTestId("cartouche-rope")).toBeNull()
  })
})

describe("a wall put right on an earlier visit", () => {
  it("stands put right: the right sign in place and nothing left to pick", () => {
    heard = { [miscut.after]: true }
    show(miscut, [miscut.answer])

    expect(screen.getByText("test.miscut.fixed")).toBeTruthy()
    expect(screen.queryByText("test.miscut.pick")).toBeNull()
  })

  it("does not play its scene again", () => {
    heard = { [scoured.after]: true }
    const { showConversation } = show(scoured, [scoured.answer])
    settle()

    expect(showConversation).not.toHaveBeenCalled()
  })
})

describe("a wall's hint", () => {
  const hintCall = [hinted.hint, undefined, { story: true, forceReplay: true }]

  it("plays on opening the wall without the sign — on every visit, heard before or not", () => {
    heard = { [hinted.hint!]: true }
    const { showConversation } = show(hinted, ["d1"])

    expect(showConversation.mock.calls).toEqual([hintCall])
  })

  it("does not play once the player holds the sign", () => {
    const { showConversation } = show(hinted, ["d1", hinted.answer])

    expect(showConversation).not.toHaveBeenCalled()
  })

  it("does not play at a wall already put right", () => {
    heard = { [hinted.after]: true }
    const { showConversation } = show(hinted, [])

    expect(showConversation).not.toHaveBeenCalled()
  })

  it("is nothing at a wall that has none", () => {
    const { showConversation } = show(scoured, ["d1"])

    expect(showConversation).not.toHaveBeenCalled()
  })
})
