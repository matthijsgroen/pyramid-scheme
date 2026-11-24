// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { act, render } from "@testing-library/react"
import type { TableauLevel } from "@/mods/hieroglyph/game/tableaus"
import type { RewardCalculation } from "@/mods/hieroglyph/game/generateRewardCalculation"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("@/mods/hieroglyph/app/useHieroglyphProgress", () => ({
  useHieroglyphProgress: () => ({ hieroglyphProgress: () => ({ found: 0, required: 1 }) }),
}))
type LockProps = { onLockChange: (code: string) => void; onLockSubmit: () => void }
const seen = vi.hoisted(() => ({ walls: [] as unknown[], lock: undefined as LockProps | undefined }))
vi.mock("@/mods/hieroglyph/app/TombPuzzleView", () => ({
  TombPuzzleView: ({ wall, ...props }: { wall: unknown } & LockProps) => {
    seen.walls.push(wall)
    seen.lock = props
    return null
  },
}))
const { playSound } = vi.hoisted(() => ({ playSound: vi.fn() }))
vi.mock("@/app/audio/audio", () => ({ playSound }))

const { TombPuzzle } = await import("./TombPuzzle")
const { FezContext } = await import("@/app/fez/context")

describe("a tableau, opened", () => {
  it("teaches how it is worked while it is on screen, before saying what is missing", () => {
    const showConversation = vi.fn()
    render(
      <FezContext value={{ showConversation }}>
        <TombPuzzle
          tableau={{ name: "made-up" } as TableauLevel}
          calculation={
            {
              symbolCounts: { ankh: 1 },
              hintFormulas: [],
              symbolMapping: {},
              mainFormula: { result: 7 },
            } as unknown as RewardCalculation
          }
          difficulty="starter"
        />
      </FezContext>
    )
    expect(showConversation.mock.calls.map(([id]) => id)).toEqual(["tombTutorial", "notEnoughHieroglyphs"])
  })
})

describe("the wall a tableau stands in", () => {
  const calculation = {
    symbolCounts: { ankh: 1 },
    hintFormulas: [],
    symbolMapping: {},
    mainFormula: { result: 7 },
  } as unknown as RewardCalculation
  const open = (wall?: "cave") => {
    seen.walls.length = 0
    render(
      <FezContext value={{ showConversation: vi.fn() }}>
        <TombPuzzle
          tableau={{ name: "made-up" } as TableauLevel}
          calculation={calculation}
          difficulty="junior"
          wall={wall}
        />
      </FezContext>
    )
    return seen.walls.at(-1)
  }

  it("is the room's tileset, so the door that swings open is the wall around it", () => {
    expect(open("cave")).toBe("cave")
  })

  it("is its own rank's wall when the room names none", () => {
    expect(open()).toBe("junior")
  })
})

describe("the tableau lock", () => {
  const calculation = {
    symbolCounts: { ankh: 1 },
    hintFormulas: [],
    symbolMapping: {},
    mainFormula: { result: 7 },
  } as unknown as RewardCalculation
  const enter = (code: string) => {
    act(() => seen.lock!.onLockChange(code))
    act(() => seen.lock!.onLockSubmit())
  }

  it("the right tableau code plays the tableau sound once; a wrong code plays nothing", () => {
    vi.useFakeTimers()
    playSound.mockClear()
    render(
      <FezContext value={{ showConversation: vi.fn() }}>
        <TombPuzzle tableau={{ name: "made-up" } as TableauLevel} calculation={calculation} difficulty="junior" />
      </FezContext>
    )
    enter("3")
    expect(playSound).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(2000))
    enter("7")
    enter("7")
    expect(playSound.mock.calls).toEqual([["hieroglyph.tableauComplete"]])
    vi.useRealTimers()
  })
})
