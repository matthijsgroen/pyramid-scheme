// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { clearGameData, writeGameData } from "@/support/useGameStorage"
import type { CampStepTable } from "@/mods/camp/game/campSteps"
import type { CampCatalogue, CampStep } from "@/ui/atoms/campScene/campTypes"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string | string[], options?: { found?: number; total?: number; name?: string }) =>
      options?.name !== undefined
        ? `${String(key)}:${options.name}`
        : options?.found === undefined
          ? String(key)
          : `${String(key)}:${options.found}/${options.total}`,
  }),
}))

const { CampCollectionSection } = await import("./CampCollectionSection")

const table: CampStepTable = [
  { id: "hut", spot: "fire", tier: "junior", source: "structure", parts: ["poles", "cloth"] },
  { id: "well", spot: "water", tier: "junior", source: "structure", parts: ["stones", "rope", "bucket"] },
  { id: "pit", spot: "fire", tier: "junior", source: "structure", parts: ["stones"] },
]

// The pit is the fire spot's base; the hut stands on it.
const layer = (id: string, layer?: CampStep["layer"]): CampStep => ({
  chapter: "junior",
  pieces: [{ id, dx: 0, dy: 0, width: 1, height: 1 }],
  ...(layer && { layer }),
})
const catalogue: CampCatalogue = {
  spots: [{ id: "fire", x: 0, y: 0, frame: 1, footprint: 1, steps: [layer("pit"), layer("hut", { on: "pit" })] }],
  fixed: [],
}

const section = () => (
  <CampCollectionSection
    selectedItem={null}
    onSelect={() => {}}
    isNew={() => false}
    newLabel="NEW"
    table={table}
    catalogue={catalogue}
  />
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

  it("says what a built structure waits for while the one it stands on is not built", async () => {
    await withSave({ hut: ["poles", "cloth"], pit: [] })
    await act(async () => void render(section()))
    expect(screen.getByText("collection.waitsFor:structures.pit,finds.pit")).toBeTruthy()
  })

  it("says built once the one it stands on is built too", async () => {
    await withSave({ hut: ["poles", "cloth"], pit: ["stones"] })
    await act(async () => void render(section()))
    expect(screen.getAllByText("collection.built")).toHaveLength(2)
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
