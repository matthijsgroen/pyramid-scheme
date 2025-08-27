import {
  createVerifiedFormula,
  type Formula,
  type Operation,
} from "../app/Formulas/formulas"

export type FormulaSettings = {
  numberOfSymbols: number
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

const generateFormula = (
  settings: FormulaSettings,
  random: () => number = Math.random
) => {
  const numbers = new Array(settings.numberOfSymbols)
    .fill(0)
    .map(
      () =>
        settings.numberRange[0] +
        Math.floor(
          random() * (settings.numberRange[1] - settings.numberRange[0] + 1)
        )
    )
  return createVerifiedFormula(numbers, settings.operators, random)
}

const createCompare = (
  settings: FormulaSettings,
  requirements: Requirements,
  random: () => number
) => {
  const biggerSide = random() < 0.5 ? "left" : "right"
  const generateSettings = { ...settings }
  // Create the left and right formulas
  let left = generateFormula(generateSettings, random)
  let right = generateFormula(generateSettings, random)

  const metRequirements = () => {
    let largestAsString = String(left.result)
    let smallestAsString = String(right.result)
    if (biggerSide === "left") {
      if (left.result <= right.result) return false
    } else {
      if (right.result <= left.result) return false
      largestAsString = String(right.result)
      smallestAsString = String(left.result)
    }
    if (requirements.largest === "always") {
      return (
        largestAsString.includes(String(requirements.digit)) &&
        !smallestAsString.includes(String(requirements.digit))
      )
    }
    return (
      smallestAsString.includes(String(requirements.digit)) &&
      !largestAsString.includes(String(requirements.digit))
    )
  }
  let iteration = 0
  while (!metRequirements()) {
    left = generateFormula(generateSettings, random)
    right = generateFormula(generateSettings, random)
    iteration++
    if (iteration > 50) {
      generateSettings.numberOfSymbols =
        settings.numberOfSymbols + Math.ceil((iteration - 40) / 10)
    }
    if (iteration > 100) {
      throw new Error("Failed to generate valid comparison")
    }
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
