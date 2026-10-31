// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, renderHook } from "@testing-library/react"
import { clearGameData, writeGameData } from "@/support/useGameStorage"
import { MOSAIC_TOTAL } from "../game/mosaicCurrency"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { found?: number; total?: number }) =>
      opts?.found === undefined ? key : `${key}:${opts.found}/${opts.total}`,
  }),
}))

const { useMosaicEntranceLabel } = await import("./campEntrance")
const { summarisePieces } = await import("./haulLines")

beforeEach(async () => {
  await clearGameData()
})
afterEach(cleanup)

describe("the mosaic entrance", () => {
  it("reads found over total from the ledger", async () => {
    await writeGameData({
      "pyramid-scheme-progression-v4": { ledger: { mosaicPiece_starter: 1, mosaicPiece_junior: 1 } },
    })
    const { result } = renderHook(() => useMosaicEntranceLabel())
    await act(async () => {})
    expect(result.current.label).toBe(`mosaic.entrance.label:2/${MOSAIC_TOTAL}`)
  })
})

describe("the mosaic haul line", () => {
  it("counts three pieces as one line", () => {
    const pieces = [1, 2, 3].map(() => ({ type: "mosaicPiece", tier: "starter" }))
    const lines = summarisePieces(pieces, (key, opts) => `${key}:${opts?.count}`)
    expect(lines).toHaveLength(1)
    expect(lines[0].title).toBe("mosaic.haul.pieces:3")
  })
})
