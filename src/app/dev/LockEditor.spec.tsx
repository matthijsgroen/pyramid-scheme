// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { LockEditor } from "./LockEditor"
import { decodeLockHash } from "./lockEditorUrl"
import { lockReport } from "./lockReport"

const MADE_UP = "in -[L]- out\nL toggle @in\nin ?\nout ?\n"
const CUT_OFF = "in -[K]- out\nK activator @out\nin ?\nout ?\n"

describe("the lock checks", () => {
  it("passes a made-up solvable lock and draws it", () => {
    const report = lockReport(MADE_UP)
    expect(report.sound).toBe(true)
    expect(report.checks).toContain("✓ compiles")
    expect(report.drawing).toContain("in")
  })

  it("names the region a made-up cut-off lock never reaches", () => {
    const report = lockReport(CUT_OFF)
    expect(report.sound).toBe(false)
    expect(report.checks).toContain("✗ never reached: out")
  })

  it("says why a text that does not parse fails, and draws nothing", () => {
    const report = lockReport("in -- \nwhat is this")
    expect(report.sound).toBe(false)
    expect(report.checks[0]).toMatch(/^✗ line \d+:/)
    expect(report.drawing).toBe("")
  })
})

afterEach(cleanup)

describe("the editor", () => {
  it("shows the checks under the text and follows an edit, keeping the text in the URL", async () => {
    render(<LockEditor initialText={MADE_UP} />)
    const checks = screen.getByRole("region", { name: /checks/i })
    expect(within(checks).getByText("✓ compiles")).toBeTruthy()

    const box = screen.getByRole("textbox")

    fireEvent.change(box, { target: { value: CUT_OFF } })
    expect(await within(checks).findByText("✗ never reached: out")).toBeTruthy()
    expect(decodeLockHash(window.location.hash)).toBe(CUT_OFF)
  })

  it("asks the phone for no autocorrect, capitals or spellcheck", () => {
    render(<LockEditor initialText={MADE_UP} />)
    const box = screen.getByRole("textbox")
    expect(box.getAttribute("autocorrect")).toBe("off")
    expect(box.getAttribute("autocapitalize")).toBe("off")
    expect(box.getAttribute("spellcheck")).toBe("false")
  })
})
