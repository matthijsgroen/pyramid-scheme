import type { Formula, Operation } from "./generateRewardCalculation"

export type FormulaSettings = {
  numberRange: [min: number, max: number]
  operators: Operation[]
}

export type CompareLevelSettings = FormulaSettings & {
  compareAmount: number
}

export type Requirements = {
  digit: number
  largest: "always" | "never"
}

export type CompareLevel = {
  requirements: Requirements
  comparisons: {
    left: Formula
    right: Formula
  }[]
}

const createCompare = (
  settings: FormulaSettings,
  requirements: Requirements,
  random: () => number
) => {
  const left: Formula = {
    left: 10,
    right: 5,
    operation: "+",
    result: 15,
  }
  const right: Formula = {
    left: 10,
    right: 5,
    operation: "-",
    result: 5,
  }
  return { left, right }
}

export const generateCompareLevel = (
  compareSettings: CompareLevelSettings,
  requirements: Requirements,
  random = Math.random
) => {
  const result: CompareLevel = {
    requirements: requirements,
    comparisons: Array.from({ length: compareSettings.compareAmount })
      .fill(0)
      .map(() => createCompare(compareSettings, requirements, random)),
  }

  return result
}
