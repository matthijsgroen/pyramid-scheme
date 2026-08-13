import { describe, it, expect, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import type { CompassHit, ConsumableResult } from "@/game/siteTypes"
import { DetectorPanel, type DetectorPanelLabels } from "./DetectorPanel"

// Plain stand-in prose: the panel takes its strings as props, so the app owns the real translations.
const labels: DetectorPanelLabels = {
  pickTarget: "Pick a target",
  lookingFor: symbol => `Looking for ${symbol}`,
  allCollected: "All collected",
  access: {
    open: "Access: open",
    locked: "Access: locked",
    hidden: "Access: hidden",
    unknown: "Access: unknown",
  },
  more: count => `+${count} more`,
  noSkippedChests: "No skipped chests",
  corridorNearby: "A hidden corridor is close by",
  corridorNoneNearby: "No hidden corridor close by",
  corridorOnFloor: "A hidden corridor waits on this floor",
  corridorNoneOnFloor: "No hidden corridor on this floor",
  corridorOtherFloor: "A hidden corridor waits on another floor",
  corridorNoneInPyramid: "No hidden corridors found so far in this pyramid",
}

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
      labels={labels}
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
    expect(screen.getByText(/Looking for 𓎗/)).toBeTruthy()
  })

  it("compass with no target points the player at the Collection picker (§3C)", () => {
    render(
      <DetectorPanel
        labels={labels}
        activeDetector="compass"
        compassLevel={1}
        consumableDetectorLevel={0}
        detectionLevel={0}
        compassTarget={null}
        compassResults={[]}
        consumableResults={[]}
      />
    )
    expect(screen.getByText("Pick a target")).toBeTruthy()
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

  // The corridor readout widens outward one scope per level (§7.2), and each unlocked scope answers
  // either way. A scope that only spoke up when it had news read as a broken detector.
  const corridorBase = {
    labels,
    activeDetector: "hiddenPassageway" as const,
    compassLevel: 0,
    consumableDetectorLevel: 0,
    compassTarget: null,
    compassResults: [],
    consumableResults: [],
  }

  it("unlocks one scope per level, and says nothing about scopes still locked", () => {
    const found = {
      ...corridorBase,
      corridorNearby: true,
      floorHasHiddenCorridor: true,
      hiddenCorridorOnOtherFloor: true,
    }

    const { rerender } = render(<DetectorPanel {...found} detectionLevel={1} />)
    expect(screen.getByText("A hidden corridor is close by")).toBeTruthy()
    expect(screen.queryByText(/on this floor/)).toBeNull() // floor scope is L2+
    expect(screen.queryByText(/another floor|in this pyramid/)).toBeNull() // pyramid scope is L3+

    rerender(<DetectorPanel {...found} detectionLevel={2} />)
    expect(screen.getByText("A hidden corridor waits on this floor")).toBeTruthy()
    expect(screen.queryByText(/another floor|in this pyramid/)).toBeNull()

    rerender(<DetectorPanel {...found} detectionLevel={3} />)
    expect(screen.getByText("A hidden corridor waits on another floor")).toBeTruthy()
  })

  it("states the absence at every unlocked scope rather than going quiet", () => {
    render(
      <DetectorPanel
        {...corridorBase}
        detectionLevel={3}
        corridorNearby={false}
        floorHasHiddenCorridor={false}
        hiddenCorridorOnOtherFloor={false}
      />
    )
    expect(screen.getByText("No hidden corridor close by")).toBeTruthy()
    expect(screen.getByText("No hidden corridor on this floor")).toBeTruthy()
    expect(screen.getByText("No hidden corridors found so far in this pyramid")).toBeTruthy()
  })

  it("answers each scope on its own, so a lead nearby does not imply one elsewhere", () => {
    render(
      <DetectorPanel
        {...corridorBase}
        detectionLevel={3}
        corridorNearby
        floorHasHiddenCorridor
        hiddenCorridorOnOtherFloor={false}
      />
    )
    expect(screen.getByText("A hidden corridor is close by")).toBeTruthy()
    expect(screen.getByText("A hidden corridor waits on this floor")).toBeTruthy()
    expect(screen.getByText("No hidden corridors found so far in this pyramid")).toBeTruthy()
  })

  // Folding the HUD's three detector buttons into one moved the choice of mode in here. With only one
  // detector owned there is no choice to offer, so the row must not appear at all.
  it("offers the mode switcher only when more than one detector is owned", () => {
    const withSwitcher = {
      ...corridorBase,
      detectionLevel: 1,
      detectorTitles: { compass: "Compass", consumable: "Supplies", hiddenPassageway: "Corridors" },
      onSetDetector: () => {},
    }

    const { rerender } = render(<DetectorPanel {...withSwitcher} />)
    expect(screen.queryByTitle("Compass")).toBeNull() // corridor detector alone
    expect(screen.queryByTitle("Corridors")).toBeNull()

    rerender(<DetectorPanel {...withSwitcher} compassLevel={2} />)
    expect(screen.getByTitle("Compass")).toBeTruthy()
    expect(screen.getByTitle("Corridors")).toBeTruthy()
  })

  it("leaves the switcher out when the screen supplies no way to switch", () => {
    render(<DetectorPanel {...corridorBase} detectionLevel={3} compassLevel={2} />)
    expect(screen.queryByTitle("Compass")).toBeNull()
  })

  it("supplies L1 pyramid only; L3 exact cell", () => {
    const props = {
      labels,
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
    expect(screen.queryByTitle(/^Access: /)).toBeNull()
  })

  it("flags a hit behind a key the player lacks", () => {
    renderCompass(1, withAccess("locked"))
    expect(screen.getByTitle("Access: locked").textContent).toContain("🔒")
  })

  it("flags a hit whose reachability it cannot determine", () => {
    renderCompass(1, withAccess("unknown"))
    expect(screen.getByTitle("Access: unknown").textContent).toContain("❓")
  })

  it("flags a hit that needs the corridor detector", () => {
    renderCompass(1, withAccess("hidden"))
    expect(screen.getByTitle("Access: hidden").textContent).toContain("👁")
  })
})
