// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) => [key, ...(vars ? Object.values(vars) : [])].join(" "),
    i18n: { language: "en" },
  }),
}))
vi.mock("@/mods/registerModApps", () => ({}))
// The slot registry is module state; a mock keeps this spec's made-up slot out of every other spec.
vi.mock("./journeyCardSlots", () => ({
  journeyCardSlots: () => [
    {
      id: "made-up",
      Component: ({ journeyInfo }: { journeyInfo: { journey: { id: string } } }) => (
        <p>{`slot for ${journeyInfo.journey.id}`}</p>
      ),
    },
  ],
}))

type Made = {
  id: string
  name: string
  difficulty: string
  exterior: "pyramid" | "tomb"
  levelCount: number
  entryLock?: { count: number }
  mapHint?: string
}
const made = (id: string, difficulty: string, extra: Partial<Made> = {}): Made => ({
  id,
  name: `Name ${id}`,
  difficulty,
  exterior: "pyramid",
  levelCount: 3,
  ...extra,
})
const journeys = [
  made("s1", "starter"),
  made("s2", "starter", { levelCount: 1 }),
  made("j1", "junior"),
  made("j2", "junior"),
  made("jt", "junior", { exterior: "tomb", entryLock: { count: 3 }, mapHint: "Hint jt", levelCount: 2 }),
]

type Progress = { levelNr: number; completionCount: number; inProgress: boolean }
let progress: Record<string, Progress> = {}
let activeJourneyId: string | undefined
let unexplored: Record<string, number[]> = {}
let buried: Record<string, number[]> = {}
let heldKeys = new Set<string>()
let lockFound = 2
let comingSoon: string | undefined
let gateNeeds: { gate: { tier: string } | { journeyId: string }; key: string; label: string; hint?: string }[] = []
const startJourney = vi.fn()
const visitLevel = vi.fn()
const cancelJourney = vi.fn()

vi.mock("@/app/translations/useJourneyTranslations", () => ({ useJourneyTranslations: () => journeys }))
vi.mock("@/app/state/useJourneys", () => ({
  useJourneys: () => ({
    activeJourneyId,
    startJourney,
    visitLevel,
    cancelJourney,
    getJourney: (id: string) => {
      const p = progress[id]
      return p && { ...p, journey: journeys.find(j => j.id === id) }
    },
    getOutstandingHiddenCorridorCount: () => 0,
    getUnexploredLevels: (id: string) => new Set(unexplored[id] ?? []),
  }),
}))
vi.mock("@/app/pages/useAvailableJourneyIds", () => ({
  useAvailableJourneyIds: () => new Set(["s1", "s2", "j1", "j2"]),
}))
vi.mock("@/app/pages/journeyContributions", () => ({
  useMergedJourneyContributions: () => ({
    hidden: () => false,
    mark: () => undefined,
    buried: (id: string) => new Set(buried[id] ?? []),
    lock: (id: string) =>
      id === "jt"
        ? {
            found: lockFound,
            required: 3,
            labels: { title: "Lock title", requires: "", unit: "Pieces", howToUnlock: "" },
          }
        : undefined,
  }),
}))
vi.mock("@/app/SiteMap/keyProviders", () => ({
  useMergedHeldKeys: () => heldKeys,
  useMergedKeyDisplay: () => (id: string) => ({ symbol: `sym-${id}` }),
}))
vi.mock("@/app/SiteMap/detectorLevels", () => ({ useMergedDetectorLevels: () => ({}) }))
vi.mock("@/app/pages/gateNeeds", () => ({
  useMergedGateNeeds: () => {
    const sameGate = (a: object, b: object) => JSON.stringify(a) === JSON.stringify(b)
    const unmet = (gate: object, held: ReadonlySet<string>) =>
      gateNeeds.filter(n => sameGate(n.gate, gate) && !held.has(n.key))
    return { needs: unmet, unmet, open: (gate: object, held: ReadonlySet<string>) => unmet(gate, held).length === 0 }
  },
}))
vi.mock("@/app/pages/journeyAvailability", () => ({
  isTierUnlocked: (tier: string) => tier === "starter" || tier === "junior",
  comingSoonDifficulty: (_held: ReadonlySet<string>, gateOpen: (tier: string) => boolean) =>
    comingSoon && gateOpen(comingSoon) ? comingSoon : undefined,
  holdsTierKey: () => true,
  tierKeyNeed: (
    _tier: string,
    held: ReadonlySet<string>,
    display: (id: string) => { symbol: string } | undefined,
    label: string
  ) => ({
    key: "tier",
    label,
    symbols: ["k1", "k2"].flatMap(id => {
      const shown = display(id)
      return shown ? [{ symbol: shown.symbol, held: held.has(id) }] : []
    }),
  }),
}))

const { AllJourneys } = await import("./AllJourneysPage")

