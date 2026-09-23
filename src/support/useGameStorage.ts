import {
  useOfflineStorage,
  clearOfflineStore,
  latestOfflineValue,
  primeOfflineValue,
  readOfflineStore,
  writeOfflineStore,
} from "@/support/useOfflineStorage"

const GAME_STORE = "pyramid-scheme-store"

export const useGameStorage = <T>(key: string, initialValue: T | (() => T)) =>
  useOfflineStorage<T>(key, initialValue, GAME_STORE)

/** The same value the hook above holds, read synchronously — see latestOfflineValue. */
export const latestGameValue = <T>(key: string): T | undefined => latestOfflineValue<T>(key, GAME_STORE)

/** Loads a key so `latestGameValue` can answer for it before any hook has mounted on it. */
export const primeGameValue = <T>(key: string): Promise<T | undefined> => primeOfflineValue<T>(key, GAME_STORE)

export const clearGameData = (): Promise<void> => clearOfflineStore(GAME_STORE)

export const readGameData = (): Promise<Record<string, unknown>> => readOfflineStore(GAME_STORE)

export const writeGameData = (data: Record<string, unknown>): Promise<void> => writeOfflineStore(data, GAME_STORE)
