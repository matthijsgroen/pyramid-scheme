import { describe, it, expect } from "vitest"
import { registerRewardHandler, getRewardHandler } from "./rewardHandlerRegistry"

describe("rewardHandlerRegistry", () => {
  it("registers a handler and retrieves it by reward type", () => {
    const apply = () => {}
    const text = () => ({ itemName: "Test", icon: "🔷" })
    registerRewardHandler({ type: "testReward", apply, emoji: "🔷", text })
    const handler = getRewardHandler("testReward")
    expect(handler?.apply).toBe(apply)
    expect(handler?.text).toBe(text)
    expect(handler?.emoji).toBe("🔷")
  })

  it("returns undefined for an unregistered type", () => {
    expect(getRewardHandler("neverRegistered")).toBeUndefined()
  })

  it("registering the same type again overwrites the previous handler", () => {
    registerRewardHandler({
      type: "testReward",
      apply: () => {},
      emoji: "🔷",
      text: () => ({ itemName: "A", icon: "🔷" }),
    })
    registerRewardHandler({
      type: "testReward",
      apply: () => {},
      emoji: "🥇",
      text: () => ({ itemName: "B", icon: "🥇" }),
    })
    expect(getRewardHandler("testReward")?.emoji).toBe("🥇")
  })
})
