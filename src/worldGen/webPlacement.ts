// THE WEB PLACED ON THE WORLD (docs/instructions/sand-pyramid.md, "What the bake checks"): the tier's web read against
// its carved floors, refused unless it walks sound, then written onto the authoring as web doors, bound lock inputs and
// activators standing in reward slots. Nothing here carves: the carve is handed in, and a web door moves no wall.
import type { FloorConfig as GameFloorConfig, FloorGrid } from "../game/siteTypes"
import type { WebDoorPlacement, WebFront } from "../game/webDoors"
import { describeWhere, pyramidName, resolveWeb } from "../game/webLine"
import type { PyramidRef, ResolvedWeb, WebDoor } from "../game/webLine"
import type { Web, WebLook } from "../game/webNotation"
import { webReport } from "../game/webReport"
import { walkWeb } from "../game/webWalk"
import type { WebWalkOptions, WebWalk } from "../game/webWalk"
import type { SiteConfig, TreasureReward } from "./types"
import { describeSlot, readWebWorld, slotOf } from "./webWorld"
import type { CarvedPyramid, ReadWorld } from "./webWorld"

/** Carves one floor of the world as play carves it. */
export type CarveFloor = (journeyId: string, levelNr: number, floorIndex: number, config: GameFloorConfig) => FloorGrid

/** The reward a web activator stands as, from the mod that realises it. */
export type WebActivatorReward = (activator: { name: string; look: WebLook; pots: string[] }) => TreasureReward

/** The web journeys of a world: `wizard_N` by N. */
export const webJourneysOf = (configs: Record<string, SiteConfig[]>): [number, string][] =>
  Object.keys(configs).flatMap(id => {
    const m = /^wizard_(\d+)$/.exec(id)
    return m ? [[Number(m[1]), id] as [number, string]] : []
  })

/** The wizard tier as the web reads it, each floor carved by `carve`. */
export const readCarvedWorld = (
  configs: Record<string, SiteConfig[]>,
  carve: CarveFloor
): ReadWorld & { pyramids: Record<number, CarvedPyramid[]> } => {
  const pyramids: Record<number, CarvedPyramid[]> = {}
  for (const [n, id] of webJourneysOf(configs))
    pyramids[n] = configs[id].map((site, p) => {
      const floors = site as GameFloorConfig[]
      return { configs: floors, grids: floors.map((config, f) => carve(id, p + 1, f, config)) }
    })
  return { ...readWebWorld(pyramids), pyramids }
}

const journeyIdOf = (at: PyramidRef) => `wizard_${at.journey}`

/** Where each door, binding and activator of a resolved web stands, one line each: what a re-carve must keep. */
export const placementOf = (resolved: ResolvedWeb, read: ReadWorld): string[] => [
  ...resolved.doors.map(door => `${door.key} ${describeWhere(door.at, door.where)}`),
  ...resolved.bindings.map(b => `${b.key} ${pyramidName(b.at)} f${b.floor} ${b.lock}.${b.input}`),
  ...resolved.activators.map(a => {
    const slot = read.seats.get(pyramidName(a.at))?.flatMap(seat => seat.slots.get(a.node) ?? [])[0]
    return `${a.name} ${pyramidName(a.at)} ${slot ? describeSlot(slot) : "no slot"}`
  }),
]

export type WebPlacement = { resolved: ResolvedWeb; walked: WebWalk; placement: string[] }

/** The web journeys' authoring with a placed web taken off: its doors, its lock bindings, and the activators in their
 * slots (`isActivator`). What a web is placed on afresh. */
export const withoutWeb = (
  configs: Record<string, SiteConfig[]>,
  isActivator: (reward: TreasureReward) => boolean
): Record<string, SiteConfig[]> => {
  const keep = <R extends TreasureReward | undefined>(reward: R) => (reward && isActivator(reward) ? undefined : reward)
  const clean = <
    S extends { rewards?: (TreasureReward | undefined)[]; endReward?: TreasureReward; sideSections?: S[] },
  >(
    section: S
  ): S => ({
    ...section,
    ...(section.rewards ? { rewards: section.rewards.map(keep) } : {}),
    ...(section.endReward ? { endReward: keep(section.endReward) } : {}),
    ...(section.sideSections ? { sideSections: section.sideSections.map(clean) } : {}),
  })
  return Object.fromEntries(
    webJourneysOf(configs).map(([, id]) => [
      id,
      configs[id].map(site =>
        site.map(floor => {
          const { webDoors: _doors, ...rest } = floor
          return {
            ...rest,
            ...(floor.rewards ? { rewards: floor.rewards.map(keep) } : {}),
            ...(floor.mainEndReward ? { mainEndReward: keep(floor.mainEndReward) } : {}),
            sideSections: floor.sideSections.map(clean),
            ...(floor.locks ? { locks: floor.locks.map(({ web: _web, ...placed }) => placed) } : {}),
          }
        })
      ),
    ])
  )
}

