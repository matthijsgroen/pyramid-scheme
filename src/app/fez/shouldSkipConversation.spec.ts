import { describe, expect, it } from "vitest"
import { shouldSkipConversation } from "./shouldSkipConversation"

describe(shouldSkipConversation, () => {
  it("shows an unseen conversation when tutorials are enabled", () => {
    expect(shouldSkipConversation({ alreadySeen: false, tutorialsEnabled: true })).toBe(false)
  })

  it("skips an already-seen conversation", () => {
    expect(shouldSkipConversation({ alreadySeen: true, tutorialsEnabled: true })).toBe(true)
  })

  it("skips a new conversation when tutorials are disabled", () => {
    expect(shouldSkipConversation({ alreadySeen: false, tutorialsEnabled: false })).toBe(true)
  })

  it("still shows the conversation on an explicit replay, even with tutorials disabled", () => {
    expect(shouldSkipConversation({ alreadySeen: true, tutorialsEnabled: false, forceReplay: true })).toBe(false)
  })

  it("plays a story beat with tutorials turned off", () => {
    expect(shouldSkipConversation({ alreadySeen: false, tutorialsEnabled: false, story: true })).toBe(false)
  })

  it("does not repeat a story beat that has been seen", () => {
    expect(shouldSkipConversation({ alreadySeen: true, tutorialsEnabled: true, story: true })).toBe(true)
  })
})
