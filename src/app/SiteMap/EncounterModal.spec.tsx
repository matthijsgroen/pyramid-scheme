// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { EncounterModal } from "./EncounterModal"
import { imageMap } from "@/ui/atoms/tombImageMap"

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

describe("the wall an encounter stands against", () => {
  const wallOf = (container: HTMLElement) => (container.firstElementChild!.firstElementChild as HTMLElement).style

  it("is the tileset's wall for a rank", () => {
    const { container } = render(
      <EncounterModal tileset="junior">
        <p>an encounter</p>
      </EncounterModal>
    )
    expect(wallOf(container).backgroundImage).toContain(imageMap.junior.image)
  })

  it("is none for a tileset with no wall, leaving the card's own colour", () => {
    const { container } = render(
      <EncounterModal tileset="cave">
        <p>an encounter</p>
      </EncounterModal>
    )
    expect(wallOf(container).backgroundImage).toBe("")
  })
})

describe("an encounter with nothing on screen", () => {
  // A conversation plays in the companion overlay, and the shop is blank while Fez greets: an empty frame
  // collapses to its padding and draws as a bar across the map.
  const Nothing = () => null

  it("draws no frame", () => {
    const { container } = render(
      <EncounterModal>
        <Nothing />
      </EncounterModal>
    )
    const modal = container.firstElementChild as HTMLElement

    expect(modal.matches(":has([data-encounter-content]:empty)")).toBe(true)
    expect(modal.className).toContain("has-[[data-encounter-content]:empty]:hidden")
  })

  it("draws the frame once there is something in it", () => {
    const { container } = render(
      <EncounterModal>
        <p>an encounter</p>
      </EncounterModal>
    )

    expect((container.firstElementChild as HTMLElement).matches(":has([data-encounter-content]:empty)")).toBe(false)
  })
})
