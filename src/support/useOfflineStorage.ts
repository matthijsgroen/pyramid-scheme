import type { SetStateAction } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import localForage from "localforage"

const isSetFunction = <T>(v: SetStateAction<T>): v is (prevValue: T) => T => typeof v === "function"

type Store = {
  getItem: <T>(key: string) => Promise<T | null>
  setItem: <T>(key: string, value: T) => Promise<T | null>
  removeItem: (key: string) => Promise<void>
  clear: () => Promise<void>
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
      clear: async () => {
        await forage.clear()
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

export const clearOfflineStore = (storeName = "defaultStore"): Promise<void> => {
  const store = getStore(storeName)
  return store.clear()
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
  // Ref always holds the latest value so multiple synchronous setValue(fn)
  // calls chain correctly without waiting for a re-render or async DB read.
  const localStateRef = useRef(localState)
  localStateRef.current = localState
  // Only read on first load — the hook treats it as a mount-time seed. Kept in a ref so callers
  // can keep passing fresh `[]`/`{}` literals without re-running the load effect on every render
  // (which would re-issue getItem and hand setValue a perpetually unresolved load promise).
  const initialValueRef = useRef(initialValue)
  initialValueRef.current = initialValue
  // Resolves once this instance's own initial read of `key` has landed (or been seeded).
  // setValue awaits it first so a write that races the load never computes its next value
  // from the pre-load default and clobbers whatever another instance already persisted.
  const loadPromiseRef = useRef<Promise<void> | null>(null)
  // Bumped whenever a newer value is applied — by this instance writing, or by another instance's
  // write arriving through the subscription. The initial read captures it before starting; if it
  // moved by the time that read resolves, the value it carries is older than what's already
  // applied and must be dropped. Otherwise it rolls `localStateRef` back, and the ref is exactly
  // what the next setValue(fn) computes from — so the superseded value would be written back out.
  const stateVersionRef = useRef(0)

  useEffect(() => {
    const readAtVersion = stateVersionRef.current
    loadPromiseRef.current = store
      .getItem<T>(key)
      .then(value => {
        if (stateVersionRef.current !== readAtVersion) return
        if (value !== null) {
          localStateRef.current = value
          setLocalState(current => {
            if (JSON.stringify(current) === JSON.stringify(value)) {
              return current // No change needed
            }
            return value
          })
        } else {
          const initial = initialValueRef.current
          if (initial !== null) {
            const resolvedInitial = typeof initial === "function" ? (initial as () => T)() : initial
            localStateRef.current = resolvedInitial
            store.setItem<T>(key, resolvedInitial)
          }
        }
      })
      .catch(() => {
        // A failed read must not leave every later setValue awaiting a rejected promise.
      })
      .then(() => {
        setLoaded(true)
      })
    return store.subscribe<T>(key, value => {
      stateVersionRef.current += 1
      localStateRef.current = value
      setLocalState(value)
    })
  }, [key, store])

  const setValue = useCallback(
    async (value: SetStateAction<T>) => {
      if (loadPromiseRef.current) await loadPromiseRef.current
      stateVersionRef.current += 1
      if (isSetFunction(value)) {
        // Compute next value from the ref (always up-to-date) and update the
        // ref synchronously so chained calls each see the previous result.
        const nextValue = value(localStateRef.current)
        localStateRef.current = nextValue
        setLocalState(nextValue)
        await store.setItem<T>(key, nextValue)
        return nextValue
      } else {
        localStateRef.current = value as T
        setLocalState(value)
        await store.setItem<T>(key, value)
        return value
      }
    },
    [key, store]
  )

  const deleteValue = useCallback(
    async (optimistic = true) => {
      stateVersionRef.current += 1
      if (optimistic) {
        const initial = initialValueRef.current
        const resolvedInitial = typeof initial === "function" ? (initial as () => T)() : initial
        localStateRef.current = resolvedInitial
        setLocalState(resolvedInitial)
      }
      await store.removeItem(key)
    },
    [key, store]
  )

  return [localState, setValue, loaded, deleteValue]
}
