import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FloorKeyRing } from "./FloorKeyRing"

const labels = {
  heldLabel: (color: string) => `${color} held`,
  neededLabel: (color: string) => `${color} needed`,
}

describe(FloorKeyRing, () => {
  it("names every key it draws, so held and still-needed are told apart without relying on colour", () => {
    const { getByTitle } = render(<FloorKeyRing held={["blue"]} needed={["red"]} {...labels} />)
    expect(getByTitle("blue held")).toBeTruthy()
    expect(getByTitle("red needed")).toBeTruthy()
  })

  it("renders nothing at all on a floor with no keys and no known doors", () => {
    const { container } = render(<FloorKeyRing held={[]} needed={[]} {...labels} />)
    expect(container.firstChild).toBeNull()
  })

  it("falls back to the empty label when one is supplied", () => {
    const { container } = render(<FloorKeyRing held={[]} needed={[]} emptyLabel="no keys" {...labels} />)
    expect(container.textContent).toBe("no keys")
  })
})
