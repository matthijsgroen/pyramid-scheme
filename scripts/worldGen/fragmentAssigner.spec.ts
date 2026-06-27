import { describe, expect, it } from "vitest"
import { computeFragmentAssignments } from "./fragmentAssigner"
import type { ChestSlotPlan } from "./types"
import { chestCountFor } from "./data"

const totalSlots = (plan: ChestSlotPlan[]) => plan.reduce((s, p) => s + chestCountFor(p.pathPuzzles), 0)

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("computeFragmentAssignments", () => {
  it("places no more assignments than available slots", () => {
    const plan: ChestSlotPlan[] = [
      { journeyId: "starter_1", tier: "starter", pathPuzzles: 4 },
      { journeyId: "starter_2", tier: "starter", pathPuzzles: 4 },
    ]
    const assignments = computeFragmentAssignments(plan)
    expect(assignments.length).toBeLessThanOrEqual(totalSlots(plan))
  })

  it("never assigns the same hieroglyphId twice to the same journey", () => {
    // Enough slots to place everything
    const plan: ChestSlotPlan[] = [
      { journeyId: "starter_1", tier: "starter", pathPuzzles: 8 },
      { journeyId: "junior_1", tier: "junior", pathPuzzles: 8 },
      { journeyId: "expert_1", tier: "expert", pathPuzzles: 8 },
      { journeyId: "master_1", tier: "master", pathPuzzles: 8 },
      { journeyId: "wizard_1", tier: "wizard", pathPuzzles: 8 },
    ]
    const assignments = computeFragmentAssignments(plan)
    const seen = new Map<string, Set<string>>() // journeyId → hieroglyphIds
    for (const { journeyId, hieroglyphId } of assignments) {
      if (!seen.has(journeyId)) seen.set(journeyId, new Set())
      expect(seen.get(journeyId)!.has(hieroglyphId)).toBe(false)
      seen.get(journeyId)!.add(hieroglyphId)
    }
  })

  it("slot indices are within range for each journey", () => {
    const plan: ChestSlotPlan[] = [
      { journeyId: "j1", tier: "starter", pathPuzzles: 6 },
      { journeyId: "j2", tier: "starter", pathPuzzles: 6 },
    ]
    const j1Slots = chestCountFor(6)
    const assignments = computeFragmentAssignments(plan)
    for (const a of assignments.filter(a => a.journeyId === "j1")) {
      expect(a.slotIndex).toBeGreaterThanOrEqual(0)
      expect(a.slotIndex).toBeLessThan(j1Slots)
    }
  })

  it("is deterministic — same plan produces same assignments", () => {
    const plan: ChestSlotPlan[] = [
      { journeyId: "j1", tier: "expert", pathPuzzles: 6 },
      { journeyId: "j2", tier: "expert", pathPuzzles: 6 },
    ]
    const a1 = computeFragmentAssignments(plan)
    const a2 = computeFragmentAssignments(plan)
    expect(a1).toEqual(a2)
  })
})
