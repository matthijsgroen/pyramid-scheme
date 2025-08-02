import { useCallback } from "react"
import { useGameStorage } from "@/support/useGameStorage"

export const useInventory = () => {
  // store inventory items in the offline storage
  const [inventory, setInventory] = useGameStorage<Record<string, number>>(
    "inventory",
    {}
  )

  return {
    inventory,
    addItem: useCallback(
      (id: string, count: number) => {
        setInventory((prev) => ({
          ...prev,
          [id]: (prev[id] || 0) + count,
        }))
      },
      [setInventory]
    ),
    removeItem: useCallback(
      (id: string, count: number) => {
        setInventory((prev) => {
          const currentCount = prev[id] || 0
          const newCount = Math.max(0, currentCount - count)

          return {
            ...prev,
            [id]: newCount,
          }
        })
      },
      [setInventory]
    ),
  }
}
