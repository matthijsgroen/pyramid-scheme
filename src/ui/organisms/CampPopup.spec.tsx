// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

import { listenForPageLayers } from "@/app/input/pageLayers"
import { ConfirmModal } from "@/ui/atoms/ConfirmModal"
import { CampPopup } from "./CampPopup"

afterEach(cleanup)

// Dialogs are input layers: Escape reaches them through the app's input stack.
let stopListening = () => {}
beforeEach(() => {
  stopListening = listenForPageLayers()
})
afterEach(() => stopListening())

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
  it("leaves Escape to a confirmation open inside it, which is the dialog on top", () => {
    const onClose = vi.fn()
    const onCancel = vi.fn()
    render(
      <CampPopup title="Journeys" closeLabel="Close" onClose={onClose}>
        <ConfirmModal
          isOpen
          title="Sure?"
          message="Made-up question"
          confirmText="Yes"
          cancelText="No"
          onConfirm={() => {}}
          onCancel={onCancel}
        />
      </CampPopup>
    )
    fireEvent.keyDown(screen.getByText("Yes"), { key: "Escape" })
    expect(onCancel).toHaveBeenCalledOnce()
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
