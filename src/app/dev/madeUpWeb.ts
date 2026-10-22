// A web mode on a made-up tier, for the stories and specs: the real check and walk, on plain floors instead of the
// baked world.
import type { FloorConfig } from "@/game/siteTypes"
import { resolveWeb } from "@/game/webLine"
import type { WebWorld } from "@/game/webLine"
import { parseWeb } from "@/game/webNotation"
import { webReport } from "@/game/webReport"
import type { WebSimSource } from "@/game/webSimulation"
import { walkWeb } from "@/game/webWalk"
import type { SiteConfig } from "@/worldGen/types"
import { layWebDoors } from "@/worldGen/webPlacement"
import { webHost } from "./webHost"
import type { WebHost } from "./webHost"

/** A made-up web on `madeUpTier([4, 5, 6, 6])`: wizard_3 buried, levers across the tier, two keys opening seals. */
export const MADE_UP_WEB = `// designed by: nobody (made up)
[w1p1]
lever sun @end
[w1p3]
sand from 50%: 75% 100% by reed ankh
[w1p4]
feather opens 60%
[w2p2]
lever moon @45%
[w2p4]
lever lotus @60%
[w3]
sand by sun moon star lotus ibis djed
[w3p1]
lever reed @60% side
[w3p2]
key feather @50% side
[w3p4]
lever djed @20%
lever ankh @end
[w3p6]
key maat @end
[w4p3]
lever star @end
lever ibis @30% side
[w4p6]
maat opens 90%
`

/** A tier of `counts[N-1]` pyramids in wizard_N, each one floor of ten rooms with side sections after rooms 3 and 7. */
export const madeUpTier = (counts: readonly number[]): WebWorld => ({
  journeys: Object.fromEntries(
    counts.map((count, j) => [
      j + 1,
      Array.from({ length: count }, () => ({
        floors: [
          {
            rooms: Array.from({ length: 10 }, () => ({})),
            sections: [
              { address: "s0", after: 3, rooms: 2 },
              { address: "s1", after: 7, rooms: 2 },
            ],
          },
        ],
      })),
    ])
  ),
})

/** The made-up tier's authoring, each floor bare, for the web's doors to be laid on. */
const bareAuthoring = (world: WebWorld): Record<string, SiteConfig[]> =>
  Object.fromEntries(
    Object.entries(world.journeys).map(([j, pyramids]) => [
      `wizard_${j}`,
      pyramids.map(pyramid =>
        pyramid.floors.map(
          (floor, f, floors) =>
            ({
              pathPuzzles: floor.rooms.length - 1,
              exitOrStaircase: f === floors.length - 1 ? "exit" : "staircase",
              sideSections: [],
            }) as unknown as SiteConfig[number]
        )
      ),
    ])
  )

/** A host checking webs against a made-up tier: parsed, resolved, walked and reported as `yarn lock` does, without
 * the bake's placement. */
export const madeUpWebHost = (world: WebWorld): WebHost =>
  webHost((text, name) => {
    let web
    try {
      web = parseWeb(text, name)
    } catch (error) {
      return { text: `## ${name}\n\n✗ ${(error as Error).message}`, sound: false }
    }
    const resolved = resolveWeb(web, world)
    if (resolved.refusals.length > 0) return { text: webReport(resolved, undefined).text, sound: false }
    const walked = walkWeb(resolved)
    const simulate = (): WebSimSource => {
      const configs = bareAuthoring(world)
      layWebDoors(resolved, configs)
      return { resolved, walked, configs: configs as unknown as Record<string, FloorConfig[][]> }
    }
    return { ...webReport(resolved, walked), simulate }
  })
