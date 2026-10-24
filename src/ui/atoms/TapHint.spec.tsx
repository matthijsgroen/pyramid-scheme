// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { TapHint } from "./TapHint"

afterEach(cleanup)

describe("TapHint", () => {
  it("draws a hand over its target while shown", () => {
    render(
      <TapHint show>
        <button>target</button>
      </TapHint>
    )
    expect(screen.getByTestId("tap-hint").textContent).toBe("👆")
  })

  it("leaves the target alone once hidden", () => {
    render(
      <TapHint show={false}>
        <button>target</button>
      </TapHint>
    )
    expect(screen.queryByTestId("tap-hint")).toBeNull()
    expect(screen.getByRole("button", { name: "target" })).toBeTruthy()
  })

  it("lets the tap through to the target and keeps the hand out of the accessible name", () => {
    const onClick = vi.fn()
    render(
      <TapHint show>
        <button onClick={onClick}>target</button>
      </TapHint>
    )
    expect(screen.getByTestId("tap-hint").classList).toContain("pointer-events-none")
    expect(screen.getByTestId("tap-hint").getAttribute("aria-hidden")).toBe("true")
    fireEvent.click(screen.getByRole("button", { name: "target" }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("holds still under reduced motion", () => {
    render(
      <TapHint show>
        <button>target</button>
      </TapHint>
    )
    expect(screen.getByTestId("tap-hint").querySelector(".animate-tap")?.classList).toContain(
      "motion-reduce:animate-none"
    )
  })
})
