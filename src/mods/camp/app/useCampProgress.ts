import { useMemo } from "react"
import { useModState } from "@/app/state/useModState"
import type { CampFound } from "@/ui/atoms/campScene/campTypes"
import type { CampStepTable } from "@/mods/camp/game/campSteps"
import { CAMP_STEPS } from "@/mods/camp/game/campSteps"
import type { CampSave } from "@/mods/camp/game/campState"
import {
  campFound,
  emptyCampSave,
  growCamp,
  readCampSave,
  recordFind,
  recordPart,
  spotProgress,
  startedStructures,
  structureProgress,
  updateCampSave,
} from "@/mods/camp/game/campState"

export type CampProgressAPI = {
  save: CampSave
  found: CampFound
  recordFind: (step: string) => Promise<unknown>
  recordPart: (structure: string, part: string) => Promise<unknown>
  grow: () => Promise<unknown>
  structureProgress: (structure: string) => { found: string[]; total: string[] }
  startedStructures: () => string[]
  spotProgress: (spot: string) => { found: number; total: number }
}

// The camp's own store. Every read goes through readCampSave, so a stored value of another shape shows as
// the empty camp; every change goes through updateCampSave, which leaves such a value untouched.
export const useCampProgress = (table: CampStepTable = CAMP_STEPS): CampProgressAPI => {
  const [stored, setStored] = useModState<unknown>("camp", emptyCampSave)

  return useMemo(() => {
    const save = readCampSave(stored)
    return {
      save,
      // The table's spot ids are the catalogue's spot ids; the agreement check holds the two together.
      found: campFound(save, table) as CampFound,
      recordFind: step => setStored((prev: unknown) => updateCampSave(prev, current => recordFind(current, step))),
      recordPart: (structure, part) =>
        setStored((prev: unknown) => updateCampSave(prev, current => recordPart(current, structure, part))),
      grow: () => setStored((prev: unknown) => updateCampSave(prev, current => growCamp(current, table))),
      structureProgress: structure => structureProgress(save, table, structure),
      startedStructures: () => startedStructures(save, table),
      spotProgress: spot => spotProgress(save, table, spot),
    }
  }, [stored, setStored, table])
}
