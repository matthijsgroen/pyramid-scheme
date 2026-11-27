// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, renderHook } from "@testing-library/react"
import { clearGameData, writeGameData } from "@/support/useGameStorage"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) => (opts?.count === undefined ? key : `${key}:${opts.count}`),
  }),
}))

const { useMosaicEntranceLabel } = await import("./campEntrance")
const { summarisePieces } = await import("./haulLines")

beforeEach(async () => {
  await clearGameData()
})
afterEach(cleanup)

describe("the mosaic entrance", () => {
  const labelFor = async (ledger: Record<string, number>, placed: Record<string, number>) => {
    await writeGameData({ "pyramid-scheme-progression-v4": { ledger }, "pyramid-scheme-mod-mosaic": placed })
    const { result } = renderHook(() => useMosaicEntranceLabel())
    await act(async () => {})
    return result.current
  }

  it("carries no badge when nothing waits to be placed", async () => {
    expect(await labelFor({ mosaicPiece_starter: 2 }, { starter: 2 })).toEqual({
      label: "mosaic.entrance.title",
      badge: undefined,
    })
  })

  it("badges the owned pieces not yet placed", async () => {
    expect(await labelFor({ mosaicPiece_starter: 3 }, { starter: 1 })).toEqual({
      label: "mosaic.entrance.title",
      badge: 2,
    })
  })

  it("sums pieces to place over the registers", async () => {
    expect(await labelFor({ mosaicPiece_starter: 3, mosaicPiece_junior: 2 }, { starter: 1 })).toEqual({
      label: "mosaic.entrance.title",
      badge: 4,
    })
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
