// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react"
import { useState } from "react"
import { beforeEach, describe, expect, it } from "vitest"
import { clearGameData, latestGameValue } from "@/support/useGameStorage"
import { clearCollectionSections, registerCollectionSection, type CollectionTab } from "./collectionSectionRegistry"
import { useCollectionNews } from "./useCollectionNews"

const tabs: Record<string, CollectionTab> = {}
const register = (id: string, order: number) =>
  registerCollectionSection({ id, order, Component: () => null, useTab: () => tabs[id] })
const setTab = (id: string, tab: Partial<CollectionTab>) =>
  (tabs[id] = { label: id, shown: true, ids: [], loaded: true, ...tab })

beforeEach(async () => {
  await clearGameData()
  clearCollectionSections()
  for (const key of Object.keys(tabs)) delete tabs[key]
})

// A rerender picks up the made-up tab values changed by the test.
const render = () =>
  renderHook(() => {
    const [, setN] = useState(0)
    return { news: useCollectionNews(), bump: () => setN(n => n + 1) }
  })

describe("useCollectionNews", () => {
  it("seeds a loaded section silently, then counts what arrives", async () => {
    register("shells", 1)
    setTab("shells", { ids: ["a", "b"] })
    const { result } = render()
    await waitFor(() => expect(latestGameValue("collectionSeen")).toEqual({ version: 1, seen: { shells: ["a", "b"] } }))
    expect(result.current.news.total).toBe(0)
    setTab("shells", { ids: ["a", "b", "c"] })
    act(() => result.current.bump())
    expect(result.current.news.tabs[0].newIds).toEqual(["c"])
    expect(result.current.news.total).toBe(1)
  })

  it("never seeds a tab that is not loaded", async () => {
    register("shells", 1)
    register("stones", 2)
    setTab("shells", { ids: ["a"] })
    setTab("stones", { ids: [], loaded: false })
    const { result } = render()
    await waitFor(() => expect(latestGameValue("collectionSeen")).toEqual({ version: 1, seen: { shells: ["a"] } }))
    await act(async () => new Promise(resolve => setTimeout(resolve, 20)))
    expect(latestGameValue("collectionSeen")).toEqual({ version: 1, seen: { shells: ["a"] } })
    setTab("stones", { ids: ["x"], loaded: true })
    act(() => result.current.bump())
    await waitFor(() =>
      expect(latestGameValue("collectionSeen")).toEqual({ version: 1, seen: { shells: ["a"], stones: ["x"] } })
    )
    expect(result.current.news.total).toBe(0)
  })

  it("marks one tab seen and leaves the other tab's news", async () => {
    register("shells", 1)
    register("stones", 2)
    setTab("shells", { ids: ["a"] })
    setTab("stones", { ids: ["x"] })
    const { result } = render()
    await waitFor(() => expect(result.current.news.tabs.length).toBe(2))
    await waitFor(() =>
      expect(Object.keys((latestGameValue("collectionSeen") as { seen: object })?.seen ?? {}).length).toBe(2)
    )
    setTab("shells", { ids: ["a", "b"] })
    setTab("stones", { ids: ["x", "y"] })
    act(() => result.current.bump())
    expect(result.current.news.total).toBe(2)
    await act(async () => result.current.news.markTabSeen("shells"))
    expect(result.current.news.tabs.map(tab => tab.newIds)).toEqual([[], ["y"]])
  })

  it("counts nothing for a tab that is not shown", async () => {
    register("shells", 1)
    setTab("shells", { ids: ["a"], shown: false })
    const { result } = render()
    await waitFor(() => expect(latestGameValue("collectionSeen")).toEqual({ version: 1, seen: { shells: ["a"] } }))
    setTab("shells", { ids: ["a", "b"], shown: false })
    act(() => result.current.bump())
    expect(result.current.news.total).toBe(0)
  })

  it("has no tabs and no news with no section registered", () => {
    const { result } = render()
    expect(result.current.news.tabs).toEqual([])
    expect(result.current.news.total).toBe(0)
  })
})
