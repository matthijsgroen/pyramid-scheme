import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import type { HidatoPuzzleData } from "@/mods/puzzle/game/hidato/techniques"
import { HidatoBoard } from "./HidatoBoard"
import { skinFor } from "./skins"

const hive = skinFor(undefined, undefined)
const channel = skinFor("water", undefined)

// A corridor of four, so "beside each other" and "two apart" are both easy to say.
const puzzle: HidatoPuzzleData = {
  cells: Array.from({ length: 4 }, (_unused, q) => ({ q, r: 0 })),
  givens: { "0,0": 1 },
}

/** The cells the drawn run passes through, read off the stroke itself. */
const drawn = (root: HTMLElement) =>
  [...root.querySelectorAll("polyline")].map(line => line.getAttribute("points")!.split(" ").length)

const board = (values: Record<string, number>) =>
  render(
    <HidatoBoard puzzle={puzzle} skin={hive} values={values} onPickUp={() => {}} onTap={() => {}} onDrag={() => {}} />
  ).container

describe("the run drawn across the comb", () => {
  it("draws one unbroken stroke from the 1 as far as the numbers go", () => {
    expect(drawn(board({ "0,0": 1, "1,0": 2, "2,0": 3 }))).toEqual([3])
    // One number is not a line.
    expect(drawn(board({ "0,0": 1 }))).toEqual([])
  })

  it("stops at the first break rather than joining up what is beyond it", () => {
    // 3 and 4 touch each other, but nothing joins them to the 1 — a stroke there would claim a run that
    // has not been drawn. The line says how far the player has got, and that is nowhere yet.
    expect(drawn(board({ "0,0": 1, "2,0": 3, "3,0": 4 }))).toEqual([])
    // The same numbers once the 2 closes the gap: now it is all one run.
    expect(drawn(board({ "0,0": 1, "1,0": 2, "2,0": 3, "3,0": 4 }))).toEqual([4])
  })

  it("stops at the head the run was carried to, not at the number standing beyond it", () => {
    // The 2 was laid beside a 3 the puzzle wrote in. The numbers join up, but the player has not been
    // along that length of channel yet, so the stroke ends on the 2.
    const { container } = render(
      <HidatoBoard
        puzzle={puzzle}
        skin={hive}
        values={{ "0,0": 1, "1,0": 2, "2,0": 3 }}
        carried={2}
        onPickUp={() => {}}
        onTap={() => {}}
        onDrag={() => {}}
      />
    )
    expect(drawn(container)).toEqual([2])
  })

  it("stops where two numbers in a row do not touch", () => {
    // Consecutive and two cells apart: the numbers are on the board, the run between them is not.
    expect(drawn(board({ "0,0": 1, "2,0": 2, "3,0": 3 }))).toEqual([])
  })

  it("greens the fields the water has reached, and leaves the rest dry", () => {
    const { container } = render(
      // The 1 and the 2 are joined; the 4 is a ditch dug and dry, since nothing connects it to the water.
      <HidatoBoard
        puzzle={puzzle}
        skin={channel}
        values={{ "0,0": 1, "1,0": 2, "3,0": 4 }}
        onPickUp={() => {}}
        onTap={() => {}}
        onDrag={() => {}}
      />
    )
    const watered = [...container.querySelectorAll("polygon")].filter(cell =>
      cell.getAttribute("class")?.includes("emerald")
    )
    expect(watered).toHaveLength(2)
  })

  it("grows a plant along the river as the completion run passes, and only on the plain", () => {
    const filled = { "0,0": 1, "1,0": 2, "2,0": 3, "3,0": 4 }
    const plain = render(
      <HidatoBoard
        puzzle={puzzle}
        skin={channel}
        values={filled}
        lit={3}
        onPickUp={() => {}}
        onTap={() => {}}
        onDrag={() => {}}
      />
    )
    expect(plain.container.querySelectorAll(".animate-sprout")).toHaveLength(3)
    // The hive finishes with the light alone — a comb has nothing to grow.
    const comb = render(
      <HidatoBoard
        puzzle={puzzle}
        skin={hive}
        values={filled}
        lit={3}
        onPickUp={() => {}}
        onTap={() => {}}
        onDrag={() => {}}
      />
    )
    expect(comb.container.querySelectorAll(".animate-sprout")).toHaveLength(0)
  })

  it("runs the completion light along the channel rather than only over the cells", () => {
    const filled = { "0,0": 1, "1,0": 2, "2,0": 3, "3,0": 4 }
    const { container } = render(
      <HidatoBoard
        puzzle={puzzle}
        skin={hive}
        values={filled}
        lit={2}
        onPickUp={() => {}}
        onTap={() => {}}
        onDrag={() => {}}
      />
    )
    // The whole channel, and the part of it the light has reached.
    expect(drawn(container)).toEqual([4, 2])
  })
})
