// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { CrashBoundary } from "./CrashBoundary"

const Explodes = () => {
  throw new Error("the floor gave way")
}

describe("the crash boundary", () => {
  it("says what broke, so a phone with no console still reports the bug", () => {
    // React logs the caught error itself; the test is about what the player is shown.
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      render(
        <CrashBoundary>
          <Explodes />
        </CrashBoundary>
      )
      expect(screen.getByText(/the floor gave way/)).toBeTruthy()
    } finally {
      quiet.mockRestore()
    }
  })

  it("stays out of the way while nothing is wrong", () => {
    render(
      <CrashBoundary>
        <p>the map</p>
      </CrashBoundary>
    )
    expect(screen.getByText("the map")).toBeTruthy()
  })
})
