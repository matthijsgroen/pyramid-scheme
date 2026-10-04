import { assembleFloor } from "./siteAssembler"
import type { AssemblerResult, FloorConfig } from "./siteTypes"

// Assembles a floor the way the journey inspector shows it: the pyramid's seed plus the floor index, with no resolvers.
export const assembleInspectedFloor = (
  journeyId: string,
  floorConfig: FloorConfig,
  pyramidSeed: number,
  floorIndex: number
): AssemblerResult => assembleFloor(journeyId, floorConfig, pyramidSeed + floorIndex)
