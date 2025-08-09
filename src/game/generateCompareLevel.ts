import type { Formula, Operation } from "./generateRewardCalculation"

export type CompareLevelSettings = {
  numberRange: [min: number, max: number]
  operators: Operation[]
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

export const generateCompareLevel = (
  compareSettings: CompareLevelSettings,
  requirements: Requirements,
  random = Math.random
) => {}
