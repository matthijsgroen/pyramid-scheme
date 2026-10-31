// What a mod does each time the home shows: a hook, so it can read the mod's own state (a reminder, a nudge).
// The registry is filled once at module load, so the hooks run in the same order every render.
export type UseHomeHook = () => void

const registry: UseHomeHook[] = []

export const registerHomeHook = (useHook: UseHomeHook) => registry.push(useHook)

export const useHomeHooks = (): void => {
  for (const useHook of registry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable registry order; see above
    useHook()
  }
}
