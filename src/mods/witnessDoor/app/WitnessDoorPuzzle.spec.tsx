// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from "vitest"
import { act } from "react"
import { render, screen } from "@testing-library/react"
import { WitnessDoorPuzzle } from "./WitnessDoorPuzzle"
import { generateWitnessDoor, solutionsFor, type MirrorPlacement } from "../game/generateWitnessDoor"
import { cellKey } from "@/mods/core/game/beam/physics"

const board = generateWitnessDoor(1, "junior")

// The shell scrolls a revealed hint into view, which jsdom does not implement.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

/** The mirrors, as the buttons they are drawn as — in reading order, which is the order the board holds them. */
const mirrorCells = () =>
  screen.getAllByRole("button").filter(candidate => candidate.className.includes("aspect-square"))

/**
 * Lays a placement over the board the way a player does: one tap per mirror that is not already lying that
 * way. A placement names only the mirrors its own route meets, so every other mirror is left as it opened.
 */
const applySolution = (placement: readonly MirrorPlacement[]) => {
  const cells = mirrorCells()
  const angles = [...board.grid.initial]
  for (const { at, angle } of placement) {
    const mirror = board.grid.mirrors.findIndex(candidate => cellKey(candidate) === cellKey(at))
    if (angles[mirror] === angle) continue
    act(() => cells[mirror].click())
    angles[mirror] = angle
  }
}

describe("WitnessDoorPuzzle", () => {
  it("offers both shrines as goals", () => {
    render(<WitnessDoorPuzzle board={board} site="junior_2#2" onSolved={vi.fn()} onMint={vi.fn()} />)
    expect(screen.getByRole("button", { name: /east/i })).toBeDefined()
    expect(screen.getByRole("button", { name: /north/i })).toBeDefined()
  })

  it("mints only the chosen shrine's key when that shrine's solution is given", () => {
    const onMint = vi.fn()
    render(<WitnessDoorPuzzle board={board} site="junior_2#2" onSolved={vi.fn()} onMint={onMint} />)
    act(() => screen.getByRole("button", { name: /east/i }).click())
    applySolution(solutionsFor(board, "east")[0])
    expect(onMint).toHaveBeenCalledWith("witness:junior_2#2:east")
    expect(onMint).not.toHaveBeenCalledWith("witness:junior_2#2:north")
  })

  it("does not mint when the beam lands on the other shrine", () => {
    const onMint = vi.fn()
    render(<WitnessDoorPuzzle board={board} site="junior_2#2" onSolved={vi.fn()} onMint={onMint} />)
    act(() => screen.getByRole("button", { name: /east/i }).click())
    applySolution(solutionsFor(board, "north")[0])
    expect(onMint).not.toHaveBeenCalled()
  })

  it("mints nothing while no shrine has been named, however the light is routed", () => {
    const onMint = vi.fn()
    render(<WitnessDoorPuzzle board={board} site="junior_2#2" onSolved={vi.fn()} onMint={onMint} />)
    applySolution(solutionsFor(board, "east")[0])
    expect(onMint).not.toHaveBeenCalled()
  })
})

// A player may back out of a solved board and walk in again, and the key stays minted. If the choice were
// still open there, naming the other shrine would let one door open both branches of the fork.
describe("a door that has already opened", () => {
  it("refuses to be named for the other shrine", () => {
    const onMint = vi.fn()
    render(<WitnessDoorPuzzle board={board} site="junior_2#2" onSolved={vi.fn()} onMint={onMint} />)
    act(() => screen.getByRole("button", { name: /east/i }).click())
    applySolution(solutionsFor(board, "east")[0])
    act(() => screen.getByRole("button", { name: /north/i }).click())
    expect(screen.getByRole("button", { name: /east/i }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("button", { name: /north/i }).getAttribute("aria-pressed")).toBe("false")
    expect(onMint).not.toHaveBeenCalledWith("witness:junior_2#2:north")
  })
})
