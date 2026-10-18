import type { SiteConfig } from "@/game/siteTypes"
import type { ShippedActivator, WebPulled } from "@/game/webKeys"

const POT_KEY = /^web:(.+)#\d+$/

/** The pots a journey's web doors count in: the `<pot>` of every `web:<pot>#n` key its pyramids' doors and lock
 * inputs ask for. */
const journeyPots = (sites: readonly SiteConfig[]): string[] => [
  ...new Set(
    sites.flatMap(site =>
      site.flatMap(floor =>
        [
          ...(floor.webDoors ?? []).map(door => door.key),
          ...(floor.locks ?? []).flatMap(placed => Object.values(placed.web?.inputs ?? {})),
        ].flatMap(key => POT_KEY.exec(key)?.slice(1, 2) ?? [])
      )
    )
  ),
]

/** How many of the levers counting in a journey's pots are pulled, and how many there are. Undefined when its doors
 * count in no pot. */
export const journeyPulls = (
  sites: readonly SiteConfig[],
  activators: readonly ShippedActivator[],
  pulled: WebPulled
): { pulled: number; total: number } | undefined => {
  const pots = new Set(journeyPots(sites))
  if (pots.size === 0) return undefined
  const counting = activators.filter(activator => activator.pots.some(pot => pots.has(pot)))
  return { pulled: counting.filter(activator => pulled[activator.name]).length, total: counting.length }
}
