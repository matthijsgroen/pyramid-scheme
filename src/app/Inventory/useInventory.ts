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
    addItems: useCallback(
      (items: Record<string, number>) => {
        setInventory((prev) => {
          const newInventory = { ...prev }
          Object.entries(items).forEach(([id, count]) => {
            newInventory[id] = (newInventory[id] || 0) + count
          })
          return newInventory
        })
      },
      [setInventory]
    ),
    removeItems: useCallback(
      (items: Record<string, number>) => {
        setInventory((prev) => {
          const newInventory = { ...prev }
          Object.entries(items).forEach(([id, count]) => {
            const currentCount = newInventory[id] || 0
            newInventory[id] = Math.max(0, currentCount - count)
          })
          return newInventory
        })
      },
      [setInventory]
    ),
  }
}