const state = (extra: Partial<Progress> = {}): Progress => ({
  levelNr: 1,
  completionCount: 0,
  inProgress: false,
  ...extra,
})

beforeEach(() => {
  progress = {}
  activeJourneyId = undefined
  unexplored = {}
  buried = {}
  heldKeys = new Set()
  lockFound = 2
  comingSoon = undefined
  gateNeeds = []
  startJourney.mockReset()
  visitLevel.mockReset()
  cancelJourney.mockReset()
})
afterEach(cleanup)

const renderList = (startGame = vi.fn()) => {
  render(<AllJourneys startGame={startGame} />)
  return startGame
}
const click = (el: HTMLElement) => act(async () => void fireEvent.click(el))
const rowButton = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) })

describe("AllJourneys", () => {
  it("lists the newest tier first with its progress, the shut tier above it", () => {
    progress = {
      s1: state({ completionCount: 1 }),
      s2: state({ completionCount: 1 }),
      j1: state({ completionCount: 1 }),
    }
    renderList()
    const headings = screen.getAllByText(/^difficulty\./).map(el => el.textContent)
    expect(headings).toEqual(["difficulty.expert", "difficulty.junior", "difficulty.starter"])
    expect(screen.getByText("journeys.tierProgress 1 3")).toBeTruthy()
  })

  it("marks the current journey NOW and continues it without starting anything", async () => {
    activeJourneyId = "j1"
    progress = { j1: state({ inProgress: true, levelNr: 2 }) }
    const startGame = renderList()
    expect(screen.getByText("journeys.now")).toBeTruthy()
    expect(screen.getByText("journeys.noteCurrentPyramid 2 3")).toBeTruthy()

    await click(rowButton("Name j1"))

    expect(startGame).toHaveBeenCalled()
    expect(startJourney).not.toHaveBeenCalled()
    expect(visitLevel).not.toHaveBeenCalled()
  })

  it("starts an open journey, then sets off", async () => {
    const order: string[] = []
    startJourney.mockImplementation(async () => order.push("start"))
    renderList(vi.fn(() => order.push("game")))

    await click(rowButton("Name j2"))

    expect(startJourney).toHaveBeenCalledWith(expect.objectContaining({ id: "j2" }))
    expect(order).toEqual(["start", "game"])
  })

  it("re-enters a finished journey at its last site; a stop enters that site; a buried stop is no button", async () => {
    progress = { j2: state({ completionCount: 1, levelNr: 1 }) }
    buried = { j2: [3] }
    const startGame = renderList()

    await click(rowButton("Name j2"))
    expect(visitLevel).toHaveBeenLastCalledWith("j2", 3)
    expect(startGame).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("button", { name: "journeys.showStops Name j2" }))
    expect(screen.queryByRole("button", { name: "journeys.stopPyramid 3" })).toBeNull()
    expect(screen.getByLabelText("journeys.stopPyramid 3")).toBeTruthy()
    await click(screen.getByRole("button", { name: "journeys.stopPyramid 2" }))
    expect(visitLevel).toHaveBeenLastCalledWith("j2", 2)
    expect(startGame).toHaveBeenCalledTimes(2)
  })

  it("asks before leaving a pyramid under way; confirming cancels, starts and sets off", async () => {
    activeJourneyId = "j1"
    progress = { j1: state({ inProgress: true }) }
    const startGame = renderList()

    await click(rowButton("Name j2"))
    expect(startJourney).not.toHaveBeenCalled()
    expect(screen.getByText("ui.confirmInterruptExpedition")).toBeTruthy()

    await click(screen.getAllByRole("button", { name: "ui.interruptExpedition" }).at(-1)!)

    expect(cancelJourney).toHaveBeenCalled()
    expect(startJourney).toHaveBeenCalledWith(expect.objectContaining({ id: "j2" }))
    expect(startGame).toHaveBeenCalled()
  })

  it("does nothing when the confirmation is cancelled", async () => {
    activeJourneyId = "j1"
    progress = { j1: state({ inProgress: true }) }
    const startGame = renderList()

    await click(rowButton("Name j2"))
    await click(screen.getByRole("button", { name: "ui.cancel" }))

    expect(cancelJourney).not.toHaveBeenCalled()
    expect(startJourney).not.toHaveBeenCalled()
    expect(startGame).not.toHaveBeenCalled()
    expect(screen.queryByText("ui.confirmInterruptExpedition")).toBeNull()
  })

  it("leaves a tomb under way without asking", async () => {
    activeJourneyId = "jt"
    lockFound = 3
    progress = { jt: state({ inProgress: true }) }
    const startGame = renderList()

    await click(rowButton("Name j2"))

    expect(screen.queryByText("ui.confirmInterruptExpedition")).toBeNull()
    expect(cancelJourney).toHaveBeenCalled()
    expect(startJourney).toHaveBeenCalled()
    expect(startGame).toHaveBeenCalled()
  })

  it("shows a locked tomb as its lock, with its count, and cannot enter it", async () => {
    const startGame = renderList()
    expect(screen.getByText("Lock title")).toBeTruthy()
    expect(screen.queryByText("Name jt")).toBeNull()
    expect(screen.getByText("Hint jt")).toBeTruthy()
    expect(screen.getByText("journeys.needProgress Pieces 2 3")).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Lock title/ })).toBeNull()
    expect(startGame).not.toHaveBeenCalled()
  })

  it("folds a finished older tier, with a dot for news, until it is opened", async () => {
    progress = { s1: state({ completionCount: 1 }), s2: state({ completionCount: 1 }) }
    unexplored = { s1: [2] }
    renderList()
    const header = screen.getByRole("button", { name: /difficulty.starter/ })
    expect(header.getAttribute("aria-expanded")).toBe("false")
    expect(within(header).getByRole("img", { name: "journeys.newDot" })).toBeTruthy()
    expect(screen.queryByText("Name s1")).toBeNull()

    await click(header)

    expect(screen.getByText("Name s1")).toBeTruthy()
  })

  it("shows what the next tier needs, the held treasure lit", () => {
    heldKeys = new Set(["k1"])
    const { container } = render(<AllJourneys startGame={() => {}} />)
    expect(screen.getByText("journeys.tierNeed")).toBeTruthy()
    const lit = container.querySelector('[data-held="true"]')
    const dim = container.querySelector('[data-held="false"]')
    expect(lit?.textContent).toBe("sym-k1")
    expect(dim?.textContent).toBe("sym-k2")
  })

  it("lists the treasure lit and an unmet need with its hint under the shut tier", () => {
    heldKeys = new Set(["k1"])
    gateNeeds = [{ gate: { tier: "expert" }, key: "made-up-need", label: "Need a thing", hint: "Sold somewhere" }]
    const { container } = render(<AllJourneys startGame={() => {}} />)
    expect(container.querySelector('[data-held="true"]')?.textContent).toBe("sym-k1")
    expect(screen.getByText("Need a thing")).toBeTruthy()
    expect(screen.getByText("Sold somewhere")).toBeTruthy()
  })

  it("lists no need once its key is held", () => {
    heldKeys = new Set(["made-up-need"])
    gateNeeds = [{ gate: { tier: "expert" }, key: "made-up-need", label: "Need a thing" }]
    renderList()
    expect(screen.queryByText("Need a thing")).toBeNull()
  })

  it("keeps a tomb with every map piece shut while its need is unmet, and lists the need", () => {
    lockFound = 3
    gateNeeds = [{ gate: { journeyId: "jt" }, key: "made-up-need", label: "Need a thing", hint: "Sold somewhere" }]
    renderList()
    expect(screen.queryByRole("button", { name: /^Name jt|^Lock title/ })).toBeNull()
    expect(screen.getByText("Need a thing")).toBeTruthy()
    expect(screen.getByText("Sold somewhere")).toBeTruthy()
  })

  it("renders a card slot for a one-site journey, which has no chevron", () => {
    progress = { s2: state({ completionCount: 1 }), s1: state({ completionCount: 1 }) }
    heldKeys = new Set()
    renderList()
    fireEvent.click(screen.getByRole("button", { name: /difficulty.starter/ }))

    expect(screen.queryByRole("button", { name: "journeys.showStops Name s2" })).toBeNull()
    expect(screen.getByText("slot for s2")).toBeTruthy()
  })

  it("renders a card slot for an open journey that was started and cancelled", () => {
    progress = { j2: state({ levelNr: 2 }) }
    renderList()

    expect(screen.getByText("slot for j2")).toBeTruthy()
    expect(screen.queryByText("slot for j1")).toBeNull()
  })

  it("says a started-and-cancelled journey was started before, and a fresh one not visited", () => {
    progress = { j2: state({ levelNr: 2 }), j1: state() }
    renderList()

    expect(rowButton("Name j2").textContent).toContain("journeys.noteResumePyramid 2 3")
    expect(rowButton("Name j1").textContent).toContain("journeys.noteOpen")
  })

  it("leaves the coming-soon tier to the footer note, not a locked group", () => {
    comingSoon = "expert"
    renderList()

    expect(screen.queryByText("journeys.tierNeed")).toBeNull()
    expect(screen.queryByText("journeys.tierLockedName difficulty.expert")).toBeNull()
    expect(screen.getByText("ui.tierComingSoon difficulty.expert")).toBeTruthy()
  })

  it("promises no coming-soon tier while another need still shuts it", () => {
    comingSoon = "expert"
    gateNeeds = [{ gate: { tier: "expert" }, key: "made-up-need", label: "Need a thing" }]
    renderList()

    expect(screen.queryByText("ui.tierComingSoon difficulty.expert")).toBeNull()
    expect(screen.getByText("Need a thing")).toBeTruthy()
  })
})
