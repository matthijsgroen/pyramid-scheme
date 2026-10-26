import { describe, expect, it } from "vitest"
import { stageHolds } from "./layoutPicker"

const first = { outsideLock: [4] }
const later = { outsideLock: [3, 4] }

describe("stageHolds", () => {
  it("lets a pin at the first stage be verified with no ledger entry", () => {
    expect(stageHolds({ outsideLock: [4] }, first, undefined, "h")).toBe(true)
  })

  it("lets a later-stage pin be verified while the ledger found it there for the same authoring", () => {
    expect(stageHolds(later, first, { kind: "sidePaths", hash: "h", sidePaths: later }, "h")).toBe(true)
  })

  it("searches a later-stage pin again once the authoring hash moves", () => {
    expect(stageHolds(later, first, { kind: "sidePaths", hash: "old", sidePaths: later }, "h")).toBe(false)
  })

  it("searches a later-stage pin again when the ledger names another stage or none", () => {
    expect(
      stageHolds(
        later,
        first,
        { kind: "sidePaths", hash: "h", sidePaths: { outsideLock: [4], corridorsTakeTwo: true } },
        "h"
      )
    ).toBe(false)
    expect(stageHolds(later, first, undefined, "h")).toBe(false)
  })

  it("tells two to a corridor apart from one to a corridor at the same outside sections", () => {
    const doubled = { outsideLock: [4], corridorsTakeTwo: true as const }
    expect(stageHolds(doubled, first, undefined, "h")).toBe(false)
  })
})
