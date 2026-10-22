// A WEB CHECKED AGAINST THE LAST BAKE (docs/instructions/sand-pyramid.md, "What yarn lock <web> reports"): the wizard
// floors carved from `generatedWorld.ts` as the game carves them, the web placed on them as the bake places it, and the
// report `yarn lock <web>` prints. The Lock editor's web mode runs the same check in the browser and plays its pulls
// through on the walk it made.
import { generatedWorldConfigs } from "@/data/generatedWorld"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"
import { resolveWeb } from "@/game/webLine"
import { parseWeb } from "@/game/webNotation"
import type { Web } from "@/game/webNotation"
import { webReport } from "@/game/webReport"
import type { WebSimSource } from "@/game/webSimulation"
import { walkWeb } from "@/game/webWalk"
import type { SiteConfig } from "@/worldGen/types"
import { checkPlacedWeb } from "@/worldGen/webBakeCheck"
import { layWebDoors, placeWeb, webJourneysOf, withoutWeb } from "@/worldGen/webPlacement"
import { readWebWorld } from "@/worldGen/webWorld"
import type { CarvedPyramid, ReadWorld } from "@/worldGen/webWorld"
import { resolveEncounterMeta } from "./allFamilyMeta"
import { carveWorldFloor } from "./carveWorldFloor"
import { MOD_REACHABILITY_SUPPORT, MOD_WEB_ACTIVATOR } from "./registeredMods"

export type BakedWebWorld = ReadWorld & {
  grids: Record<string, FloorGrid[][]>
  pyramids: Record<number, CarvedPyramid[]>
}

/** The wizard journeys of the baked world, read as a web reads them, with their carved floors. */
export const bakedWebWorld = (): BakedWebWorld => {
  const pyramids: Record<number, CarvedPyramid[]> = {}
  const grids: Record<string, FloorGrid[][]> = {}
  for (const [journeyId, sites] of Object.entries(generatedWorldConfigs)) {
    const m = /^wizard_(\d+)$/.exec(journeyId)
    if (!m) continue
    grids[journeyId] = sites.map((site, p) =>
      site.map((config, f) => carveWorldFloor(journeyId, p + 1, f, config as FloorConfig))
    )
    pyramids[Number(m[1])] = sites.map((site, p) => ({
      configs: site as FloorConfig[],
      grids: grids[journeyId][p],
    }))
  }
  return { ...readWebWorld(pyramids), grids, pyramids }
}

/** The report `yarn lock <web>` prints, whether the web passes, whether it read at all, and, once every place
 * resolved, what to play its pulls through on. */
export type WebCheck = { text: string; sound: boolean; parsed: boolean; simulate?: () => WebSimSource }

/** The baked authoring in play's own types: withoutWeb's copy of generatedWorld.ts. */
const authored = (configs: Record<string, SiteConfig[]>) => configs as unknown as WebSimSource["configs"]

/** The baked web journeys with any web taken off: what a web is placed on afresh. A copy each call. */
const cleanConfigs = (): Record<string, SiteConfig[]> => {
  const marker = MOD_WEB_ACTIVATOR?.({ name: "", look: "lever", pots: [] }).type
  const wizard = Object.fromEntries(
    webJourneysOf(generatedWorldConfigs).map(([, id]) => [id, generatedWorldConfigs[id]])
  )
  return withoutWeb(structuredClone(wizard), reward => reward.type === marker)
}

/** Reads a web's text and checks it against the baked world: placed as the bake places it, its floors walked again
 * with the doors laid. A web that cannot be placed is still played through, on the walk that refused it. */
export const checkWeb = (text: string, name: string, baked: BakedWebWorld): WebCheck => {
  let web: Web
  try {
    web = parseWeb(text, name)
  } catch (error) {
    return { text: `## ${name}\n\n✗ ${(error as Error).message}`, sound: false, parsed: false }
  }
  const resolved = resolveWeb(web, baked.world)
  if (resolved.refusals.length > 0) return { text: webReport(resolved, undefined).text, sound: false, parsed: true }
  if (!MOD_WEB_ACTIVATOR) return { text: "✗ no registered mod realises a web's activators", sound: false, parsed: true }

  const configs = cleanConfigs()
  const displaced: string[] = []
  const unplaced = (): WebSimSource => {
    const laid = cleanConfigs()
    layWebDoors(resolved, laid)
    return { resolved, walked: walkWeb(resolved), configs: authored(laid) }
  }
  let placed
  try {
    placed = placeWeb(web, configs, (id, levelNr, f) => baked.grids[id][levelNr - 1][f], MOD_WEB_ACTIVATOR, {
      displaces: line => displaced.push(line),
    })
  } catch (error) {
    return { text: (error as Error).message, sound: false, parsed: true, simulate: unplaced }
  }
  const checked = checkPlacedWeb(
    placed,
    configs,
    (journeyId, levelNr, floorIndex) =>
      carveWorldFloor(journeyId, levelNr, floorIndex, configs[journeyId][levelNr - 1][floorIndex] as FloorConfig),
    MOD_REACHABILITY_SUPPORT,
    resolveEncounterMeta
  )
  const { walked } = checked
  return {
    text: [
      checked.report,
      ...checked.failures.map(failure => `✗ ${failure}`),
      ...(displaced.length > 0 ? ["displaced, the bake places it again:", ...displaced.map(line => `  ${line}`)] : []),
    ].join("\n"),
    sound: checked.failures.length === 0,
    parsed: true,
    simulate: () => (walked ? { resolved: checked.resolved, walked, configs: authored(configs) } : unplaced()),
  }
}
