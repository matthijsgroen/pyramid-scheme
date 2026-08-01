import { render, act } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { Level } from "./Level"
import { generateLevel } from "@/game/generateLevel"
import { mulberry32 } from "@/game/random"
import { getAnswers } from "@/game/state"
import { useGameStorage, clearGameData } from "@/support/useGameStorage"
import { renderHook } from "@testing-library/react"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const STORAGE_KEY = "level-starter_1-1-12345"

const makeContent = () =>
  generateLevel(
    1,
    { floorCount: 4, openBlockCount: 3, blockedBlockCount: 0, lowestFloorNumberRange: [1, 6] },
    mulberry32(42)
  )

// Writes the solved board straight into the slot Level reads, the way a previous visit would
// have left it.
const persistSolvedAnswers = async (content: ReturnType<typeof makeContent>) => {
  const solution = getAnswers(content.pyramid)!
  const values = Object.fromEntries(
    content.pyramid.blocks.filter(b => b.isOpen).map(b => [b.id, solution[b.id]] as const)
  )
  const { result } = renderHook(() =>
    useGameStorage<{ key: string; values: Record<string, number | undefined> }>("levelAnswers", {
      key: "",
      values: {},
    })
  )
  await act(async () => {
    await result.current[1]({ key: STORAGE_KEY, values })
  })
}

const settle = async () => {
  await act(async () => {
    await Promise.resolve()
  })
}

describe("Level — a board restored from a previous visit", () => {
  beforeEach(async () => {
    await clearGameData()
  })

  it("hands back an empty, playable board when the stored answers already solve it", async () => {
    // Re-entering a pyramid means re-solving its exterior board. Restoring the previous
    // solution instead left every input `disabled` and every block deselected — a board the
    // player could look at but not touch.
    const content = makeContent()
    await persistSolvedAnswers(content)

    const { container } = render(<Level content={content} storageKey={STORAGE_KEY} />)
    await settle()
    await settle()

    const inputs = [...container.querySelectorAll<HTMLInputElement>("input")]
    expect(inputs.length).toBeGreaterThan(0)
    expect(inputs.every(input => !input.disabled)).toBe(true)
    expect(inputs.every(input => input.value === "")).toBe(true)
  })

  it("does not replay the completion sequence for a solution the player didn't just enter", async () => {
    // onComplete drives the celebration overlay — a full-screen click catcher. Firing it for a
    // restored solution puts that catcher over a board the player never touched.
    const content = makeContent()
    await persistSolvedAnswers(content)
    const onComplete = vi.fn()

    render(<Level content={content} storageKey={STORAGE_KEY} onComplete={onComplete} />)
    await settle()
    await settle()

    expect(onComplete).not.toHaveBeenCalled()
  })

  it("keeps a partly-filled board, which is what the slot is for", async () => {
    const content = makeContent()
    const solution = getAnswers(content.pyramid)!
    const firstOpen = content.pyramid.blocks.find(b => b.isOpen)!
    const { result } = renderHook(() =>
      useGameStorage<{ key: string; values: Record<string, number | undefined> }>("levelAnswers", {
        key: "",
        values: {},
      })
    )
    await act(async () => {
      await result.current[1]({ key: STORAGE_KEY, values: { [firstOpen.id]: solution[firstOpen.id] } })
    })

    const { container } = render(<Level content={content} storageKey={STORAGE_KEY} />)
    await settle()
    await settle()

    const filled = [...container.querySelectorAll<HTMLInputElement>("input")].filter(input => input.value !== "")
    expect(filled).toHaveLength(1)
    expect(filled[0].value).toBe(String(solution[firstOpen.id]))
  })
})
