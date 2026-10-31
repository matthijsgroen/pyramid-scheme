// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { clearGameData, writeGameData } from "@/support/useGameStorage"
import type { CampStepTable } from "@/mods/camp/game/campSteps"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { found?: number; total?: number }) =>
      options?.found === undefined ? key : `${key}:${options.found}/${options.total}`,
  }),
}))

const { CampCollectionSection } = await import("./CampCollectionSection")

const table: CampStepTable = [
  { id: "hut", spot: "sleeping", tier: "junior", source: "structure", parts: ["poles", "cloth"] },
  { id: "well", spot: "water", tier: "junior", source: "structure", parts: ["stones", "rope", "bucket"] },
  { id: "pit", spot: "fire", tier: "junior", source: "structure", parts: ["stones"] },
]

const section = () => (
  <CampCollectionSection selectedItem={null} onSelect={() => {}} isNew={() => false} newLabel="NEW" table={table} />
)

const withSave = async (parts: Record<string, string[]>) =>
  writeGameData({ "pyramid-scheme-mod-camp": { version: 1, finds: [], parts, grown: [] } })

beforeEach(async () => {
  await clearGameData()
})
afterEach(cleanup)

describe("CampCollectionSection", () => {
  it("shows no heading and no rows for an empty save", async () => {
    await act(async () => void render(section()))
    expect(screen.queryByText("collection.title")).toBeNull()
    expect(screen.queryAllByRole("button")).toHaveLength(0)
  })

  it("shows one row per started structure and none for one without parts", async () => {
    await withSave({ hut: ["poles"], well: ["rope"], pit: [] })
    await act(async () => void render(section()))
    expect(screen.getAllByRole("button")).toHaveLength(2)
    expect(screen.getByText("structures.hut")).toBeTruthy()
    expect(screen.queryByText("structures.pit")).toBeNull()
  })

  it("opens one row at a time, naming found parts and hiding the rest", async () => {
    await withSave({ hut: ["poles"], well: ["rope"] })
    await act(async () => void render(section()))
    expect(screen.queryByText("parts.hut.poles")).toBeNull()
    const [hut, well] = screen.getAllByRole("button")
    fireEvent.click(hut)
    expect(screen.getByText("parts.hut.poles")).toBeTruthy()
    expect(screen.getByText("collection.unknownPart")).toBeTruthy()
    fireEvent.click(well)
    expect(screen.queryByText("parts.hut.poles")).toBeNull()
    expect(screen.getByText("parts.well.rope")).toBeTruthy()
  })
})

describe("CampCollectionSection new marks", () => {
  it("badges the row of a structure with a new part, and the part once the row is open", async () => {
    await withSave({ hut: ["poles", "cloth"], well: ["rope"] })
    render(
      <CampCollectionSection
        selectedItem={null}
        onSelect={() => {}}
        isNew={id => id === "hut/poles"}
        newLabel="NEW"
        table={table}
      />
    )
    await act(async () => void 0)
    expect(screen.getAllByText("NEW")).toHaveLength(1)
    fireEvent.click(screen.getAllByRole("button")[0])
    expect(screen.getAllByText("NEW")).toHaveLength(2)
  })

  it("shows no badge when nothing is new", async () => {
    await withSave({ hut: ["poles"] })
    await act(async () => void render(section()))
    expect(screen.queryByText("NEW")).toBeNull()
  })
})
