// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

let announce: () => void = () => {}
const dropOfflineStores = vi.fn(() => Promise.resolve())
vi.mock("@/support/useOfflineStorage", () => ({
  onSaveUnreadable: (callback: () => void) => {
    announce = callback
    return () => {}
  },
  dropOfflineStores: () => dropOfflineStores(),
}))

const { SaveUnreadableGuard, RELOADS_BEFORE_RESET } = await import("./SaveUnreadableGuard")

const reloadSpy = () => {
  const reload = vi.fn()
  vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, reload })
  return reload
}

describe("an unreadable save", () => {
  it("asks the player, and playing on leaves a banner instead of a dead end", () => {
    render(<SaveUnreadableGuard />)
    expect(screen.queryByRole("alertdialog")).toBeNull()

    act(() => announce())
    expect(screen.getByRole("alertdialog")).toBeTruthy()
    expect(screen.queryByText("saveUnreadable.reset")).toBeNull()

    fireEvent.click(screen.getByText("saveUnreadable.continue"))
    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(screen.getByText("saveUnreadable.banner")).toBeTruthy()
  })

  it("offers to start over once reloading has not helped, and deletes only after a second yes", async () => {
    const reload = reloadSpy()
    render(<SaveUnreadableGuard />)
    act(() => announce())
    for (let i = 0; i < RELOADS_BEFORE_RESET; i++) fireEvent.click(screen.getByText("saveUnreadable.reload"))
    cleanup()

    render(<SaveUnreadableGuard />)
    act(() => announce())
    fireEvent.click(screen.getByText("saveUnreadable.reset"))
    fireEvent.click(screen.getByText("saveUnreadable.confirmResetNo"))
    expect(dropOfflineStores).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText("saveUnreadable.reset"))
    await act(async () => fireEvent.click(screen.getByText("saveUnreadable.confirmResetYes")))
    expect(dropOfflineStores).toHaveBeenCalled()
    expect(reload).toHaveBeenCalledTimes(RELOADS_BEFORE_RESET + 1)
  })
})
