// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import { FezContext } from "@/app/fez/context"
import { revisitLines } from "@/mods/story/game/conversation/revisits"

// The save's record of heard conversations, as the room reads it.
let heard: Record<string, boolean> = {}
vi.mock("@/support/useGameStorage", () => ({ useGameStorage: () => [heard, vi.fn(), true] }))
vi.mock("@/mods/registeredMods", () => ({ isModEnabled: () => false }))

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
