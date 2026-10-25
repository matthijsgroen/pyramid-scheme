import type { CampStepTable } from "../game/campSteps"
import type { CampCatalogue } from "@/ui/atoms/campScene/campTypes"

// The ui catalogue keeps the art placement and each step's `chapter` (the camera's framing); the mod's
// table is the source of a step's tier and source. This names every way the two have drifted apart.
export const campCatalogueMismatches = (table: CampStepTable, catalogue: CampCatalogue): string[] => {
  const mismatches: string[] = []
  const inCatalogue = new Map(
    catalogue.spots.flatMap(spot => spot.steps.map(step => [step.pieces[0].id, { spot: spot.id, step }] as const))
  )
  const inTable = new Map(table.map(entry => [entry.id, entry]))
  for (const id of inCatalogue.keys())
    if (!inTable.has(id)) mismatches.push(`catalogue step "${id}" has no table entry`)
  for (const entry of table) {
    const found = inCatalogue.get(entry.id)
    if (!found) {
      mismatches.push(`table step "${entry.id}" has no catalogue step`)
      continue
    }
    if (found.spot !== entry.spot)
      mismatches.push(`step "${entry.id}" is in spot "${entry.spot}" in the table, "${found.spot}" in the catalogue`)
    if (found.step.chapter !== entry.tier)
      mismatches.push(`step "${entry.id}" is ${entry.tier} in the table, ${found.step.chapter} in the catalogue`)
    if ((found.step.given === true) !== (entry.source === "given"))
      mismatches.push(`step "${entry.id}" disagrees on being given`)
  }
  return mismatches
}
