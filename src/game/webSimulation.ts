// A WEB'S PULLS PLAYED THROUGH ON THE ENGINE (the Lock editor's web mode): what a pull set holds, puts in reach and
// leaves buried, laid out per journey and pyramid. Every answer is the engine's: the held keys and the reach come from
// the web walk (`reachOf`, which derives them with webHeldKeys), where a door stands from webLine, and the buried
// percentage from the function the journey card shows. This module only places them on a 0–100% bar.
import { produce } from "immer"
import type { Mark } from "./mark"
import { webMarkFor } from "./mark"
import type { SiteConfig } from "./siteTypes"
import { journeyBuriedPercent } from "./webBuriedPercent"
import { activatorsOfWeb } from "./webKeys"
import type { WebPulled } from "./webKeys"
import type { DoorWhere, PyramidRef, ResolvedWeb, WebDoor, WebPot } from "./webLine"
import { describeWhere, findSection, pyramidLinePct, pyramidName, roomNode } from "./webLine"
import type { WebLook } from "./webNotation"
import type { PullReach, WebWalk } from "./webWalk"

/** What a web's pulls are played on: the web as read, the walk that answers what a pull set reaches, and the web
 * journeys' authoring (`wizard_N` → its pyramids) with the web's doors laid, which the buried percentage reads. */
export type WebSimSource = {
  resolved: ResolvedWeb
  walked: Pick<WebWalk, "reachOf">
  configs: Readonly<Record<string, readonly SiteConfig[]>>
}

/** One pull as the log tells it: each pot it counts in with its front after it (undefined: the pot is open), the
 * pyramids where a seal it opens stands, and the activators it put in reach. */
export type WebSimPull = {
  name: string
  look: WebLook
  at: string
  pots: { pot: string; front?: number }[]
  seals: string[]
  fresh: string[]
}

/** The pulled set in pull order, the log, and what the last action put in reach. */
export type WebSimState = { pulled: string[]; log: WebSimPull[]; fresh: string[] }

export const createWebSimState = (): WebSimState => ({ pulled: [], log: [], fresh: [] })

export type ActivatorState = "pulled" | "reachable" | "out"

/** An activator pinned on its pyramid's bar. `side`: it stands in a side section, at the section's mouth. */
export type SimPin = {
  name: string
  look: WebLook
  pct: number
  side: boolean
  state: ActivatorState
  fresh: boolean
  marks: Mark[]
}
/** An `opens` door: where it stands, and whether its key is held. */
export type SimSeal = { key: string; pct: number; side: boolean; open: boolean; where: string }
/** A pot's front standing on this pyramid's main path. */
export type SimFront = { pot: string; pct: number; where: string; mark: Mark }
export type PyramidStatus = { kind: "finishes" } | { kind: "stops"; pct: number } | { kind: "closed" }
export type SimPyramid = {
  name: string
  status: PyramidStatus
  /** How far one visit plays from the arrival, 0–100. */
  cleared: number
  /** Where the sand starts on this pyramid's bar; undefined where none lies. */
  sandFrom?: number
  fronts: SimFront[]
  seals: SimSeal[]
  pins: SimPin[]
}
/** `buried`: the journey card's "Still x% buried", undefined where nothing is. */
export type SimJourney = { journey: number; buried?: number; pyramids: SimPyramid[] }
/** A pot: its mark, its levers and how many are pulled, and its front on its own line (undefined: open). */
export type SimPot = {
  name: string
  mark: Mark
  levers: { name: string; state: ActivatorState }[]
  pulled: number
  front?: number
  where?: string
}
export type WebSimView = {
  journeys: SimJourney[]
  pots: SimPot[]
  keys: { name: string; state: ActivatorState }[]
  reachable: string[]
  total: number
}

const pulledRecord = (pulled: readonly string[]): WebPulled =>
  Object.fromEntries(pulled.map(name => [name, true as const]))

const reachOf = (source: WebSimSource, pulled: readonly string[]): PullReach => source.walked.reachOf(pulled)

/** The activators a reach puts in reach that are not pulled yet, in the web's order. */
const reachableIn = (source: WebSimSource, reach: PullReach, pulled: readonly string[]): string[] =>
  source.resolved.activators.filter(a => reach.taken.has(a.name) && !pulled.includes(a.name)).map(a => a.name)

