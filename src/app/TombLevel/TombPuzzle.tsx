import type { Difficulty } from "@/data/difficultyLevels"
import { hieroglyphLevelColors } from "@/data/hieroglyphLevelColors"
import type { TableauLevel } from "@/data/tableaus"
import {
  type Formula,
  type RewardCalculation,
} from "@/game/generateRewardCalculation"
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

const FormulaPart: FC<{ formula: Formula }> = ({ formula }) => {
  return (
    <span>
      {typeof formula.left === "number" ? (
        <span className="inline-block p-2 bg-black/70 rounded">
          ?{/* {formula.left} */}
        </span>
      ) : (
        <FormulaPart formula={formula.left} />
      )}
      <span> {formula.operation} </span>
      {typeof formula.right === "number" ? (
        <span className="inline-block p-2 bg-black/70 rounded">
          ?{/* {formula.right} */}
        </span>
      ) : (
        <FormulaPart formula={formula.right} />
      )}
    </span>
  )
}

const Formula: FC<{ formula: Formula; showResult: boolean }> = ({
  formula,
  showResult,
}) => {
  return (
    <div>
      <FormulaPart formula={formula} /> ={" "}
      {showResult ? <span>{formula.result}</span> : <span>???</span>}
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
    <div className="text-white flex-1 flex flex-col items-center justify-center">
      <div
        className={clsx(
          "p-4 rounded-lg shadow-lg text-slate-500 flex flex-col gap-4",
          hieroglyphLevelColors[difficulty]
        )}
      >
        <h1 className="text-2xl text-center">
          {obfuscate(tableau.name, solvedPercentage)}
        </h1>
        {calculation.hintFormulas.map((formula, index) => (
          <div key={index} className="text-lg">
            <Formula formula={formula} showResult={true} />
          </div>
        ))}
        <div>
          <span className="text-2xl">
            <Formula formula={calculation.mainFormula} showResult={false} />
          </span>
        </div>
        <div>{obfuscate(tableau.description, solvedPercentage)}</div>
      </div>
      <button onClick={() => setSolvedPercentage((p) => p + 0.1)}>Solve</button>
    </div>
  )
}
