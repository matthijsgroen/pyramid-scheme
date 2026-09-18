import { useOfflineStorage, clearOfflineStore, readOfflineStore, writeOfflineStore } from "@/support/useOfflineStorage"

const GAME_STORE = "pyramid-scheme-store"

export const useGameStorage = <T>(key: string, initialValue: T | (() => T)) =>
  useOfflineStorage<T>(key, initialValue, GAME_STORE)

export const clearGameData = (): Promise<void> => clearOfflineStore(GAME_STORE)

export const readGameData = (): Promise<Record<string, unknown>> => readOfflineStore(GAME_STORE)

export const writeGameData = (data: Record<string, unknown>): Promise<void> => writeOfflineStore(data, GAME_STORE)
