// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { arrows, key, pad } from "@/ui/atoms/glyphs"
import { ControlsBlock, type ControlStep } from "./ControlsBlock"

const steps: ControlStep[] = [
  { keys: [arrows], pad: [pad("dpad")], label: "move" },
  { keys: [key("Enter")], pad: [pad("a")], label: "take" },
  { keys: [key("1–6")], label: "type a number" },
  { pad: [pad("lb"), pad("rb")], label: "choose a number" },
]

const labels = () => screen.getAllByRole("listitem").map(item => item.textContent)

describe(ControlsBlock, () => {
  it("shows nothing on touch", () => {
    const { container } = render(<ControlsBlock heading="Controls" input="touch" brand="xbox" steps={steps} />)
    expect(container.innerHTML).toBe("")
  })

  it("shows the keys, one step a line, leaving out the pad-only step", () => {
    render(<ControlsBlock heading="Controls" input="keys" brand="xbox" steps={steps} />)
    expect(labels()).toEqual(["←↑↓→move", "Entertake", "1–6type a number"])
  })

  it("shows the pad buttons in the pad's brand, leaving out the keys-only step", () => {
    render(<ControlsBlock heading="Controls" input="pad" brand="playstation" steps={steps} />)
    expect(labels()).toEqual(["move", "✕take", "L1/R1choose a number"])
    expect(screen.getByRole("img", { name: "Cross" })).toBeTruthy()
  })

  it("shows the Xbox look for an Xbox pad", () => {
    render(<ControlsBlock heading="Controls" input="pad" brand="xbox" steps={steps} />)
    expect(screen.getByRole("img", { name: "A" })).toBeTruthy()
  })

  it("shows nothing, not even the heading, when no step has a glyph for this input", () => {
    const { container } = render(
      <ControlsBlock heading="Controls" input="pad" brand="xbox" steps={[{ keys: [key("Z")], label: "undo" }]} />
    )
    expect(container.innerHTML).toBe("")
  })
})
