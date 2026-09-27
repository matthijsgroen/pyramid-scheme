// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { FamilyContext } from "@/app/families/familyRegistry"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { MECHANISM_AT_REST } from "@/app/state/useJourneys"
import type { MechanismRecord } from "@/game/siteTypes"
import { HandleComponent } from "./HandleComponent"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { section?: string }) => (options?.section ? `${key}|${options.section}` : key),
  }),
}))

afterEach(cleanup)

const ADDRESS = "s0#0/p1"

// One driven position per name, each keyed by its own gate — the shape src/game/siteAssembler.ts (Task
// 3) writes for a real lever. The gate ids are never read by the component; only `state` is.
const mechanismFor = (positions: string[]): MechanismRecord => ({
  positions: positions.map(state => ({ state, gateKeyId: `handle:test:${state}` })),
  restReachable: true,
})

const ctxWith = ({
  positions,
  current,
  setMechanismState = vi.fn(),
}: {
  positions: string[]
  current?: string
  setMechanismState?: (address: string, stateId: string) => void
}) => {
  const states = new Map<string, string>(current !== undefined ? [[ADDRESS, current]] : [])
  const journeys = {
    getMechanismStates: () => states,
    setMechanismState,
  } as unknown as JourneyAPI
  const ctx: FamilyContext = {
    journeyId: "j1",
    levelNr: 1,
    edgeId: "0:0,1",
    address: ADDRESS,
    sectionHash: "s0",
    freshArrival: true,
    mechanism: mechanismFor(positions),
  }
  return {
    ctx,
    journeys,
    puzzle: { satisfied: true },
    progression: undefined as never,
    inventory: undefined as never,
    applyReward: vi.fn(),
    onSolved: vi.fn(),
    onCancel: vi.fn(),
  }
}

describe("HandleComponent", () => {
  it("throws the lever to the position the player picks, and back to rest", () => {
    const setMechanismState = vi.fn()
    render(<HandleComponent {...ctxWith({ positions: ["vault", "pocket"], setMechanismState })} />)

    fireEvent.click(screen.getByRole("button", { name: /vault/i }))
    expect(setMechanismState).toHaveBeenCalledWith("s0#0/p1", "vault")

    fireEvent.click(screen.getByRole("button", { name: /rest/i }))
    expect(setMechanismState).toHaveBeenCalledWith("s0#0/p1", MECHANISM_AT_REST)
  })

  it("shows which position the lever already stands in", () => {
    render(<HandleComponent {...ctxWith({ positions: ["vault", "pocket"], current: "pocket" })} />)

    expect(screen.getByRole("button", { name: /pocket/i }).getAttribute("aria-pressed")).toBe("true")
  })

  // Read with nothing ever thrown reads as "rest" (mechanismDoors.ts/floorLock.ts's own default), so a
  // lever nobody has touched offers rest already pressed rather than no button pressed at all.
  it("stands at rest until the player throws it, never at an unpicked position", () => {
    render(<HandleComponent {...ctxWith({ positions: ["vault", "pocket"] })} />)

    expect(screen.getByRole("button", { name: /rest/i }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("button", { name: /vault/i }).getAttribute("aria-pressed")).toBe("false")
  })
})
