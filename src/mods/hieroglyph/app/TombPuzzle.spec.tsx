// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import type { TableauLevel } from "@/mods/hieroglyph/game/tableaus"
import type { RewardCalculation } from "@/mods/hieroglyph/game/generateRewardCalculation"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("@/mods/hieroglyph/app/useHieroglyphProgress", () => ({
  useHieroglyphProgress: () => ({ hieroglyphProgress: () => ({ found: 0, required: 1 }) }),
}))
const seen = vi.hoisted(() => ({ walls: [] as unknown[] }))
vi.mock("@/mods/hieroglyph/app/TombPuzzleView", () => ({
  TombPuzzleView: ({ wall }: { wall: unknown }) => {
    seen.walls.push(wall)
    return null
  },
}))

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
