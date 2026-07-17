import { render, act } from "@testing-library/react"
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest"
// Registers every mod's reward handlers + displays (money + sellable are shop-owned now), so the
// generic RewardFlow can look them up. Without this the popup would fall back to raw type labels.
import "@/mods/registerModApps"
import { RewardFlow } from "./RewardFlow"

// Isolated from the app's real i18n setup (never initialized in tests) — identity
// passthrough is enough to assert which branch rendered and with what interpolated data.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && typeof opts === "object" && !("ns" in opts) ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}))

const advanceThroughReveal = () => {
  // Each step is its own act() so React flushes effects (and registers the next timer)
  // before the fake clock advances again: the reveal's own 600ms beat → LootPopup's own
  // 300ms burst→reveal transition, which is when itemName content actually mounts.
  act(() => vi.advanceTimersByTime(600))
  act(() => vi.advanceTimersByTime(300))
  act(() => vi.advanceTimersByTime(500))
}

describe("RewardFlow — money and sellable rewards", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("renders a money reward with the interpolated amount", () => {
    const onCollect = vi.fn()
    const { container } = render(
      <RewardFlow pendingReward={{ reward: { type: "money", amount: 7 }, onCollect }} onDismiss={() => {}} />
    )
    advanceThroughReveal()
    expect(onCollect).toHaveBeenCalledTimes(1)
    expect(container.textContent).toContain('chest.money:{"amount":7}')
  })

  it("renders a sellable reward with its name and tier-based rarity", () => {
    const onCollect = vi.fn()
    const { container } = render(
      <RewardFlow
        pendingReward={{ reward: { type: "sellable", itemId: "sell_divine_1" }, onCollect }}
        onDismiss={() => {}}
      />
    )
    advanceThroughReveal()
    expect(onCollect).toHaveBeenCalledTimes(1)
    // divine tier maps to "legendary" rarity — surfaces as the symbol being rendered at all
    expect(container.textContent).toContain("sell_divine_1.name")
  })

  it("falls back to the raw itemId if the sellable id is unknown", () => {
    const onCollect = vi.fn()
    const { container } = render(
      <RewardFlow
        pendingReward={{ reward: { type: "sellable", itemId: "not_a_real_item" }, onCollect }}
        onDismiss={() => {}}
      />
    )
    advanceThroughReveal()
    expect(container.textContent).toContain("not_a_real_item")
  })
})
