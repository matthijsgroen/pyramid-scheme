// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { TileStatus } from "@/game/sequence"
import { NodeShape } from "./nodeShapes"
import { sequenceTileLook } from "./sequenceTileLook"
import { sharedTileUrl } from "./tileAssets"

const STATUSES: TileStatus[] = ["unwalked", "inOrder", "outOfOrder"]

const drawTile = (status: TileStatus) =>
  render(
    <svg>
      <NodeShape type="plate" state="reachable" plate={{ glyph: 0x13080, status }} />
    </svg>
  ).container.querySelector("[data-plate]")!

describe("a sequence tile", () => {
  it("draws its glyph over the shared painted tile", () => {
    const tile = drawTile("unwalked")
    const image = tile.querySelector("image")
    expect(image?.getAttribute("href")).toBe(sharedTileUrl("sequenceTile"))
    const text = tile.querySelector("[data-glyph-ink]")
    expect(text?.textContent).toBe(String.fromCodePoint(0x13080))
    expect(image!.compareDocumentPosition(text!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  for (const status of STATUSES) {
    it(`${status}: the glyph wears the state's colour, with no tick and no cross`, () => {
      const tile = drawTile(status)
      expect(tile.getAttribute("data-status")).toBe(status)
      expect(tile.querySelector("[data-glyph-ink]")?.getAttribute("fill")).toBe(sequenceTileLook[status])
      expect(tile.querySelectorAll("path")).toHaveLength(0)
    })
  }

  it("gives each state its own glyph colour", () => {
    expect(new Set(STATUSES.map(s => sequenceTileLook[s])).size).toBe(3)
  })
})
