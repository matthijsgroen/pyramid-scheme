import { describe, expect, it } from "vitest"
import { shouldSkipConversation } from "./shouldSkipConversation"

describe(shouldSkipConversation, () => {
  it("shows an unseen conversation when tutorials are enabled", () => {
    expect(shouldSkipConversation(false, true, undefined)).toBe(false)
  })

  it("skips an already-seen conversation", () => {
    expect(shouldSkipConversation(true, true, undefined)).toBe(true)
  })

  it("skips a new conversation when tutorials are disabled", () => {
    expect(shouldSkipConversation(false, false, undefined)).toBe(true)
  })

  it("still shows the conversation on an explicit replay, even with tutorials disabled", () => {
    expect(shouldSkipConversation(true, false, true)).toBe(false)
  })
})
