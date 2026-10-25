import { useMemo } from "react"
import { useModState } from "@/app/state/useModState"
import type { CampFound } from "@/ui/atoms/campScene/campTypes"
import type { CampStepTable } from "@/mods/camp/game/campSteps"
import { CAMP_STEPS } from "@/mods/camp/game/campSteps"
import type { CampSave } from "@/mods/camp/game/campState"
import {
  campFound,
  comeHome,
  emptyCampSave,
  isCampSaveUsable,
  readCampSave,
  recordFind,
  recordPart,
  spotProgress,
  startedStructures,
  structureProgress,
  updateCampSave,
} from "@/mods/camp/game/campState"

export type CampProgressAPI = {
  // True once the camp's own save has been read.
  loaded: boolean
  // False while the save is unread or is one this build cannot read: nothing is recorded or announced then.
  usable: boolean
  save: CampSave
  found: CampFound
  recordFind: (step: string) => Promise<unknown>
  recordPart: (structure: string, part: string) => Promise<unknown>
  // The homecoming: bought steps whose purchase is held arrive, and the camp grows one stage.
  comeHome: (held: ReadonlySet<string>) => Promise<unknown>
  structureProgress: (structure: string) => { found: string[]; total: string[] }
  startedStructures: () => string[]
  spotProgress: (spot: string) => { found: number; total: number }
}

// The camp's own store. Every read goes through readCampSave, so a stored value of another shape shows as
// the empty camp; every change goes through updateCampSave, which leaves such a value untouched.
export const useCampProgress = (table: CampStepTable = CAMP_STEPS): CampProgressAPI => {
  const [stored, setStored, loaded] = useModState<unknown>("camp", emptyCampSave)

  return useMemo(() => {
    const save = readCampSave(stored)
    return {
      save,
      loaded,
      usable: loaded && isCampSaveUsable(stored),
      // The table's spot ids are the catalogue's spot ids; the agreement check holds the two together.
      found: campFound(save, table) as CampFound,
      recordFind: step => setStored((prev: unknown) => updateCampSave(prev, current => recordFind(current, step))),
      recordPart: (structure, part) =>
        setStored((prev: unknown) => updateCampSave(prev, current => recordPart(current, structure, part))),
      comeHome: held => setStored((prev: unknown) => updateCampSave(prev, current => comeHome(current, table, held))),
      structureProgress: structure => structureProgress(save, table, structure),
      startedStructures: () => startedStructures(save, table),
      spotProgress: spot => spotProgress(save, table, spot),
    }
  }, [stored, setStored, table, loaded])
}
