// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

import type { ComingHomeScreenProps } from "./ComingHomeScreen"
import { ComingHomeScreen } from "./ComingHomeScreen"

afterEach(cleanup)

const props: ComingHomeScreenProps = {
  title: "Back",
  fire: <span>fire</span>,
  haulTitle: "Your haul",
  lines: [
    { key: "a", visual: <span />, title: "Made-up jug", note: "New", badge: "NEW" },
    { key: "b", visual: <span />, title: "3 pieces" },
  ],
  buttonLabel: "Unpack",
  onDone: () => {},
}
const screenOf = (extra: Partial<ComingHomeScreenProps> = {}) => render(<ComingHomeScreen {...props} {...extra} />)

describe("ComingHomeScreen", () => {
  it("renders the lines with their badge", () => {
    screenOf()
    expect(screen.getByText("Your haul")).toBeTruthy()
    expect(screen.getByText("Made-up jug")).toBeTruthy()
    expect(screen.getByText("3 pieces")).toBeTruthy()
    expect(screen.getByText("NEW")).toBeTruthy()
  })

  it("empty lines leave out the haul heading", () => {
    screenOf({ lines: [] })
    expect(screen.queryByText("Your haul")).toBeNull()
  })

  it("the button calls onDone", () => {
    const onDone = vi.fn()
    screenOf({ onDone })
    fireEvent.click(screen.getByText("Unpack"))
    expect(onDone).toHaveBeenCalledOnce()
  })
})
