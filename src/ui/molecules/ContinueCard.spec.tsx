// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

import type { ContinueCardProps } from "./ContinueCard"
import { ContinueCard } from "./ContinueCard"

afterEach(cleanup)

const props: ContinueCardProps = {
  heading: "Continue",
  journeyName: "Made-up valley",
  setOffLabel: "Set off",
  allJourneysLabel: "All journeys",
  emptyText: "Nothing to continue",
}
const card = (extra: Partial<ContinueCardProps> = {}) => render(<ContinueCard {...props} {...extra} />)

describe("ContinueCard", () => {
  it("set off and all journeys call their handlers", () => {
    const onSetOff = vi.fn()
    const onAllJourneys = vi.fn()
    card({ onSetOff, onAllJourneys })
    fireEvent.click(screen.getByText("Set off"))
    fireEvent.click(screen.getByText("All journeys"))
    expect(onSetOff).toHaveBeenCalledOnce()
    expect(onAllJourneys).toHaveBeenCalledOnce()
  })

  it("without a journey there is no set off button, only the empty text", () => {
    card({ journeyName: undefined })
    expect(screen.queryByText("Set off")).toBeNull()
    expect(screen.getByText("Nothing to continue")).toBeTruthy()
  })

  it("without onAllJourneys there is no all journeys button", () => {
    card()
    expect(screen.queryByText("All journeys")).toBeNull()
  })

  it("a hint row calls onOpen; no hint, no row", () => {
    const onOpen = vi.fn()
    card({ hint: { text: "Something new", onOpen } })
    fireEvent.click(screen.getByText("Something new"))
    expect(onOpen).toHaveBeenCalledOnce()
    cleanup()
    card()
    expect(screen.queryByText("Something new")).toBeNull()
  })

  it("setOffSlot wraps the set off button", () => {
    card({ setOffSlot: button => <div data-testid="wrap">{button}</div> })
    expect(screen.getByTestId("wrap").textContent).toBe("Set off")
  })
})

describe("ContinueCard hint without onOpen", () => {
  it("is a plain note, not a button", () => {
    card({ hint: { text: "Something new" } })
    expect(screen.getByText("Something new").closest("button")).toBeNull()
  })
})
