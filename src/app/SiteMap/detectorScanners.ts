import { useMemo } from "react"
import type { CompassResult } from "@/game/siteTypes"

// How a mod plugs a target into the compass detector without core knowing the mod exists. A
// scanner is a HOOK (so it can read the mod's own state, e.g. useHieroglyphProgress) returning a
// function that, given a target id, yields the world locations still worth showing (e.g. a
// hieroglyph's uncollected fragment pieces). Core merges every registered scanner and names no
// reward type — the same seam shape as rewardContributions. See docs/mods/app-plugins-design.md.
export type CompassScanner = (target: string) => CompassResult[]
export type UseCompassScanner = () => CompassScanner

const registry: UseCompassScanner[] = []

export const registerCompassScanner = (useScanner: UseCompassScanner) => registry.push(useScanner)

// Calls each scanner hook in a fixed order (the registry is populated once at module load — each
// mod's app entrypoint pushes exactly once — so the hooks run in the same order every render,
// rules-of-hooks safe) and merges them into one scanner function.
export const useMergedCompassScanner = (): CompassScanner => {
  const scanners: CompassScanner[] = []
  for (const useScanner of registry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable registry order; see above
    scanners.push(useScanner())
  }
  return useMemo<CompassScanner>(
    () => target => scanners.flatMap(scan => scan(target)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fixed-length list of stable scanners
    scanners
  )
}
