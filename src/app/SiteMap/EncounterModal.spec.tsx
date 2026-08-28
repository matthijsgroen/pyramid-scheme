import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { EncounterModal } from "./EncounterModal"

afterEach(cleanup)

describe("EncounterModal", () => {
  it("keeps its content clear of the screen edge, safe area and all", () => {
    // Asserted as the class rather than as a measurement, because neither jsdom nor a desktop browser has a
    // safe area to land in: the insets are zero everywhere this test can run, so a frame that had dropped
    // them would measure exactly the same. Storybook cannot see it for the same reason, which is what earns
    // this a test at all. What `p-safe-edge` resolves to is stated once, in index.css.
    const { container } = render(
      <EncounterModal>
        <p>an encounter</p>
      </EncounterModal>
    )
    expect((container.firstElementChild as HTMLElement).className).toContain("p-safe-edge")
  })
})
