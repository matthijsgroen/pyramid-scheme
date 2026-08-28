import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, within } from "@testing-library/react"
import { CanistersBoard } from "./CanistersBoard"
import { skinFor } from "./skins"

afterEach(cleanup)

const board = (capacities: number[], volumes: number[]) =>
  render(
    <CanistersBoard
      capacities={capacities}
      volumes={volumes}
      skin={skinFor(undefined, undefined)}
      onHold={() => undefined}
      onPour={() => undefined}
      onClaim={() => undefined}
    />
  )

const vessels = (root: HTMLElement) =>
  within(root)
    .getAllByRole("button")
    .filter(button => (button.getAttribute("aria-label") ?? "").startsWith("canister of"))

describe("what a canister says about itself", () => {
  it("writes how much is in it against how much it holds", () => {
    // The amount is the whole change here: a player who has poured four times should be able to read what
    // is in front of them rather than having carried every total since the first pour.
    const { container } = board([8, 5, 3], [1, 5, 0])
    expect(vessels(container).map(v => v.textContent)).toEqual(["1/8", "5/5", "0/3"])
  })

  it("says both to a screen reader, not only the size", () => {
    const { container } = board([8, 5, 3], [1, 5, 0])
    expect(vessels(container).map(v => v.getAttribute("aria-label"))).toEqual([
      "canister of 8, holding 1",
      "canister of 5, holding 5",
      "canister of 3, holding 0",
    ])
  })

  it("writes an empty vessel as a nought rather than leaving it blank", () => {
    // A blank would read as "nothing to say about this one" next to vessels that do say something.
    const { container } = board([8, 5], [8, 0])
    expect(vessels(container)[1].textContent).toBe("0/5")
  })
})
