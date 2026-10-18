// Made-up worlds for the web specs: floors of plain rooms, sections and locks written in a line each.
import { parseLock } from "./lockNotation"
import type { Lock } from "./lockAuthoring"
import { resolveWeb } from "./webLine"
import type { ResolvedWeb, WebFloor, WebPyramid, WebSection, WebWorld } from "./webLine"
import { parseWeb } from "./webNotation"

/** A floor of `rooms` main rooms; `regions` names the lock region each room stands in, by index. */
export const floor = (
  rooms: number,
  extra: Partial<WebFloor> & { regions?: (string | undefined)[] } = {}
): WebFloor => {
  const { regions, ...rest } = extra
  return {
    rooms: Array.from({ length: rooms }, (_, i) => (regions?.[i] ? { region: regions[i] } : {})),
    sections: [],
    ...rest,
  }
}

export const section = (address: string, after: number, rooms = 2, extra: Partial<WebSection> = {}): WebSection => ({
  address,
  after,
  rooms,
  ...extra,
})

export const pyramid = (...floors: WebFloor[]): WebPyramid => ({ floors })

/** A pyramid of one plain floor. */
export const plain = (rooms: number): WebPyramid => pyramid(floor(rooms))

export const world = (journeys: Record<number, WebPyramid[]>): WebWorld => ({ journeys })

export const lockOf = (...lines: string[]): Lock => parseLock(lines.join("\n"), "made").lock

export const resolve = (text: string, on: WebWorld): ResolvedWeb => resolveWeb(parseWeb(text, "made.web"), on)

export const refusalTypes = (resolved: ResolvedWeb) => resolved.refusals.map(r => r.type)
