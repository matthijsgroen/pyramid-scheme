// @vitest-environment jsdom
import { render, fireEvent, screen, waitFor, cleanup, act } from "@testing-library/react"
import { useCollectionSeen } from "./useCollectionSeen"
import type { FC } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearGameData, latestGameValue, writeGameData } from "@/support/useGameStorage"
import {
  clearCollectionSections,
  registerCollectionSection,
  type CollectionItem,
  type CollectionSectionProps,
  type CollectionTab,
} from "./collectionSectionRegistry"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, vars?: { label: string; count: number }) =>
      key === "collection.tabNew" && vars ? `${vars.label} · ${vars.count} nieuw` : key,
  }),
}))

// An empty inventory: everything this player has collected lives elsewhere — a finished hieroglyph
// is fragments, a tomb treasure is a held key.
vi.mock("@/app/Inventory/useInventory", () => ({
  useInventory: () => ({ inventory: {}, addItem: () => {} }),
}))

const itemFor = (id: string): CollectionItem => ({
  id,
  symbol: "𓅱",
  name: `Item ${id}`,
  description: `About ${id}.`,
})

const tabs: Record<string, CollectionTab> = {}
const setTab = (id: string, tab: Partial<CollectionTab>) =>
  (tabs[id] = { label: `Tab ${id}`, shown: true, ids: [], loaded: true, ...tab })
const register = (id: string, order: number) =>
  registerCollectionSection({
    id,
    order,
    useTab: () => tabs[id],
    Component: ({ onSelect, isNew, newLabel }: CollectionSectionProps) => (
      <div>
        {tabs[id].ids.map(itemId => (
          <button key={itemId} onClick={() => onSelect(itemFor(itemId))}>
            {itemFor(itemId).name}
            {isNew(itemId) && <span>{newLabel}</span>}
          </button>
        ))}
      </div>
    ),
  })

const { CollectionPage } = await import("./Collection")

const seenSave = (seen: Record<string, string[]>) => writeGameData({ collectionSeen: { version: 1, seen } })
const stored = () => (latestGameValue("collectionSeen") as { seen: Record<string, string[]> }).seen

beforeEach(async () => {
  await clearGameData()
  clearCollectionSections()
  for (const key of Object.keys(tabs)) delete tabs[key]
})
afterEach(cleanup)

describe(CollectionPage, () => {
  it("shows a tapped item's details even when the player holds no inventory items", async () => {
    register("a", 1)
    setTab("a", { ids: ["a1"] })
    await seenSave({ a: ["a1"] })
    render(<CollectionPage />)
    expect(screen.queryByText("collection.clickForDetails")).not.toBeNull()

    fireEvent.click(await screen.findByText("Item a1"))

    expect(screen.queryByText("About a1.")).not.toBeNull()
  })

  it("shows the empty line when no section is a shown tab", () => {
    register("a", 1)
    setTab("a", { shown: false, ids: ["a1"] })
    render(<CollectionPage />)

    expect(screen.queryByText("collection.empty")).not.toBeNull()
    expect(screen.queryByRole("tablist")).toBeNull()
  })

  it("opens the tab with news first, labelled with its count, its new item badged", async () => {
    register("a", 1)
    register("b", 2)
    setTab("a", { ids: ["a1"] })
    setTab("b", { ids: ["b1", "b2"] })
    await seenSave({ a: ["a1"], b: ["b1"] })
    render(<CollectionPage />)

    const tab = await screen.findByRole("tab", { name: "Tab b · 1 nieuw" })
    expect(tab.getAttribute("aria-selected")).toBe("true")
    expect(screen.getByRole("tab", { name: "Tab a" }).getAttribute("aria-selected")).toBe("false")
    expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(tab.id)
    expect(screen.getByText("Item b2").textContent).toContain("collection.newLabel")
    expect(screen.getByText("Item b1").textContent).not.toContain("collection.newLabel")
    expect(screen.queryByText("Item a1")).toBeNull()
  })

  it("marks the tab it leaves seen, and its NIEUW is gone when coming back", async () => {
    register("a", 1)
    register("b", 2)
    setTab("a", { ids: ["a1", "a2"] })
    setTab("b", { ids: ["b1", "b2"] })
    await seenSave({ a: ["a1"], b: ["b1"] })
    render(<CollectionPage />)
    await screen.findByRole("tab", { name: "Tab a · 1 nieuw" })

    fireEvent.click(screen.getByRole("tab", { name: "Tab b · 1 nieuw" }))
    await waitFor(() => expect(stored().a).toEqual(["a1", "a2"]))
    expect(stored().b).toEqual(["b1"])

    fireEvent.click(screen.getByRole("tab", { name: "Tab a" }))
    expect(screen.getByText("Item a2").textContent).not.toContain("collection.newLabel")
  })

  it("keeps the NIEUW while the tab stays open", async () => {
    register("a", 1)
    setTab("a", { ids: ["a1", "a2"] })
    await seenSave({ a: ["a1"] })
    render(<CollectionPage />)

    // Something else marks the open tab's items seen while the player looks at it.
    const Marker: FC = () => {
      const { markSeen } = useCollectionSeen()
      return <button onClick={() => void markSeen("a", ["a1", "a2"])}>mark elsewhere</button>
    }
    render(<Marker />)
    expect((await screen.findByText("Item a2")).textContent).toContain("collection.newLabel")

    fireEvent.click(screen.getByText("mark elsewhere"))
    await waitFor(() => expect(stored().a).toEqual(["a1", "a2"]))

    expect(screen.getByText("Item a2").textContent).toContain("collection.newLabel")
  })

  it("marks the open tab seen when it unmounts, and not the tab it never opened", async () => {
    register("a", 1)
    register("b", 2)
    setTab("a", { ids: ["a1", "a2"] })
    setTab("b", { ids: ["b1", "b2"] })
    await seenSave({ a: ["a1"], b: ["b1"] })
    const { unmount } = render(<CollectionPage />)
    await screen.findByRole("tab", { name: "Tab a · 1 nieuw" })

    unmount()

    await waitFor(() => expect(stored().a).toEqual(["a1", "a2"]))
    expect(stored().b).toEqual(["b1"])
  })

  it("marks nothing for a tab that is not loaded", async () => {
    register("a", 1)
    setTab("a", { ids: ["a1", "a2"], loaded: false })
    await seenSave({ a: ["a1"] })
    const { unmount } = render(<CollectionPage />)
    await screen.findByRole("tab")

    unmount()
    // The unmount's mark is queued as a microtask and its write chains on promises: draining them
    // counts steps, not time.
    await act(async () => {
      for (let step = 0; step < 20; step++) await Promise.resolve()
    })

    expect(stored()).toEqual({ a: ["a1"] })
  })
})
