import type { SiteConfig } from "@/game/siteTypes"
import type { ShippedActivator, WebPulled } from "@/game/webKeys"

/** `web:<pot>#<k>`: the k-th door of a pot. A pot is named `w<N>p<M>` over pyramid M, or `w<N>` over the journey. */
const POT_KEY = /^web:(.+)#(\d+)$/
const PYRAMID_POT = /^w\d+p(\d+)$/

/** A door of a pot on the journey's main line: the pot, its number, and the line room it buries from. */
type Stop = { pot: string; door: number; room: number }

/** The stops of one pyramid's main floors, with rooms counted as the web line counts them: each main floor holds its
 * `pathPuzzles` rooms and its end room, and the floors after the exit are wings, off the line. A door at seam `s` buries
 * from room `s + 1` of its floor. A stop inside a lock has no seam in the authoring: it buries from its floor's first
 * room. */
const pyramidStops = (site: SiteConfig, offset: number): { stops: Stop[]; rooms: number } => {
  const exit = site.findIndex(floor => floor.exitOrStaircase === "exit")
  const stops: Stop[] = []
  let rooms = 0
  for (const floor of exit < 0 ? site : site.slice(0, exit + 1)) {
    const add = (key: string, room: number) => {
      const found = POT_KEY.exec(key)
      if (found) stops.push({ pot: found[1], door: Number(found[2]), room: offset + rooms + room })
    }
    for (const door of floor.webDoors ?? [])
      if ("seam" in door.at && !("section" in door.at)) add(door.key, door.at.seam + 1)
    for (const placed of floor.locks ?? [])
      for (const front of placed.web?.fronts ?? []) add(placed.web!.inputs[front.input], 0)
    rooms += floor.pathPuzzles + 1
  }
  return { stops, rooms }
}

/**
 * HOW MUCH OF A JOURNEY'S MAIN LINE STILL LIES BEHIND SAND, as a whole percent, given the levers pulled. A pot with c
 * of its levers pulled has its doors 1..c open; the sand lies from door c+1 to the end of the pot's line (its pyramid's
 * end, or the journey's). `opens` seals are not sand. Undefined when nothing is buried: no sand on the journey, or all
 * of it drawn off. Never 0% while anything is buried.
 */
export const journeyBuriedPercent = (
  sites: readonly SiteConfig[],
  activators: readonly ShippedActivator[],
  pulled: WebPulled
): number | undefined => {
  const stops: Stop[] = []
  const ends = new Map<number, number>()
  let total = 0
  sites.forEach((site, i) => {
    const read = pyramidStops(site, total)
    stops.push(...read.stops)
    total += read.rooms
    ends.set(i + 1, total)
  })
  let buried = 0
  for (const pot of new Set(stops.map(stop => stop.pot))) {
    const open = activators.filter(activator => activator.pots.includes(pot) && pulled[activator.name]).length
    const shut = stops.filter(stop => stop.pot === pot && stop.door > open)
    if (shut.length === 0) continue
    const pyramid = PYRAMID_POT.exec(pot)
    const end = pyramid ? (ends.get(Number(pyramid[1])) ?? total) : total
    buried += Math.max(0, end - Math.min(...shut.map(stop => stop.room)))
  }
  if (buried === 0 || total === 0) return undefined
  return Math.max(1, Math.round((buried / total) * 100))
}
