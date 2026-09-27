// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { FamilyContext } from "@/app/families/familyRegistry"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { markFor } from "@/game/mark"
import { HANDLE_SIDES, type MechanismRecord } from "@/game/siteTypes"
import { HandleComponent } from "./HandleComponent"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}|${Object.values(options).join(",")}` : key,
  }),
}))

afterEach(cleanup)

const ADDRESS = "s0#0/p1"

// One entry per driven section, each tagged with the side it opens on — the shape
// src/game/siteAssembler.ts writes for a real lever. The gate ids are never read by the component.
const mechanismFor = (driven: { side: string; section: string }[], initial: string): MechanismRecord => ({
  states: [...HANDLE_SIDES],
  initial,
  returnsToInitial: true,
  positions: driven.map(({ side, section }) => ({ state: side, gateKeyId: `handle:test:${section}` })),
})

const ctxWith = ({
  driven = [
    { side: "left", section: "vault" },
    { side: "right", section: "pocket" },
  ],
  initial = "left",
  current,
  setMechanismState = vi.fn(),
}: {
  driven?: { side: string; section: string }[]
  initial?: string
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
    mechanism: mechanismFor(driven, initial),
    mark: markFor(0),
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
  it("offers two sides and nothing else, however many sections the lever drives", () => {
    render(
      <HandleComponent
        {...ctxWith({
          driven: [
            { side: "left", section: "vault" },
            { side: "left", section: "pocket" },
            { side: "right", section: "deep" },
          ],
        })}
      />
    )
    expect(screen.getAllByRole("button").map(button => button.textContent)).toEqual([
      expect.stringContaining("handle.left"),
      expect.stringContaining("handle.right"),
      "ui.backToMap",
    ])
  })

  it("throws the lever to the side the player picks, and back again", () => {
    const setMechanismState = vi.fn()
    render(<HandleComponent {...ctxWith({ setMechanismState })} />)

    fireEvent.click(screen.getByRole("button", { name: /handle\.right/ }))
    expect(setMechanismState).toHaveBeenCalledWith("s0#0/p1", "right")

    fireEvent.click(screen.getByRole("button", { name: /handle\.left/ }))
    expect(setMechanismState).toHaveBeenCalledWith("s0#0/p1", "left")
  })

  it("shows which side the lever already hangs on", () => {
    render(<HandleComponent {...ctxWith({ current: "right" })} />)

    expect(screen.getByRole("button", { name: /handle\.right/ }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("button", { name: /handle\.left/ }).getAttribute("aria-pressed")).toBe("false")
  })

  // A lever always hangs somewhere, so a save with nothing stored for it reads as the side the floor
  // hung it on (mechanismDoors.ts's own default) — never as no side pressed at all.
  it("hangs on its initial side until the player throws it, not on the left by habit", () => {
    render(<HandleComponent {...ctxWith({ initial: "right" })} />)

    expect(screen.getByRole("button", { name: /handle\.right/ }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("button", { name: /handle\.left/ }).getAttribute("aria-pressed")).toBe("false")
  })

  /**
   * A driven section's authoring address is world-gen's vocabulary — "Open the way to s0.1" is a label
   * for the author, not for the player. What tells the doors apart on screen is the mark, so no button
   * may put an address on screen.
   */
  it("puts no section address on screen", () => {
    const { container } = render(
      <HandleComponent
        {...ctxWith({
          driven: [
            { side: "left", section: "vault" },
            { side: "right", section: "s0.1" },
          ],
        })}
      />
    )

    expect(container.textContent).not.toContain("vault")
    expect(container.textContent).not.toContain("s0.1")
  })

  it("wears the lever's own mark on both sides, the pair its doors wear on the map", () => {
    render(<HandleComponent {...ctxWith({})} />)

    const glyph = String.fromCodePoint(markFor(0).glyph)
    const worn = screen.getAllByRole("button").filter(button => button.textContent?.includes(glyph))
    expect(worn).toHaveLength(2)
  })
})
