import type { TombLevelSettings } from "./generateRewardCalculation"

// One tomb's authored tableau shape: how many symbols a tableau holds, and the arithmetic it asks.
export type TombFormula = TombLevelSettings & { symbolCount: number }

// The arithmetic each tomb asks for: how wide its numbers run, which operators it may use, and how
// large a multiplication may get. Authored per tomb because a tier's later tombs ask harder sums
// than its first — a room's own escalation then ramps within the tomb (see
// buildTombCalculationSettings). Sits beside objectsForStories, the tableau's other authored half.
export const TOMB_FORMULA: Record<string, TombFormula> = {
  starter_treasure_tomb: {
    symbolCount: 2,
    numberRange: [1, 6],
    operators: ["+"],
  },
  junior_treasure_tomb: {
    symbolCount: 3,
    numberRange: [1, 10],
    operators: ["+", "-"],
  },
  expert_treasure_tomb: {
    symbolCount: 4,
    numberRange: [1, 10],
    operators: ["+", "-", "*"],
    maxMultiplyOperandResult: 5,
  },
  expert_treasure_tomb_b: {
    symbolCount: 4,
    numberRange: [2, 12],
    operators: ["+", "-", "*"],
    maxMultiplyOperandResult: 6,
  },
  master_treasure_tomb: {
    symbolCount: 4,
    numberRange: [1, 10],
    operators: ["+", "-", "*", "/"],
    maxMultiplyOperandResult: 10,
  },
  master_treasure_tomb_b: {
    symbolCount: 5,
    numberRange: [1, 12],
    operators: ["+", "-", "*", "/"],
    maxMultiplyOperandResult: 10,
  },
  wizard_treasure_tomb: {
    symbolCount: 5,
    numberRange: [1, 15],
    operators: ["+", "-", "*", "/"],
    maxMultiplyOperandResult: 12,
  },
  wizard_treasure_tomb_b: {
    symbolCount: 5,
    numberRange: [2, 18],
    operators: ["+", "-", "*", "/"],
    maxMultiplyOperandResult: 14,
  },
  wizard_treasure_tomb_c: {
    symbolCount: 5,
    numberRange: [3, 20],
    operators: ["+", "-", "*", "/"],
    maxMultiplyOperandResult: 15,
  },
}

// Falls back to the gentlest authored shape for a tomb with none, so a preview never renders on
// undefined settings.
export const tombFormulaFor = (tombId: string): TombFormula =>
  TOMB_FORMULA[tombId] ?? TOMB_FORMULA.starter_treasure_tomb
