// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { EXIT_INTRO, useExitIntro } from "./useExitIntro"
import type { ArrivalPromptKind } from "./useSiteNavigation"

const asked = (kinds: (ArrivalPromptKind | undefined)[]) => {
  const showConversation = vi.fn()
  const { rerender } = renderHook(({ kind }) => useExitIntro(kind, showConversation), {
    initialProps: { kind: kinds[0] },
  })
  for (const kind of kinds.slice(1)) rerender({ kind })
  return showConversation.mock.calls.map(([id]) => id)
}

describe("useExitIntro", () => {
  it("explains the pillar in its own room, once the player stands there", () => {
    expect(asked([undefined, "exit"])).toEqual([EXIT_INTRO])
  })

  it("says nothing on any other arrival", () => {
    expect(asked([undefined, "room", "stairs", "obstacle", "plate"])).toEqual([])
  })
})
