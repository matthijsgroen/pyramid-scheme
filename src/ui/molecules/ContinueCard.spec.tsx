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
  emptyText: "Nothing to continue",
}
const card = (extra: Partial<ContinueCardProps> = {}) => render(<ContinueCard {...props} {...extra} />)

describe("ContinueCard", () => {
  it("set off calls its handler", () => {
    const onSetOff = vi.fn()
    card({ onSetOff })
    fireEvent.click(screen.getByText("Set off"))
    expect(onSetOff).toHaveBeenCalledOnce()
  })

  it("without a journey there is no set off button, only the empty text", () => {
    card({ journeyName: undefined })
    expect(screen.queryByText("Set off")).toBeNull()
    expect(screen.getByText("Nothing to continue")).toBeTruthy()
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
