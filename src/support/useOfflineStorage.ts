import type { SetStateAction } from "react"
import { useCallback, useEffect, useState } from "react"
import localForage from "localforage"

const isSetFunction = <T>(v: SetStateAction<T>): v is (prevValue: T) => T => typeof v === "function"

type Store = {
  getItem: <T>(key: string) => Promise<T | null>
  setItem: <T>(key: string, value: T) => Promise<T | null>
  removeItem: (key: string) => Promise<void>
  subscribe: <T>(key: string, callback: (value: T) => void) => VoidFunction
}

const stores = new Map<string, Store>()

const getStore = (storeName: string): Store => {
  const store = stores.get(storeName)
  if (!store) {
    const forage = localForage.createInstance({
      driver: [localForage.INDEXEDDB, localForage.LOCALSTORAGE],
      name: storeName,
    })
    let subscribers: { key: string; callback: <T>(newValue: T) => void }[] = []

    const newStore: Store = {
      getItem: async <T>(key: string) => forage.getItem<T>(key),
      setItem: async <T>(key: string, value: T) => {
        await forage.setItem<T>(key, value)
        subscribers.forEach(sub => {
          if (sub.key === key) {
            sub.callback(value)
          }
        })
        return value
      },
      removeItem: async key => {
        await forage.removeItem(key)
      },
      subscribe: <T>(key: string, callback: (value: T) => void) => {
        subscribers.push({ key, callback } as {
          key: string
          callback: <T>(value: T) => void
        })
        return () => {
          subscribers = subscribers.filter(sub => sub.callback !== callback)
        }
      },
    }

    stores.set(storeName, newStore)
    return newStore
  }
  return store
}

export const getOfflineValue = <T>(key: string, storeName = "defaultStore"): Promise<T | null> => {
  const store = getStore(storeName)
  return store.getItem<T>(key)
}

export const setOfflineValue = <T>(key: string, value: T, storeName = "defaultStore"): Promise<T | null> => {
  const store = getStore(storeName)
  return store.setItem<T>(key, value)
}

export const deleteOfflineValue = (key: string, storeName = "defaultStore"): Promise<void> => {
  const store = getStore(storeName)
  return store.removeItem(key)
}

export const useOfflineStorage = <T>(
  key: string,
  initialValue: T | (() => T),
  storeName = "defaultStore"
): [
  value: T,
  setValue: (value: SetStateAction<T>) => Promise<T>,
  loaded: boolean,
  deleteValue: (optimistic?: boolean) => Promise<void>,
] => {
  const [loaded, setLoaded] = useState(false)
  const [localState, setLocalState] = useState(
    typeof initialValue === "function" ? (initialValue as () => T)() : initialValue
  )
  const store = getStore(storeName)

  useEffect(() => {
    store
      .getItem<T>(key)
      .then(value => {
        if (value !== null) {
          setLocalState(current => {
            if (JSON.stringify(current) === JSON.stringify(value)) {
              return current // No change needed
            }
            return value
          })
        } else {
          if (initialValue !== null) {
            store.setItem<T>(key, typeof initialValue === "function" ? (initialValue as () => T)() : initialValue)
          }
        }
      })
      .then(() => {
        setLoaded(true)
      })
    return store.subscribe<T>(key, setLocalState)
  }, [initialValue, key, store])

  const setValue = useCallback(
    async (value: SetStateAction<T>) => {
      if (isSetFunction(value)) {
        const previousValue = await store.getItem<T>(key)
        const nextValue = value(previousValue ?? localState)
        setLocalState(nextValue) // Optimistic
        await store.setItem<T>(key, nextValue)
        setLocalState(nextValue)
        return nextValue
      } else {
        setLocalState(value) // Optimistic
        await store.setItem<T>(key, value)
        setLocalState(value)
        return value
      }
    },
    [key, localState, store]
  )

  const deleteValue = useCallback(
    async (optimistic = true) => {
      if (optimistic) {
        setLocalState(typeof initialValue === "function" ? (initialValue as () => T)() : initialValue)
      }
      await store.removeItem(key)
    },
    [key, initialValue, store]
  )

  return [localState, setValue, loaded, deleteValue]
}
