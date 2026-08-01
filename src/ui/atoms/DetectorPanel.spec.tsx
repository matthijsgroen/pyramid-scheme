import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import type { CompassHit, ConsumableResult } from "@/game/siteTypes"

// Isolated from the app's real i18n (never initialized in tests) — identity passthrough returns the
// key (with interpolated opts appended) so assertions target the key + data, not the prose.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && typeof opts === "object" && !("ns" in opts) ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}))

const { DetectorPanel } = await import("./DetectorPanel")

// This project doesn't enable RTL's automatic cleanup, so without this each test's markup stays
// mounted and later queries match earlier renders (see CollectibleSlot.spec.tsx for the same guard).
afterEach(cleanup)

// Journey ids are internal; the panel is handed a lookup so the readout shows real names. Tests use
// stand-ins to prove the substitution happens (the app passes localized names from journeys.json).
const journeyName = (id: string) => ({ starter_1: "Sphinx Dawn", junior_1: "Ibis Way" })[id] ?? id
const targetLabel = (id: string) => (id === "h1" ? "𓎗" : id)

const COMPASS: CompassHit[] = [
  {
    journeyId: "starter_1",
    levelIdx: 0,
    floorIdx: 0,
    hieroglyphId: "h1",
    pieceIndex: 0,
    cell: { row: 3, col: 4 },
    access: "open",
  },
  {
    journeyId: "starter_1",
    levelIdx: 0,
    floorIdx: 1,
    hieroglyphId: "h1",
    pieceIndex: 1,
    cell: { row: 5, col: 2 },
    access: "open",
  },
]

const CONSUMABLE: ConsumableResult[] = [
  { journeyId: "junior_1", edgeId: "0:2,3", floorIdx: 0, cell: { row: 2, col: 3 } },
  { journeyId: "junior_1", edgeId: "1:6,1", floorIdx: 1, cell: { row: 6, col: 1 } },
]

const renderCompass = (compassLevel: number, compassResults: CompassHit[] = COMPASS) =>
  render(
    <DetectorPanel
      activeDetector="compass"
      compassLevel={compassLevel}
      consumableDetectorLevel={0}
      detectionLevel={0}
      compassTarget="h1"
      compassTargetLabel={targetLabel}
      journeyName={journeyName}
      compassResults={compassResults}
      consumableResults={[]}
    />
  )

describe("DetectorPanel precision by level (§7.2)", () => {
  it("compass L1 collapses to the pyramid only — one line, no floor/cell", () => {
    renderCompass(1)
    // Two hits on different floors of the SAME pyramid collapse to one line.
    expect(screen.getAllByText("Sphinx Dawn L1")).toHaveLength(1)
    expect(screen.queryByText(/F1|F2|\(3,4\)/)).toBeNull()
  })

  // L1 is "which pyramid" (§7.2), not "which journey" — a journey holds several, so two pyramids of
  // one journey must stay separate lines. Keying on journeyId alone used to merge them.
  it("compass L1 lists two pyramids of the same journey separately", () => {
    renderCompass(1, [
      { ...COMPASS[0], levelIdx: 0 },
      { ...COMPASS[1], levelIdx: 2 },
    ])
    expect(screen.getByText("Sphinx Dawn L1")).toBeTruthy()
    expect(screen.getByText("Sphinx Dawn L3")).toBeTruthy()
  })

  it("names what it is hunting, using the mod-supplied target label", () => {
    renderCompass(1)
    expect(screen.getByText(/detector\.lookingFor:.*𓎗/)).toBeTruthy()
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
      />
    )
    expect(screen.getByText("detector.pickTarget")).toBeTruthy()
  })

  it("compass L2 shows the floor but not the cell", () => {
    renderCompass(2)
    expect(screen.getByText("Sphinx Dawn L1 F1")).toBeTruthy()
    expect(screen.getByText("Sphinx Dawn L1 F2")).toBeTruthy()
    expect(screen.queryByText(/\(3,4\)/)).toBeNull()
  })

  it("compass L3 shows the exact cell", () => {
    renderCompass(3)
    expect(screen.getByText("Sphinx Dawn L1 F1 · (3,4)")).toBeTruthy()
    expect(screen.getByText("Sphinx Dawn L1 F2 · (5,2)")).toBeTruthy()
  })

  it("corridor detector widens outward: L1 silent, L2 floor line, L3 pyramid count", () => {
    const base = {
      activeDetector: "hiddenPassageway" as const,
      compassLevel: 0,
      consumableDetectorLevel: 0,
      compassTarget: null,
      compassResults: [],
      consumableResults: [],
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
    }
    const { rerender } = render(<DetectorPanel {...props} consumableDetectorLevel={1} journeyName={journeyName} />)
    expect(screen.getAllByText("Ibis Way")).toHaveLength(1)

    rerender(<DetectorPanel {...props} consumableDetectorLevel={3} journeyName={journeyName} />)
    expect(screen.getByText("Ibis Way F1 · (2,3)")).toBeTruthy()
    expect(screen.getByText("Ibis Way F2 · (6,1)")).toBeTruthy()
  })
})

// The readout only marks what it can justify: a blocker it checked (🔒), one it can't evaluate (❓),
// or discovery-gated content (👁). A hit with nothing known in the way carries NO badge — a bare row
// must not be read as a promise that the piece is collectable.
describe("DetectorPanel access marking", () => {
  const withAccess = (access: CompassHit["access"]) => [{ ...COMPASS[0], access }]

  // Queried by tooltip rather than glyph — 👁 also labels a detector mode, so the title both keeps
  // the assertion unambiguous and proves the explanation is wired up.
  it("leaves an unblocked hit unmarked", () => {
    renderCompass(1, withAccess("open"))
    expect(screen.getByText("Sphinx Dawn L1")).toBeTruthy()
    expect(screen.queryByTitle(/^detector\.access\./)).toBeNull()
  })

  it("flags a hit behind a key the player lacks", () => {
    renderCompass(1, withAccess("locked"))
    expect(screen.getByTitle("detector.access.locked").textContent).toContain("🔒")
  })

  it("flags a hit whose reachability it cannot determine", () => {
    renderCompass(1, withAccess("unknown"))
    expect(screen.getByTitle("detector.access.unknown").textContent).toContain("❓")
  })

  it("flags a hit that needs the corridor detector", () => {
    renderCompass(1, withAccess("hidden"))
    expect(screen.getByTitle("detector.access.hidden").textContent).toContain("👁")
  })
})
