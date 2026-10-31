// The two detector modes and their owning mods (see collection-and-detector-design.md §7.1):
// compass←hieroglyph, corridor←core. Each owner registers a hook that reads its own
// perk level; core reads the merged accessor and names no mod. Same seam shape as keyProviders.ts.
export type DetectorLevelMode = "compass" | "corridor"
export type UseDetectorLevel = () => number

const registry: Partial<Record<DetectorLevelMode, UseDetectorLevel>> = {}

export const registerDetectorLevel = (mode: DetectorLevelMode, useLevel: UseDetectorLevel) => {
  registry[mode] = useLevel
}

export type MergedDetectorLevels = { compass: number; corridor: number }

// Reads each mode's level from its registered owner (or 0 if no mod owns it — mod toggled off). The
// registry is populated once at module load, so a given mode is either always registered or never:
// the branch each render is stable, rules-of-hooks safe (same discipline as keyProviders.ts).
export const useMergedDetectorLevels = (): MergedDetectorLevels => ({
  compass: registry.compass ? registry.compass() : 0,
  corridor: registry.corridor ? registry.corridor() : 0,
})
