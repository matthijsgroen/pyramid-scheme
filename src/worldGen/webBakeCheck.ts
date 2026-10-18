// THE PLACED WEB CHECKED ON THE FLOORS THE BAKE PINNED (docs/instructions/sand-pyramid.md, "What the bake checks"):
// every place where it was placed, every web door shutting what it stands in front of, the web walk sound on the real
// floor states with its keys arriving, and the world solver agreeing with it.
import type { ResolveEncounter } from "../game/siteAssembler"
import type { FloorConfig, FloorGrid } from "../game/siteTypes"
import { webDoorLeaks, webSandKindRefusals } from "../game/webDoors"
import { pyramidName, resolveWeb } from "../game/webLine"
import { webReport } from "../game/webReport"
import { walkWeb, walkWebFloors } from "../game/webWalk"
import type { ReachabilitySupport } from "./reachability"
import type { SiteConfig } from "./types"
import { placementOf, readCarvedWorld, webJourneysOf } from "./webPlacement"
import type { WebPlacement } from "./webPlacement"
import { solveWeb, webAgreement } from "./webSolver"
import { carvedVisit } from "./webVisit"

export type PlacedWebCheck = { report: string; failures: string[] }

export const checkPlacedWeb = (
  placed: WebPlacement,
  configs: Record<string, SiteConfig[]>,
  gridOf: (journeyId: string, levelNr: number, floorIndex: number) => FloorGrid,
  support: ReachabilitySupport,
  resolveEncounter?: ResolveEncounter
): PlacedWebCheck => {
  const { web } = placed.resolved
  const failures: string[] = []
  const read = readCarvedWorld(configs, (id, levelNr, floorIndex) => gridOf(id, levelNr, floorIndex))
  const resolved = resolveWeb(web, read.world)

  // A re-carve that moved a stop, a door or an activator moved the web under the designer's feet.
  const now = placementOf(resolved, read)
  const moved = [
    ...placed.placement.filter(line => !now.includes(line)).map(line => `placed: ${line}`),
    ...now.filter(line => !placed.placement.includes(line)).map(line => `now:    ${line}`),
  ]
  if (moved.length > 0)
    failures.push(`the carve moved the web since it was placed, so bake again:\n  ${moved.join("\n  ")}`)

  const walked = resolved.refusals.length === 0 ? walkWeb(resolved, { visit: carvedVisit(read, resolved) }) : undefined
  const grids = Object.fromEntries(
    webJourneysOf(configs).map(([n, id]) => [id, (read.pyramids[n] ?? []).map(pyramid => [...pyramid.grids])])
  )
  const report = webReport(resolved, walked, walkWebFloors(web, grids))
  if (!report.sound) failures.push(`the web does not walk sound on the baked floors`)

  for (const [n, id] of webJourneysOf(configs))
    (read.pyramids[n] ?? []).forEach((pyramid, p) =>
      pyramid.grids.forEach((grid, f) => {
        for (const leak of webDoorLeaks(grid)) failures.push(`${id} pyramid ${p + 1} floor ${f}: ${leak}`)
      })
    )

  // One sand kind per site: a pyramid with web sand binds none of its locks' barriers to the floor's sand.
  for (const [, id] of webJourneysOf(configs))
    configs[id].forEach((pyramid, p) => {
      for (const refusal of webSandKindRefusals(pyramid as unknown as FloorConfig[]))
        if (refusal.type === "webSandKindMixed")
          failures.push(
            `${id} pyramid ${p + 1} floor ${refusal.floor}: web sand beside the floor's ${refusal.realisation}, bind its barriers to water`
          )
    })

  if (walked) {
    const names = resolved.activators.map(a => a.name)
    const pyramids = Object.entries(read.world.journeys).flatMap(([n, list]) =>
      list.map((_, p) => pyramidName({ journey: Number(n), pyramid: p + 1 }))
    )
    const solved = solveWeb(configs, names, support, undefined, resolveEncounter)
    for (const line of webAgreement(walked.closure, solved, names, pyramids))
      failures.push(`the solver and the web walk disagree: ${line}`)
  }
  return { report: report.text, failures }
}
