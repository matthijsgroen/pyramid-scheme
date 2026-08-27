import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { EncounterModal } from "./EncounterModal"

afterEach(cleanup)

const frame = () => {
  const { container } = render(
    <EncounterModal>
      <p>an encounter</p>
    </EncounterModal>
  )
  return container.firstElementChild as HTMLElement
}

describe("EncounterModal", () => {
  // Asserted on the padding the frame asks for rather than on where it lands, because neither jsdom nor a
  // desktop browser has a safe area to land in: the insets are zero everywhere this test can run, so a
  // frame that had dropped them would measure exactly the same. Storybook cannot see it for the same
  // reason, which is what earns this a test at all.
  it.each([
    ["top", "pt-"],
    ["right", "pr-"],
    ["bottom", "pb-"],
    ["left", "pl-"],
  ])("keeps its content out of the %s safe area", (side, prefix) => {
    // The frame is `fixed inset-0` on a `viewport-fit=cover` page, so it reaches under the status bar and
    // the home indicator; the row of controls at the top of a puzzle ended up beneath the clock.
    expect(frame().className).toContain(`${prefix}[calc(env(safe-area-inset-${side},_0)`)
  })

  it("adds the safe area to its own gap rather than replacing it", () => {
    // The insets are zero on most devices, and the frame still wants its gap there.
    expect(frame().className).toContain("_+_var(--spacing)_*_2)]")
  })
})
