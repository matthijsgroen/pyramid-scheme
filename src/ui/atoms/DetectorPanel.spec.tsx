import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import type { CompassResult, ConsumableResult } from "@/game/siteTypes"

// Isolated from the app's real i18n (never initialized in tests) — identity passthrough returns the
// key (with interpolated opts appended) so assertions target the key + data, not the prose.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && typeof opts === "object" && !("ns" in opts) ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}))

const { DetectorPanel } = await import("./DetectorPanel")

const noop = () => {}

const COMPASS: CompassResult[] = [
  { journeyId: "starter_1", levelIdx: 0, floorIdx: 0, hieroglyphId: "h1", pieceIndex: 0, cell: { row: 3, col: 4 } },
  { journeyId: "starter_1", levelIdx: 0, floorIdx: 1, hieroglyphId: "h1", pieceIndex: 1, cell: { row: 5, col: 2 } },
]

const CONSUMABLE: ConsumableResult[] = [
  { journeyId: "junior_1", edgeId: "0:2,3", floorIdx: 0, cell: { row: 2, col: 3 } },
  { journeyId: "junior_1", edgeId: "1:6,1", floorIdx: 1, cell: { row: 6, col: 1 } },
]

const renderCompass = (compassLevel: number) =>
  render(
    <DetectorPanel
      activeDetector="compass"
      compassLevel={compassLevel}
      consumableDetectorLevel={0}
      detectionLevel={0}
      compassTarget="h1"
      compassResults={COMPASS}
      consumableResults={[]}
      onSetDetector={noop}
    />
  )

describe("DetectorPanel precision by level (§7.2)", () => {
  it("compass L1 collapses to the pyramid only — one line, no floor/cell", () => {
    renderCompass(1)
    // Two hits in the same pyramid collapse to a single 'starter_1' line.
    expect(screen.getAllByText("starter_1")).toHaveLength(1)
    expect(screen.queryByText(/F1|F2|\(3,4\)/)).toBeNull()
  })

  it("compass with no target points the player at the Collection picker (§3C)", () => {
    render(
      <DetectorPanel
        activeDetector="compass"
        compassLevel={1}
        consumableDetectorLevel={0}
        detectionLevel={0}
        compassTarget={null}
        compassResults={[]}
        consumableResults={[]}
        onSetDetector={noop}
      />
    )
    expect(screen.getByText("detector.pickTarget")).toBeTruthy()
  })

  it("compass L2 shows the floor but not the cell", () => {
    renderCompass(2)
    expect(screen.getByText("starter_1 L1 F1")).toBeTruthy()
    expect(screen.getByText("starter_1 L1 F2")).toBeTruthy()
    expect(screen.queryByText(/\(3,4\)/)).toBeNull()
  })

  it("compass L3 shows the exact cell", () => {
    renderCompass(3)
    expect(screen.getByText("starter_1 L1 F1 · (3,4)")).toBeTruthy()
    expect(screen.getByText("starter_1 L1 F2 · (5,2)")).toBeTruthy()
  })

  it("corridor detector widens outward: L1 silent, L2 floor line, L3 pyramid count", () => {
    const base = {
      activeDetector: "hiddenPassageway" as const,
      compassLevel: 0,
      consumableDetectorLevel: 0,
      compassTarget: null,
      compassResults: [],
      consumableResults: [],
      onSetDetector: noop,
      floorHasHiddenCorridor: true,
      pyramidHiddenCorridorCount: 3,
    }
    const { rerender } = render(<DetectorPanel {...base} detectionLevel={1} />)
    expect(screen.queryByText("detector.corridorOnFloor")).toBeNull() // L1 = proximity only
    expect(screen.queryByText(/detector\.corridorPyramidCount/)).toBeNull()

    rerender(<DetectorPanel {...base} detectionLevel={2} />)
    expect(screen.getByText("detector.corridorOnFloor")).toBeTruthy()
    expect(screen.queryByText(/detector\.corridorPyramidCount/)).toBeNull() // pyramid count is L3+

    rerender(<DetectorPanel {...base} detectionLevel={3} />)
    expect(screen.getByText("detector.corridorOnFloor")).toBeTruthy()
    // Interpolated: identity mock appends the count — proves L3 passes pyramidHiddenCorridorCount=3.
    expect(screen.getByText(/detector\.corridorPyramidCount:.*"count":3/)).toBeTruthy()
  })

  it("supplies L1 pyramid only; L3 exact cell", () => {
    const props = {
      activeDetector: "consumable" as const,
      compassLevel: 0,
      detectionLevel: 0,
      compassTarget: null,
      compassResults: [],
      consumableResults: CONSUMABLE,
      onSetDetector: noop,
    }
    const { rerender } = render(<DetectorPanel {...props} consumableDetectorLevel={1} />)
    expect(screen.getAllByText("junior_1")).toHaveLength(1)

    rerender(<DetectorPanel {...props} consumableDetectorLevel={3} />)
    expect(screen.getByText("junior_1 F1 · (2,3)")).toBeTruthy()
    expect(screen.getByText("junior_1 F2 · (6,1)")).toBeTruthy()
  })
})
