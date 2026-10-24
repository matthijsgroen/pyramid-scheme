// @vitest-environment jsdom
import { render, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SiteMapView } from "./SiteMapView"
import { corridorPiece, floorFrom, roomPiece } from "./floorFixtures.testing"
import type { ReplaysAt } from "./roomReplays"
import { usePromptLabel } from "./usePromptLabel"
import type { CellState } from "@/game/siteTypes"

/** A made-up contribution: every finished room of the "talk" family plays again. */
const talkReplays: ReplaysAt = cell => cell.family === "talk" && cell.state === "completed"

const floorWith = (state: CellState) =>
  floorFrom(["E.T"], {
    ".": dirs => ({ ...corridorPiece(dirs), state: "completed" }),
    T: roomPiece({ family: "talk", state }),
  })

const replayBadges = (container: HTMLElement) => container.querySelectorAll("[data-replay-badge]").length

describe("a room that plays again, on the map", () => {
  it("wears the replay symbol once it is finished", () => {
    const { container } = render(<SiteMapView grid={floorWith("completed")} replaysAt={talkReplays} />)
    expect(replayBadges(container)).toBe(1)
  })

  it("wears none while it is still to be played", () => {
    const { container } = render(<SiteMapView grid={floorWith("reachable")} replaysAt={talkReplays} />)
    expect(replayBadges(container)).toBe(0)
  })

  it("wears none where no contribution offers a replay", () => {
    const { container } = render(<SiteMapView grid={floorWith("completed")} />)
    expect(replayBadges(container)).toBe(0)
  })
})

describe("a room that plays again, in the prompt", () => {
  const label = renderHook(() => usePromptLabel()).result.current
  const atRoom = { kind: "room", at: [0, 2], take: () => {} } as const

  it("offers it as a replay", () => {
    expect(label(atRoom, true)).toBe("ui.prompt.replay")
  })

  it("keeps the room's own words otherwise", () => {
    expect(label(atRoom)).toBe("ui.prompt.here")
  })
})
