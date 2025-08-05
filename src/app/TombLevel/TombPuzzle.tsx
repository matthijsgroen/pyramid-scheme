import type { Difficulty } from "@/data/difficultyLevels"
import { hieroglyphLevelColors } from "@/data/hieroglyphLevelColors"
import type { TableauLevel } from "@/data/tableaus"
import {
  type Formula,
  type RewardCalculation,
} from "@/game/generateRewardCalculation"
import { HieroglyphTile } from "@/ui/HieroglyphTile"
import { clsx } from "clsx"
import { useState, type FC } from "react"

const obfuscate = (text: string, percentage: number): string => {
  // replace characters with ? based on a noise pattern for natural reveal
  if (percentage === undefined || percentage <= 0) {
    return text.replace(/[a-zA-Z]/g, "?")
  }
  if (percentage >= 1) {
    return text
  }

  // Simple pseudo-random number generator for consistent results
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
  }

  // Create a seed based on the text content for consistency
  const textSeed = text.split("").reduce((acc, char, index) => {
    return acc + char.charCodeAt(0) * (index + 1)
  }, 0)

  let letterIndex = 0
  const obfuscatedText = text.split("").map((char, charIndex) => {
    if (/[a-zA-Z]/.test(char)) {
      // Generate a consistent pseudo-random value for this letter position
      const randomValue = seededRandom(textSeed + letterIndex + charIndex)
      const shouldObfuscate = randomValue > percentage
      letterIndex++
      return shouldObfuscate ? "?" : char
    }
    return char
  })
  return obfuscatedText.join("")
}

const FormulaPart: FC<{ formula: Formula; difficulty: Difficulty }> = ({
  formula,
  difficulty,
}) => {
  return (
    <span>
      {typeof formula.left === "number" ? (
        <HieroglyphTile
          empty
          difficulty={difficulty}
          size="sm"
          className="inline-block align-middle"
        />
      ) : (
        <FormulaPart formula={formula.left} difficulty={difficulty} />
      )}
      <span> {formula.operation} </span>
      {typeof formula.right === "number" ? (
        <HieroglyphTile
          empty
          difficulty={difficulty}
          size="sm"
          className="inline-block align-middle"
        />
      ) : (
        <FormulaPart formula={formula.right} difficulty={difficulty} />
      )}
    </span>
  )
}

const Formula: FC<{
  formula: Formula
  showResult: boolean
  difficulty: Difficulty
}> = ({ formula, showResult, difficulty }) => {
  return (
    <div>
      <FormulaPart formula={formula} difficulty={difficulty} /> ={" "}
      {showResult ? <span>{formula.result}</span> : "??"}
    </div>
  )
}

export const TombPuzzle: FC<{
  tableau: TableauLevel
  calculation: RewardCalculation
  difficulty: Difficulty
}> = ({ tableau, calculation, difficulty }) => {
  const [solvedPercentage, setSolvedPercentage] = useState(0.0) // Example percentage, adjust as needed

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-white">
      <div
        className={clsx(
          "flex flex-col gap-4 rounded-lg p-4 text-slate-500 shadow-lg",
          hieroglyphLevelColors[difficulty]
        )}
      >
        <h1 className="text-center text-2xl">
          {obfuscate(tableau.name, solvedPercentage)}
        </h1>
        {calculation.hintFormulas.map((formula, index) => (
          <div key={index} className="text-lg">
            <Formula
              formula={formula}
              showResult={true}
              difficulty={difficulty}
            />
          </div>
        ))}
        <div>
          <span className="text-2xl">
            <Formula
              formula={calculation.mainFormula}
              showResult={false}
              difficulty={difficulty}
            />
          </span>
        </div>
        <div>{obfuscate(tableau.description, solvedPercentage)}</div>
      </div>
      <button onClick={() => setSolvedPercentage((p) => p + 0.1)}>Solve</button>
    </div>
  )
}
