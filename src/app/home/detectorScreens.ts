import type { FC } from "react"
import type { DetectorLevelMode, MergedDetectorLevels } from "@/app/SiteMap/detectorLevels"
import type { CampFound } from "@/ui/atoms/campScene/campTypes"

// Each detector's camp screen, owned by the detector's mod: the compass by hieroglyph, the corridor
// finder by core. The camp shows one Detectors screen with a tab per detector the player holds.
export type DetectorScreen = { title: (t: (key: string) => string) => string; Screen: FC }

const screens: Partial<Record<DetectorLevelMode, DetectorScreen>> = {}

export const registerDetectorScreen = (mode: DetectorLevelMode, screen: DetectorScreen) => {
  screens[mode] = screen
}

export const detectorScreen = (mode: DetectorLevelMode): DetectorScreen | undefined => screens[mode]

/** The map table's pieces each detector stands as in camp (`campCatalogue.ts`). */
export const DETECTOR_PIECES: Record<DetectorLevelMode, readonly string[]> = {
  compass: ["compassOnMap", "compass"],
  corridor: ["corridorFinder"],
}

/** The detectors with a part held and a screen to open, in tab order. */
export const heldDetectors = (levels: MergedDetectorLevels): DetectorLevelMode[] =>
  (["compass", "corridor"] as const).filter(mode => levels[mode] > 0 && screens[mode])

/** The camp's finds plus the detectors held: they stand at the map table from their first part. */
export const withDetectors = (found: CampFound, held: readonly DetectorLevelMode[]): CampFound =>
  held.length === 0
    ? found
    : { ...found, mapTable: [...(found.mapTable ?? []), ...held.flatMap(mode => DETECTOR_PIECES[mode])] }
