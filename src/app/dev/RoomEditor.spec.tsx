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

afterEach(cleanup)

describe("the room editor", () => {
  it("draws a room that parses and keeps its text in the URL", () => {
    render(<RoomEditor initialText={HALL} />)
    expect(screen.getByTestId("preview").getAttribute("data-tileset")).toBe("starter")
    const edited = HALL.replace("tier starter", "tier starter\nactivity storage")
    fireEvent.change(screen.getByRole("textbox"), { target: { value: edited } })
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
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(`${HALL}a floor brazier\n`)
  })

  it("draws with the tier picked, and says when the header disagrees", () => {
    render(<RoomEditor initialText={HALL} />)
    fireEvent.change(screen.getByLabelText("devRoomEditor.tier"), { target: { value: "master" } })
    expect(screen.getByTestId("preview").getAttribute("data-tileset")).toBe("master")
    expect(screen.getByText(/devRoomEditor.tierDisagrees/)).toBeTruthy()
  })
})
