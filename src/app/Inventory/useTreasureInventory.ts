import { useCallback } from "react"
import { useGameStorage } from "@/support/useGameStorage"

export const useTreasureInventory = () => {
  // store treasure items in the offline storage
  const [treasures, setTreasures] = useGameStorage<Record<string, number>>(
    "treasures",
    {}
  )

  return {
    treasures,
    addTreasure: useCallback(
      (id: string, count: number) => {
        setTreasures((prev) => ({
          ...prev,
          [id]: (prev[id] || 0) + count,
        }))
      },
      [setTreasures]
    ),
    removeTreasure: useCallback(
      (id: string, count: number) => {
        setTreasures((prev) => {
          const currentCount = prev[id] || 0
          const newCount = Math.max(0, currentCount - count)

          return {
            ...prev,
            [id]: newCount,
          }
        })
      },
      [setTreasures]
    ),
  }
}
