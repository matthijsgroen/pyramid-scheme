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

// How the target is SHOWN (e.g. a hieroglyph id → its glyph), so the readout can say "looking for
// 𓎗" without core naming the owning mod's symbol table.
//
// Deliberately a SECOND seam rather than widening UseCompassTarget to return `{id, symbol}`:
// useDetector memoises the whole-world scan on the target value, and that memo is only stable
// because the target is a persisted string. A seam handing back a fresh object each render would
// invalidate it every render — rescanning every journey continuously, and at level 3 reassembling
// floors while doing it. Keep the scan key a bare string; label separately.
export type UseCompassTargetLabel = () => (id: string) => string

let labelProvider: UseCompassTargetLabel | null = null

export const registerCompassTargetLabel = (useLabel: UseCompassTargetLabel) => {
  labelProvider = useLabel
}

// Unregistered (mod off) → identity, so a readout degrades to the raw id rather than going blank.
export const useCompassTargetLabel = (): ((id: string) => string) =>
  labelProvider ? labelProvider() : (id: string) => id