/** The door a pot's front stands at under held keys: its first door still shut. */
const frontDoor = (pot: WebPot, held: ReadonlySet<string>): WebDoor | undefined =>
  pot.doors.find(door => !held.has(door.key))

/** Where a door stands on its pot's own line, 0–100. */
const potLinePct = (pot: WebPot, door: WebDoor): number =>
  door.landed === undefined || pot.rooms < 2 ? 0 : (door.landed / (pot.rooms - 1)) * 100

const isJourneyPot = (pot: WebPot) => /^w\d+$/.test(pot.name)

type MainWhere = Extract<DoorWhere, { kind: "seam" | "corridor" | "region" }>
const onMainPath = (where: DoorWhere): where is MainWhere =>
  where.kind === "seam" || where.kind === "corridor" || where.kind === "region"

const samePyramid = (a: PyramidRef, b: PyramidRef) => a.journey === b.journey && a.pyramid === b.pyramid

/** Where a node of a pyramid's graph stands on its bar: a main room at its place, a side section's room at the
 * section's mouth, a lock region at the first main room standing in it. */
const nodePct = (resolved: ResolvedWeb, at: PyramidRef, node: string): { pct: number; side: boolean } => {
  const [, f, rest] = /^f(\d+) (.+)$/.exec(node) ?? []
  const floorIndex = Number(f)
  const floor = resolved.world.journeys[at.journey]?.[at.pyramid - 1]?.floors[floorIndex]
  if (!floor) return { pct: 0, side: false }
  const pct = (pos: number) => pyramidLinePct(resolved.world, at, floorIndex, pos)
  const room = /^m(\d+)$/.exec(rest)
  if (room) return { pct: pct(Number(room[1])), side: false }
  if (rest.includes("#")) {
    const address = rest.slice(0, rest.lastIndexOf("#"))
    const top = floor.sections.find(s => s.address === address || findSection(s.sections ?? [], address))
    return { pct: pct(Math.max(0, (top?.after ?? 0) - 0.5)), side: true }
  }
  const first = floor.rooms.findIndex(r => r.region === rest)
  return { pct: pct(Math.max(0, first)), side: false }
}

