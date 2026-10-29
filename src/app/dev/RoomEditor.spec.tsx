// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { RoomEditor } from "./RoomEditor"
import { decodeRoomHash } from "./roomEditorUrl"

vi.mock("@/app/SiteMap/PrefabRoomPreview", () => ({
  PrefabRoomPreview: ({ tileset }: { tileset?: string }) => <div data-testid="preview" data-tileset={tileset} />,
}))

// A made-up hall: a pillar between two stops of floor and a door south.
const HALL = `room hall
tier starter
layout
# # # # # # #
# . . . . . #
# . p . . . #
# . . . s . #
# # # d # # #
p floor pillar
s stop
`

// A made-up catalogued room in another tier.
const NOOK = vi.hoisted(() => "room nook\ntier junior\nlayout\n# # # # #\n# . s . #\n# # d # #\ns stop\n")

// A catalogued room whose text has no room line: it is named after its file.
const BARE = vi.hoisted(() => "tier starter\nlayout\n# # # # #\n# . s . #\n# # d # #\ns stop\n")

vi.mock("./roomEditorCatalogue", () => ({ ROOM_CATALOGUE: { nook: NOOK, bare: BARE } }))

const textOf = () => (screen.getByLabelText("devRoomEditor.notation") as HTMLTextAreaElement).value
const cellAt = (r: number, c: number) => document.querySelector(`[data-cell="${r},${c}"]`) as HTMLElement

afterEach(cleanup)

describe("the room editor", () => {
  it("draws a room that parses and keeps its text in the URL", () => {
    render(<RoomEditor initialText={HALL} />)
    expect(screen.getByTestId("preview").getAttribute("data-tileset")).toBe("starter")
    const edited = HALL.replace("tier starter", "tier starter\nactivity storage")
    fireEvent.change(screen.getByLabelText("devRoomEditor.notation"), { target: { value: edited } })
    expect(decodeRoomHash(window.location.hash)).toBe(edited)
  })

  it("names the line of a kind that does not exist", () => {
    render(<RoomEditor initialText={HALL.replace("pillar", "unicorn")} />)
    const checks = screen.getByRole("region", { name: /checks/i })
    expect(within(checks).getByText(/line 9: unknown kind "unicorn"/)).toBeTruthy()
    expect(screen.queryByTestId("preview")).toBeNull()
  })

  it("adds a legend line for the next free letter when a palette entry is clicked", () => {
    render(<RoomEditor initialText={HALL} />)
    fireEvent.click(within(screen.getByRole("region", { name: /palette/i })).getByRole("button", { name: /^brazier/ }))
    expect((screen.getByLabelText("devRoomEditor.notation") as HTMLTextAreaElement).value).toBe(
      `${HALL}a floor brazier\n`
    )
  })

  it("draws with the tier picked, and says when the header disagrees", () => {
    render(<RoomEditor initialText={HALL} />)
    fireEvent.change(screen.getByLabelText("devRoomEditor.tier"), { target: { value: "master" } })
    expect(screen.getByTestId("preview").getAttribute("data-tileset")).toBe("master")
    expect(screen.getByText(/devRoomEditor.tierDisagrees/)).toBeTruthy()
  })
  it("drops a palette kind dragged onto a cell into the drawing and the legend", () => {
    render(<RoomEditor initialText={HALL} />)
    const brazier = within(screen.getByRole("region", { name: /palette/i })).getByRole("button", { name: /^brazier/ })
    const carried = new Map<string, string>()
    const dataTransfer = {
      setData: (type: string, value: string) => carried.set(type, value),
      getData: (type: string) => carried.get(type) ?? "",
    }
    fireEvent.dragStart(brazier, { dataTransfer })
    fireEvent.drop(cellAt(1, 1), { dataTransfer })
    const text = textOf()
    expect(text).toContain("\n# a . . . . #\n")
    expect(text).toContain("\na floor brazier\n")
  })

  it("paints with a tool and undoes one edit at a time", () => {
    render(<RoomEditor initialText={HALL} />)
    fireEvent.click(screen.getByRole("button", { name: "devRoomEditor.tool.wall" }))
    fireEvent.pointerDown(cellAt(1, 1))
    const painted = textOf()
    expect(painted).toContain("\n# # . . . . #\n")
    fireEvent.pointerDown(cellAt(1, 2))
    fireEvent.click(screen.getByRole("button", { name: "devRoomEditor.undo" }))
    expect(textOf()).toBe(painted)
    fireEvent.click(screen.getByRole("button", { name: "devRoomEditor.undo" }))
    expect(textOf()).toBe(HALL)
  })

  it("undoes one drag over several cells as one step", () => {
    render(<RoomEditor initialText={HALL} />)
    fireEvent.click(screen.getByRole("button", { name: "devRoomEditor.tool.wall" }))
    fireEvent.pointerDown(cellAt(1, 1))
    fireEvent.pointerEnter(cellAt(1, 2))
    fireEvent.pointerUp(window)
    expect(textOf()).toContain("\n# # # . . . #\n")
    fireEvent.click(screen.getByRole("button", { name: "devRoomEditor.undo" }))
    expect(textOf()).toBe(HALL)
  })

  it("opens a catalogued room in its own tier", () => {
    render(<RoomEditor initialText={HALL} />)
    fireEvent.change(screen.getByLabelText("devRoomEditor.tier"), { target: { value: "master" } })
    fireEvent.change(screen.getByLabelText("devRoomEditor.catalogue"), { target: { value: "nook" } })
    expect(textOf()).toBe(NOOK)
    expect((screen.getByLabelText("devRoomEditor.tier") as HTMLSelectElement).value).toBe("junior")
  })

  it("keeps a catalogued room without a room line unnamed when drawn on", () => {
    render(<RoomEditor initialText={HALL} />)
    fireEvent.change(screen.getByLabelText("devRoomEditor.catalogue"), { target: { value: "bare" } })
    fireEvent.click(screen.getByRole("button", { name: "devRoomEditor.tool.wall" }))
    fireEvent.pointerDown(cellAt(1, 1))
    expect(textOf()).toContain("\n# # s . #\n")
    expect(textOf()).not.toMatch(/^room /m)
  })

  it("says why the drawing refuses an edit", () => {
    render(<RoomEditor initialText={HALL} />)
    fireEvent.click(screen.getByRole("button", { name: "devRoomEditor.tool.floor" }))
    fireEvent.pointerDown(cellAt(0, 1))
    expect(screen.getByRole("alert").textContent).toContain("devRoomEditor.refused.floorOnRing")
    expect(textOf()).toBe(HALL)
  })
})
