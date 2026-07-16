// The compass's current hunt target (a hieroglyph id) lives with the owning mod so it persists and
// drops cleanly when the mod is off. Core reads it through this read-only seam and never names the
// mod — same discipline as detectorLevels.ts. The picker (Collection) writes via the mod's own hook;
// core only needs to read the target to drive the in-run scan/readout.
export type UseCompassTarget = () => string | null

let provider: UseCompassTarget | null = null

export const registerCompassTarget = (useTarget: UseCompassTarget) => {
  provider = useTarget
}

// Registered once at module load (mod entrypoint) or never — the branch is stable across renders,
// so calling the provider hook conditionally is rules-of-hooks safe (see detectorLevels.ts).
export const useCompassTarget = (): string | null => (provider ? provider() : null)
