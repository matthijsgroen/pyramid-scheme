// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

import { CampPopup } from "./CampPopup"

afterEach(cleanup)

describe("CampPopup", () => {
  it("is a dialog labelled by its title", () => {
    render(
      <CampPopup title="Journeys" closeLabel="Close" onClose={() => {}}>
        body
      </CampPopup>
    )
    expect(screen.getByRole("dialog", { name: "Journeys" })).toBeTruthy()
  })

  it("the close button and Escape call onClose", () => {
    const onClose = vi.fn()
    render(<CampPopup title="Journeys" closeLabel="Close" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText("Close"))
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it("moves focus into the dialog so Escape reaches it", () => {
    render(<CampPopup title="Journeys" closeLabel="Close" onClose={() => {}} />)
    expect(document.activeElement).toBe(screen.getByRole("dialog"))
  })
})

describe("CampPopup dialog behaviour", () => {
  it("ignores an Escape pressed inside a dialog nested in it", () => {
    const onClose = vi.fn()
    render(
      <CampPopup title="Journeys" closeLabel="Close" onClose={onClose}>
        <div role="dialog" aria-label="Confirm">
          <button>Yes</button>
        </div>
      </CampPopup>
    )
    fireEvent.keyDown(screen.getByText("Yes"), { key: "Escape" })
    expect(onClose).not.toHaveBeenCalled()
  })

  it("gives focus back to what opened it", () => {
    const opener = document.createElement("button")
    document.body.append(opener)
    opener.focus()
    const { unmount } = render(<CampPopup title="Journeys" closeLabel="Close" onClose={() => {}} />)
    expect(document.activeElement).toBe(screen.getByRole("dialog"))
    unmount()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it("keeps Tab inside the dialog", () => {
    render(<CampPopup title="Journeys" closeLabel="Close" onClose={() => {}} />)
    const close = screen.getByLabelText("Close")
    close.focus()
    fireEvent.keyDown(close, { key: "Tab" })
    expect(document.activeElement).toBe(close)
  })
})
