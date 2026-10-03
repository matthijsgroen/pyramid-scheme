// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render } from "@testing-library/react"
import type { ComponentProps, ReactNode } from "react"
import { getFamilyPlugin, type FamilyContext } from "@/app/families/familyRegistry"
import { PuzzleRoomContext, boardFingerprint } from "@/mods/core/app/puzzleState"
import { clearGameData, writeGameData } from "@/support/useGameStorage"
import "@/mods/registerModApps"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

// Every puzzle family that keeps its board through usePuzzleState, by registry id.
const FAMILIES = [
  "sumplete",
  "eclipse",
  "constellation",
  "canisters",
  "rush-hour",
  "sudoku",
  "star-battle",
  "hidato",
  "procession",
  "futoshiki",
  "balance-scale",
  "lightbeam",
]

const ROOM = "room-under-test"
// Nothing any family's state looks like: a family that takes it cannot draw its board.
const STALE = { stale: "this is not a board of this family" }

const ctxFor = (difficulty: "starter" | "junior") => ({ difficulty }) as FamilyContext

const settle = async () => {
  await act(async () => {
    await Promise.resolve()
  })
  await act(async () => {
    await Promise.resolve()
  })
}

const drawn = async (id: string, difficulty: "starter" | "junior", seed: number, stored?: unknown) => {
  await clearGameData()
  if (stored !== undefined) await writeGameData({ puzzleState: stored })
  const plugin = getFamilyPlugin(id)!
  const puzzle = plugin.generate(seed, ctxFor(difficulty))
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PuzzleRoomContext value={ROOM}>{children}</PuzzleRoomContext>
  )
  const { container } = render(
    <plugin.Component
      {...({ puzzle, ctx: ctxFor(difficulty), onSolved: () => {}, onCancel: () => {} } as ComponentProps<
        typeof plugin.Component
      >)}
    />,
    { wrapper }
  )
  await settle()
  const html = container.innerHTML
  cleanup()
  return { html, puzzle }
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
beforeEach(async () => {
  await clearGameData()
})
afterEach(cleanup)

describe("a stored board that belongs to a different board", () => {
  it.each(FAMILIES)("%s starts fresh instead of taking it", { timeout: 120_000 }, async id => {
    expect(getFamilyPlugin(id), `${id} is registered`).toBeDefined()
    const plugin = getFamilyPlugin(id)!
    const before = plugin.generate(1, ctxFor("starter"))
    const fresh = await drawn(id, "junior", 2)
    expect(boardFingerprint(before), `${id}: the two boards differ`).not.toBe(boardFingerprint(fresh.puzzle))

    const stale = await drawn(id, "junior", 2, { room: ROOM, state: STALE, board: boardFingerprint(before) })
    expect(stale.html).toBe(fresh.html)
  })
})

describe("a stored board written before boards were stamped", () => {
  it.each(FAMILIES)("%s does not trust it and starts fresh", { timeout: 120_000 }, async id => {
    const fresh = await drawn(id, "junior", 2)
    const unstamped = await drawn(id, "junior", 2, { room: ROOM, state: STALE })
    expect(unstamped.html).toBe(fresh.html)
  })
})
