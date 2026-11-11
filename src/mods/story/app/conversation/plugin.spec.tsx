// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { FezContext } from "@/app/fez/context"
import { revisitLines } from "@/mods/story/game/conversation/revisits"
import { FORMULA, formulaGift, formulaHint, type FormulaRow } from "@/mods/story/game/reading/formula"

// The save's record of heard conversations, as the room reads it.
let heard: Record<string, boolean> = {}
const setHeard = vi.fn()
vi.mock("@/support/useGameStorage", () => ({ useGameStorage: () => [heard, setHeard, true] }))
vi.mock("@/mods/registeredMods", () => ({ isModEnabled: () => false }))
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

const { ConversationComponent } = await import("./plugin")

const visit = (record: Record<string, boolean>, journeyId = "starter_treasure_tomb") => {
  heard = record
  const showConversation = vi.fn()
  const room = () => (
    <FezContext value={{ showConversation } as unknown as React.ContextType<typeof FezContext>}>
      <ConversationComponent
        ctx={{ journeyId, edgeId: "e", address: "a", sectionHash: "s", levelNr: 1, freshArrival: true }}
        puzzle={{}}
        progression={{} as never}
        journeys={{ markCellExplored: vi.fn() } as never}
        inventory={{} as never}
        applyReward={vi.fn()}
        onSolved={vi.fn()}
        onCancel={vi.fn()}
      />
    </FezContext>
  )
  const { rerender } = render(room())
  const played = () => showConversation.mock.calls.map(([id]) => id as string)
  return Object.assign(played(), {
    options: showConversation.mock.calls[0]?.[2] as { forceReplay?: boolean } | undefined,
    again: (next: Record<string, boolean>) => ((heard = next), rerender(room()), played()),
  })
}

describe("a ghost's room", () => {
  it("plays the whole scene the first time, as story", () => {
    expect([...visit({})]).toEqual(["tomb.starter"])
  })

  it("plays one line for where the story stands once the scene has been heard", () => {
    const record = { "tomb.starter": true, "tomb.junior": true }
    const [played] = visit(record)

    expect(revisitLines("tomb.starter", record)).toContain(played)
  })

  it("asks once per visit, though the save changes as the line is heard", () => {
    const played = visit({ "tomb.starter": true })

    expect(played.again({ "tomb.starter": true, [played[0]]: true })).toHaveLength(1)
  })
})

describe("a room only the living speak in", () => {
  it("plays the whole scene again once it has been heard, past the heard check", () => {
    const played = visit({ "meeting.starter_1": true }, "starter_1")

    expect([...played]).toEqual(["meeting.starter_1"])
    expect(played.options?.forceReplay).toBe(true)
  })

  it("writes nothing to the save of its own, so playing it again changes no progress", () => {
    setHeard.mockClear()
    visit({ "tomb.expertB": true }, "expert_treasure_tomb_b")

    expect(setHeard).not.toHaveBeenCalled()
  })
})

describe("a ghost who owes a gift", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  // The order things happen in, across the reward and the scene.
  const giftVisit = (row: FormulaRow, record: Record<string, boolean>) => {
    heard = record
    const order: string[] = []
    let finishScene = () => {}
    const showConversation = vi.fn((id: string, onComplete?: () => void) => {
      order.push(`play ${id}`)
      finishScene = () => onComplete?.()
    })
    const applyReward = vi.fn((reward: { type: string; hieroglyphId?: string }) =>
      order.push(`grant ${reward.type} ${reward.hieroglyphId}`)
    )
    const onCancel = vi.fn()
    render(
      <FezContext value={{ showConversation } as unknown as React.ContextType<typeof FezContext>}>
        <ConversationComponent
          ctx={{
            journeyId: "made_up",
            edgeId: "e",
            address: "a",
            sectionHash: "s",
            levelNr: 1,
            freshArrival: true,
            encounterArgs: { conversation: row.giver },
          }}
          puzzle={{}}
          progression={{} as never}
          journeys={{ markCellExplored: vi.fn() } as never}
          inventory={{} as never}
          applyReward={applyReward}
          onSolved={vi.fn()}
          onCancel={onCancel}
        />
      </FezContext>
    )
    return { order, applyReward, onCancel, finishScene: () => act(() => finishScene()) }
  }
  const row = FORMULA[0]
  const owed = { [row.giver]: true, [formulaHint(row)]: true }

  it("hands the sign over whole, before the scene plays", () => {
    const { order, applyReward } = giftVisit(row, owed)

    expect(order).toEqual([`grant hieroglyphFragment ${row.sign}`, `play ${formulaGift(row)}`])
    expect(applyReward).toHaveBeenCalledWith({ type: "hieroglyphFragment", hieroglyphId: row.sign, pieceIndex: 0 })
  })

  it("shows what was received once the scene is over, and closes the room when it is dismissed", () => {
    const { finishScene, onCancel } = giftVisit(row, owed)
    expect(screen.queryByText("loot.youReceived")).toBeNull()

    finishScene()
    // The reveal's own beats, each flushed before the clock moves on.
    for (const ms of [600, 300, 500]) act(() => vi.advanceTimersByTime(ms))

    expect(screen.getByText("loot.youReceived")).toBeTruthy()
    expect(onCancel).not.toHaveBeenCalled()

    // The popup is dismissed by a tap beside it, on its backdrop.
    fireEvent.click(screen.getByText("loot.youReceived").closest(".fixed")!.firstElementChild!)
    act(() => vi.advanceTimersByTime(200))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("gives nothing once the gift has been given", () => {
    const { order } = giftVisit(row, { ...owed, [formulaGift(row)]: true })

    expect(order.filter(step => step.startsWith("grant"))).toEqual([])
  })
})
