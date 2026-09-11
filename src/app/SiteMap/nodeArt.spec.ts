import { describe, expect, it } from "vitest"
import { NODE_ART_DX, NODE_ART_DY, nodeArtOffset } from "./nodeArt"
import type { Direction } from "@/game/siteTypes"
import { CELL, PAD, PAD_TOP, ROW_PITCH, WALL_H, cellTop, mapHeight } from "./mapScale"

describe("a node's furniture stands out of the way", () => {
  // The rule is one sentence — away from every exit — and these are the shapes a cell actually comes in.
  const at = (...dirs: Direction[]) => nodeArtOffset(new Set(dirs))

  it("puts it at the far end of a dead end, opposite the way in", () => {
    expect(at("n")).toEqual({ dx: 0, dy: NODE_ART_DY })
    expect(at("s")).toEqual({ dx: 0, dy: -NODE_ART_DY })
    expect(at("e")).toEqual({ dx: -NODE_ART_DX, dy: 0 })
    expect(at("w")).toEqual({ dx: NODE_ART_DX, dy: 0 })
  })

  it("puts it in the free corner of a bend, away from both arms", () => {
    expect(at("n", "e")).toEqual({ dx: -NODE_ART_DX, dy: NODE_ART_DY })
    expect(at("s", "w")).toEqual({ dx: NODE_ART_DX, dy: -NODE_ART_DY })
  })

  it("steps it off the path where a cell is walked through", () => {
    // A straight passage has no free corner — both ends are in use — so the furniture goes to the side
    // and stays level, which is the wall rather than the way through.
    expect(at("n", "s")).toEqual({ dx: NODE_ART_DX, dy: 0 })
    expect(at("e", "w")).toEqual({ dx: NODE_ART_DX, dy: 0 })
    expect(at("n", "e", "s", "w")).toEqual({ dx: NODE_ART_DX, dy: 0 })
  })

  it("keeps the last quarter of a three-way, which is the one nothing points at", () => {
    // Exits north, east and west: the sum is north, so the furniture stands south.
    expect(at("n", "e", "w")).toEqual({ dx: 0, dy: NODE_ART_DY })
  })

  it("falls back to the side for a cell with no way out at all", () => {
    expect(at()).toEqual({ dx: NODE_ART_DX, dy: 0 })
    expect(nodeArtOffset(undefined)).toEqual({ dx: NODE_ART_DX, dy: 0 })
  })
})

describe("the map leaves room above its top row", () => {
  // A prop is bottom-anchored in a box a cell plus a wall band tall, so the tallest thing on row 0
  // reaches WALL_H above its own floor square. Without its own padding that lands on the map's edge.
  it("keeps a full prop box inside the picture on the top row", () => {
    const topOfTallestProp = cellTop(0) + CELL - (CELL + WALL_H)
    expect(topOfTallestProp).toBeGreaterThanOrEqual(WALL_H)
  })

  it("counts that room into the map's height", () => {
    expect(mapHeight(3)).toBe(3 * ROW_PITCH + WALL_H + PAD_TOP + PAD)
  })
})
