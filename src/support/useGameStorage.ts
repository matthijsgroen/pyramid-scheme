import { useOfflineStorage, clearOfflineStore } from "@/support/useOfflineStorage"

const GAME_STORE = "pyramid-scheme-store"

export const useGameStorage = <T>(key: string, initialValue: T | (() => T)) =>
  useOfflineStorage<T>(key, initialValue, GAME_STORE)

export const clearGameData = (): Promise<void> => clearOfflineStore(GAME_STORE)
