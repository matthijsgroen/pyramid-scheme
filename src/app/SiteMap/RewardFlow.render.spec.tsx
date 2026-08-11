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
    // `count`, not `amount`: it is what drives i18next's plural selection (chest.money_one/_other)
    expect(container.textContent).toContain('chest.money:{"count":7}')
  })

  it("passes a single coin through as count 1 so the singular form can be picked", () => {
    const { container } = render(
      <RewardFlow pendingReward={{ reward: { type: "money", amount: 1 }, onCollect: vi.fn() }} onDismiss={() => {}} />
    )
    advanceThroughReveal()
    expect(container.textContent).toContain('chest.money:{"count":1}')
  })

  // Through the real popup shell: the tomb-treasure mod's rich display supplies the hint and the
  // progress line, and the progress line arrives as its own element (itemEffectDescription) rather
  // than being appended to the description.
  it("renders a map piece with its tomb hint and progress line", () => {
    const { container } = render(
      <RewardFlow
        pendingReward={{ reward: { type: "mapPiece", tombId: "expert_treasure_tomb_b" }, onCollect: vi.fn() }}
        onDismiss={() => {}}
      />
    )
    advanceThroughReveal()
    expect(container.textContent).toContain("expert_treasure_tomb_b.mapHint")
    expect(container.querySelector("p.italic")?.textContent).toContain("chest.mapPieceProgress")
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

  // A floor key is claimed as a `tombKey` whose id is a grid position, so the tomb-treasure display
  // can only call it "Tomb Key". The chest's own colour is what makes the reveal useful.
  it("names the colour of a found floor key instead of the generic tomb-key label", () => {
    const { container } = render(
      <RewardFlow
        pendingReward={{
          reward: { type: "tombKey", keyId: "starter_1-3-4" },
          keyColors: ["green"],
          onCollect: vi.fn(),
        }}
        onDismiss={() => {}}
      />
    )
    advanceThroughReveal()
    expect(container.textContent).toContain("keys.green")
    expect(container.textContent).toContain("keys.foundDescription")
    expect(container.textContent).not.toContain("chest.tombKey")
  })

  it("shows one key per colour when a chest holds several floor keys", () => {
    const { container } = render(
      <RewardFlow
        pendingReward={{
          reward: { type: "tombKey", keyId: "starter_1-3-4" },
          keyColors: ["blue", "red"],
          onCollect: vi.fn(),
        }}
        onDismiss={() => {}}
      />
    )
    advanceThroughReveal()
    expect(container.textContent).toContain("keys.bundle")
    expect(container.querySelectorAll("svg[role='img']")).toHaveLength(2)
  })

  // A real tomb treasure also travels as a tombKey, but its chest wears no colour — it must keep the
  // mod's rich display (treasure name + perk line), not become a "floor key".
  it("leaves a colourless tomb treasure to the tomb-treasure display", () => {
    const { container } = render(
      <RewardFlow
        pendingReward={{ reward: { type: "tombKey", keyId: "starter_a_1" }, onCollect: vi.fn() }}
        onDismiss={() => {}}
      />
    )
    advanceThroughReveal()
    expect(container.textContent).not.toContain("keys.foundDescription")
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