/** The view of a pull set: per journey its buried percentage and per pyramid its bar; per pot its count and front. */
export const webSimView = (source: WebSimSource, state: WebSimState): WebSimView => {
  const { resolved } = source
  const reach = reachOf(source, state.pulled)
  const { held } = reach
  const reachable = reachableIn(source, reach, state.pulled)
  const stateOf = (name: string): ActivatorState =>
    state.pulled.includes(name) ? "pulled" : reachable.includes(name) ? "reachable" : "out"
  const shipped = activatorsOfWeb(resolved)
  const potsOf = (name: string) => resolved.pots.filter(pot => pot.levers.includes(name))
  const markOf = (name: string) => webMarkFor(`web:${name}`, resolved.marks)
  const fronts = new Map(
    resolved.pots.map(pot => {
      const door = frontDoor(pot, held)
      return [pot.name, door] as const
    })
  )

  const journeys = Object.entries(resolved.world.journeys).map(([j, pyramids]): SimJourney => {
    const journey = Number(j)
    const buried = journeyBuriedPercent(source.configs[`wizard_${journey}`] ?? [], shipped, pulledRecord(state.pulled))
    return {
      journey,
      ...(buried !== undefined ? { buried } : {}),
      pyramids: pyramids.map((pyramid, p): SimPyramid => {
        const at = { journey, pyramid: p + 1 }
        const name = pyramidName(at)
        const visit = reach.visits.get(name)
        let furthest = 0
        pyramid.floors.forEach((floor, f) =>
          floor.rooms.forEach((_, i) => {
            if (visit?.reach.has(roomNode(f, i)))
              furthest = Math.max(furthest, pyramidLinePct(resolved.world, at, f, i))
          })
        )
        const status: PyramidStatus = reach.finished.has(name)
          ? { kind: "finishes" }
          : visit
            ? { kind: "stops", pct: furthest }
            : { kind: "closed" }

        const sandStarts: number[] = []
        const potFronts: SimFront[] = []
        for (const pot of resolved.pots) {
          const door = fronts.get(pot.name)
          if (!door || !onMainPath(door.where) || door.at.journey !== journey) continue
          const pct = pyramidLinePct(resolved.world, door.at, door.where.floor, door.where.seam + 0.5)
          if (samePyramid(door.at, at)) {
            sandStarts.push(pct)
            potFronts.push({ pot: pot.name, pct, where: describeWhere(door.at, door.where), mark: markOf(pot.name) })
          } else if (isJourneyPot(pot) && door.at.pyramid < at.pyramid) sandStarts.push(0)
        }

        const seals = resolved.doors
          .filter(door => samePyramid(door.at, at) && !resolved.pots.some(pot => pot.doors.includes(door)))
          .map((door): SimSeal => {
            const where = door.where
            const place =
              where.kind === "mouth"
                ? nodePct(resolved, at, `f${where.floor} ${where.section}#0`)
                : {
                    pct: pyramidLinePct(resolved.world, at, where.floor, "seam" in where ? where.seam + 0.5 : 0),
                    side: false,
                  }
            return {
              key: door.key.slice(4),
              pct: place.pct,
              side: place.side,
              open: held.has(door.key),
              where: describeWhere(door.at, where),
            }
          })

        const pins = resolved.activators
          .filter(a => samePyramid(a.at, at))
          .map((a): SimPin => {
            const place = nodePct(resolved, at, a.node)
            return {
              name: a.name,
              look: a.look,
              ...place,
              state: stateOf(a.name),
              fresh: state.fresh.includes(a.name),
              marks: (a.look === "lever" ? potsOf(a.name).map(pot => pot.name) : [a.name]).map(markOf),
            }
          })

        return {
          name,
          status,
          cleared: status.kind === "finishes" ? 100 : status.kind === "stops" ? status.pct : 0,
          ...(sandStarts.length > 0 ? { sandFrom: Math.min(...sandStarts) } : {}),
          fronts: potFronts,
          seals,
          pins,
        }
      }),
    }
  })

  const pots = resolved.pots.map((pot): SimPot => {
    const door = fronts.get(pot.name)
    return {
      name: pot.name,
      mark: markOf(pot.name),
      levers: pot.levers.map(name => ({ name, state: stateOf(name) })),
      pulled: pot.levers.filter(name => state.pulled.includes(name)).length,
      ...(door ? { front: potLinePct(pot, door), where: describeWhere(door.at, door.where) } : {}),
    }
  })

  return {
    journeys,
    pots,
    keys: resolved.activators.filter(a => a.look === "key").map(a => ({ name: a.name, state: stateOf(a.name) })),
    reachable,
    total: resolved.activators.length,
  }
}

/** Pulls one activator in reach: logged with where its pots' fronts went, the seals it opened and what came in reach.
 * One out of reach, or pulled already, changes nothing. */
export const pullWebActivator = (state: WebSimState, source: WebSimSource, name: string): WebSimState => {
  const { resolved } = source
  const before = reachableIn(source, reachOf(source, state.pulled), state.pulled)
  const activator = resolved.activators.find(a => a.name === name)
  if (!activator || !before.includes(name)) return state
  const pulled = [...state.pulled, name]
  const reach = reachOf(source, pulled)
  const fresh = reachableIn(source, reach, pulled).filter(other => !before.includes(other))
  const entry: WebSimPull = {
    name,
    look: activator.look,
    at: pyramidName(activator.at),
    pots: resolved.pots
      .filter(pot => pot.levers.includes(name))
      .map(pot => {
        const door = frontDoor(pot, reach.held)
        return { pot: pot.name, ...(door ? { front: potLinePct(pot, door) } : {}) }
      }),
    seals: resolved.doors.filter(door => door.key === `web:${name}`).map(door => pyramidName(door.at)),
    fresh,
  }
  return produce(state, draft => {
    draft.pulled.push(name)
    draft.log.push(entry)
    draft.fresh = fresh
  })
}

/** Pulls every activator in reach now, one after the other; what each pull put in reach waits for the next press. */
export const pullEveryReachable = (state: WebSimState, source: WebSimSource): WebSimState => {
  const now = reachableIn(source, reachOf(source, state.pulled), state.pulled)
  const after = now.reduce((next, name) => pullWebActivator(next, source, name), state)
  const fresh = reachableIn(source, reachOf(source, after.pulled), after.pulled).filter(name => !now.includes(name))
  return produce(after, draft => {
    draft.fresh = fresh
  })
}

export const resetWebSim = (): WebSimState => createWebSimState()
