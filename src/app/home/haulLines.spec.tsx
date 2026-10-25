// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import type { TreasureReward } from "@/game/siteTypes"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) => (key === "home.haul.times" ? `×${opts?.count}` : key),
  }),
}))

const load = async () => {
  vi.resetModules()
  const lines = await import("./haulLines")
  const displays = await import("@/app/SiteMap/rewardDisplayRegistry")
  return { ...lines, registerRewardDisplays: displays.registerRewardDisplays }
}

const r = (type: string, id: string): TreasureReward => ({ type, id })

describe("useHaulLines", () => {
  beforeEach(() => vi.resetModules())

  it("gives no lines for an empty haul", async () => {
    const { useHaulLines } = await load()
    expect(renderHook(() => useHaulLines([])).result.current).toEqual([])
  })

  it("hands a type's rewards in found order to its summariser", async () => {
    const { useHaulLines, registerHaulLines } = await load()
    const seen = vi.fn()
    registerHaulLines(() => ({
      a: rewards => {
        seen(rewards)
        return [{ key: "sum", visual: null, title: "summary" }]
      },
    }))
    const haul = [r("a", "1"), r("b", "9"), r("a", "2")]
    const { result } = renderHook(() => useHaulLines(haul))
    expect(seen).toHaveBeenCalledWith([r("a", "1"), r("a", "2")])
    expect(result.current.map(l => l.title)).toEqual(["summary"])
  })

  it("makes one default line per distinct reward, merging equal ones with a count", async () => {
    const { useHaulLines, registerRewardDisplays } = await load()
    registerRewardDisplays(() => ({
      b: reward => ({ itemName: `name ${String(reward.id)}`, ItemVisual: null }),
    }))
    const haul = [r("b", "1"), r("b", "2"), r("b", "1")]
    const { result } = renderHook(() => useHaulLines(haul))
    expect(result.current.map(l => l.title)).toEqual(["name 1 ×2", "name 2"])
  })

  it("leaves out a type with neither summariser nor display", async () => {
    const { useHaulLines } = await load()
    expect(renderHook(() => useHaulLines([r("z", "1")])).result.current).toEqual([])
  })

  it("moves a new line to the top", async () => {
    const { useHaulLines, registerHaulLines } = await load()
    registerHaulLines(() => ({
      a: () => [{ key: "old", visual: null, title: "old" }],
      b: () => [{ key: "new", visual: null, title: "new", isNew: true }],
    }))
    const haul = [r("a", "1"), r("b", "1")]
    const { result } = renderHook(() => useHaulLines(haul))
    expect(result.current.map(l => l.key)).toEqual(["new", "old"])
  })
})
