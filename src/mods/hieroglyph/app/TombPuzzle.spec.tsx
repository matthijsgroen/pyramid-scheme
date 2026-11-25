// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { act, render } from "@testing-library/react"
import type { TableauLevel } from "@/mods/hieroglyph/game/tableaus"
import type { RewardCalculation } from "@/mods/hieroglyph/game/generateRewardCalculation"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
const progress = vi.hoisted(() => ({ found: 0 }))
vi.mock("@/mods/hieroglyph/app/useHieroglyphProgress", () => ({
  useHieroglyphProgress: () => ({ hieroglyphProgress: () => ({ found: progress.found, required: 1 }) }),
}))
type LockProps = {
  onLockChange: (code: string) => void
  onLockSubmit: () => void
  onTileClick: (symbolId: string, position: string) => void
}
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
    symbolCounts: { ankh: 2 },
    hintFormulas: [],
    symbolMapping: {},
    mainFormula: { result: 7 },
  } as unknown as RewardCalculation
  const panelSlides = () => playSound.mock.calls.filter(([name]) => name === "hieroglyph.lockPanel").length

  it("its panel slides out with a sound once, as the last tile is placed; the right code adds none", () => {
    vi.useFakeTimers()
    progress.found = 1
    playSound.mockClear()
    render(
      <FezContext value={{ showConversation: vi.fn() }}>
        <TombPuzzle tableau={{ name: "made-up" } as TableauLevel} calculation={calculation} difficulty="junior" />
      </FezContext>
    )
    act(() => seen.lock!.onTileClick("ankh", "a"))
    expect(panelSlides()).toBe(0)
    act(() => seen.lock!.onTileClick("ankh", "b"))
    expect(panelSlides()).toBe(1)
    act(() => seen.lock!.onLockChange("7"))
    act(() => seen.lock!.onLockSubmit())
    act(() => vi.advanceTimersByTime(2000))
    expect(playSound.mock.calls.map(([name]) => name)).toEqual([
      "hieroglyph.tilePlaced",
      "hieroglyph.tilePlaced",
      "hieroglyph.lockPanel",
    ])
    vi.useRealTimers()
    progress.found = 0
  })
})
