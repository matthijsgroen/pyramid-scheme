import type { TableauLevel } from "@/data/tableaus"
import type { RewardCalculation } from "@/game/generateRewardCalculation"
import type { FC } from "react"

export const TombPuzzle: FC<{
  tableau: TableauLevel
  calculation: RewardCalculation
}> = ({ tableau, calculation }) => {
  return (
    <div className="text-white flex-1 flex flex-col items-center justify-center">
      <p>Puzzle! {JSON.stringify(tableau, null, 2)}</p>
      <p>Calculation: {JSON.stringify(calculation, null, 2)}</p>
    </div>
  )
}