/** The door a web door on ground no lock owns is written as. */
const placementFor = (door: WebDoor): WebDoorPlacement | undefined => {
  const { where } = door
  if (where.kind === "seam") return { key: door.key, at: { seam: where.seam } }
  if (where.kind === "mouth") return { key: door.key, at: { mouth: where.section } }
  if (where.kind === "sectionSeam") return { key: door.key, at: { section: where.section, seam: where.seam } }
  return undefined
}

/**
 * READS THE WEB AGAINST THE CARVED WORLD, REFUSES IT UNLESS IT WALKS SOUND, AND WRITES IT ONTO THE AUTHORING. Throws
 * with the report when anything refuses: a web the bake cannot place is never half placed.
 */
export const placeWeb = (
  web: Web,
  configs: Record<string, SiteConfig[]>,
  carve: CarveFloor,
  toReward: WebActivatorReward,
  options: {
    walk?: WebWalkOptions
    /** On a world whose loot is already placed (`yarn lock <web>` on the last bake): an activator takes a filled slot,
     * and what it displaces is told here, since the bake places that loot again. */
    displaces?: (line: string) => void
  } = {}
): WebPlacement => {
  const read = readCarvedWorld(configs, carve)
  const resolved = resolveWeb(web, read.world)
  const walked = resolved.refusals.length === 0 ? walkWeb(resolved, options.walk) : undefined
  const slotRefusals: string[] = []
  const floorOf = (at: PyramidRef, f: number) => configs[journeyIdOf(at)][at.pyramid - 1][f] as GameFloorConfig

  // Each activator stands in the reward slot of the room it names, which must hold no reward of its own yet.
  const placements = resolved.activators.map(activator => {
    const seats = read.seats.get(pyramidName(activator.at)) ?? []
    const slot = seats.flatMap(seat => seat.slots.get(activator.node) ?? [])[0]
    if (!slot) {
      slotRefusals.push(`✗ ${activator.name} (line ${activator.n}): no reward room stands at ${activator.place}`)
      return undefined
    }
    const held = slotOf(floorOf(activator.at, slot.floor), slot)
    const there = held.get()
    // A slot an author reserved for a currency (`prefers`) is that currency's, not the web's.
    if (there !== undefined && (there.type !== "fragmentSlot" || there.prefers !== undefined)) {
      const line = `${activator.name} (line ${activator.n}): ${pyramidName(activator.at)} ${describeSlot(slot)} holds a ${there.type}`
      if (options.displaces) options.displaces(line)
      else slotRefusals.push(`✗ ${line}`)
    }
    return { activator, held }
  })

  const report = webReport(resolved, walked)
  if (!report.sound || slotRefusals.length > 0)
    throw new Error(`the web ${web.name} cannot be placed:\n${report.text}${slotRefusals.join("\n")}`)

  for (const door of resolved.doors) {
    const placed = placementFor(door)
    if (!placed) continue
    const floor = floorOf(door.at, door.where.floor)
    floor.webDoors = [...(floor.webDoors ?? []), placed]
  }

  // A lock's inputs: those a line binds, and the owners its stops add.
  const lockWebs = new Map<string, { inputs: Record<string, string>; fronts: WebFront[] }>()
  const webOf = (id: string) => {
    if (!lockWebs.has(id)) lockWebs.set(id, { inputs: {}, fronts: [] })
    return lockWebs.get(id)!
  }
  for (const binding of resolved.bindings)
    webOf(`${pyramidName(binding.at)} f${binding.floor} ${binding.lock}`).inputs[binding.input] = binding.key
  for (const [id, added] of resolved.fronts)
    for (const { input, door } of added) {
      const entry = webOf(id)
      entry.inputs[input] = door.key
      const where = door.where
      if (where.kind === "corridor") entry.fronts.push({ input, corridor: [where.from, where.to] })
      if (where.kind === "region") entry.fronts.push({ input, region: where.region })
    }
  for (const [id, entry] of lockWebs) {
    const [, pyramid, floor, instance] = /^(w\d+p\d+) f(\d+) (.+)$/.exec(id)!
    const [, j, p] = /^w(\d+)p(\d+)$/.exec(pyramid)!
    const config = floorOf({ journey: Number(j), pyramid: Number(p) }, Number(floor))
    config.locks = (config.locks ?? []).map(placed =>
      (placed.as ?? placed.lock.name) === instance
        ? { ...placed, web: { inputs: entry.inputs, ...(entry.fronts.length > 0 ? { fronts: entry.fronts } : {}) } }
        : placed
    )
  }

  for (const placed of placements) {
    if (!placed) continue
    const { activator, held } = placed
    const pots = resolved.pots.filter(pot => pot.levers.includes(activator.name)).map(pot => pot.name)
    held.set(toReward({ name: activator.name, look: activator.look, pots }))
  }

  return { resolved, walked: walked!, placement: placementOf(resolved, read) }
}
