// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SiteMapView } from "./SiteMapView"
import { corridorPiece, floorFrom, roomPiece } from "./floorFixtures.testing"
import type { OccupantOf, RoomOccupant } from "./roomOccupants"
import type { CellState } from "@/game/siteTypes"

const someone: RoomOccupant = { id: "someone", src: "someone.png", kind: "bust", translucent: true }
/** A made-up contribution: whoever stands in a room of the "talk" family. */
const talkers: OccupantOf = cell => (cell.family === "talk" ? someone : undefined)

const floorWith = (state: CellState) =>
  floorFrom(["E.T"], {
    ".": dirs => ({ ...corridorPiece(dirs), state: "completed" }),
    T: roomPiece({ family: "talk", state }),
  })

const occupants = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>("[data-occupant]")).map(el => el.dataset.occupant)

describe("somebody standing in a room", () => {
  it("is drawn in the room a contribution names, once the room is lit", () => {
    const { container } = render(<SiteMapView grid={floorWith("reachable")} occupantOf={talkers} />)
    expect(occupants(container)).toEqual(["someone"])
  })

  it("stays in the dark with the room while it is fogged", () => {
    const { container } = render(<SiteMapView grid={floorWith("fogged")} occupantOf={talkers} />)
    expect(occupants(container)).toEqual([])
  })

  it("is nobody where no contribution names anyone", () => {
    const { container } = render(<SiteMapView grid={floorWith("reachable")} />)
    expect(occupants(container)).toEqual([])
  })
})
