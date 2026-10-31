// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

import { CampHud } from "./CampHud"

afterEach(cleanup)

const hud = (extra: Partial<Parameters<typeof CampHud>[0]> = {}) =>
  render(<CampHud title="Camp" onTitleTap={() => {}} settingsLabel="Settings" onSettings={() => {}} {...extra} />)

describe("CampHud", () => {
  it("title taps call onTitleTap", () => {
    const onTitleTap = vi.fn()
    hud({ onTitleTap })
    fireEvent.click(screen.getByText("Camp"))
    expect(onTitleTap).toHaveBeenCalledOnce()
  })

  it("the gear carries its label and calls onSettings", () => {
    const onSettings = vi.fn()
    hud({ onSettings })
    fireEvent.click(screen.getByLabelText("Settings"))
    expect(onSettings).toHaveBeenCalledOnce()
  })

  it("shows the taps left only for the last three", () => {
    hud({ tapsLeft: 2 })
    expect(screen.getByText("2…")).toBeTruthy()
    cleanup()
    hud({ tapsLeft: 5 })
    expect(screen.queryByText("5…")).toBeNull()
  })
})
