import { expect } from "vitest"
import type { LaidLocks } from "../layLocks"
import type { LockPlan } from "../lockPlan"
import { oneWayRunCells } from "../siteAssembler"

const rc = (cell: string) => cell.split(",").map(Number) as [number, number]

/** Asserts every geometric claim a laid plan makes: stretches, corridors, junctions, drops, walls and the route. */
export const expectLaidPlan = (plan: LockPlan, laid: LaidLocks): void => {
  const { n } = laid
  const passageKey = (a: string, b: string) => {
    const [ar, ac] = rc(a)
    const [br, bc] = rc(b)
    const x = ar * n + ac
    const y = br * n + bc
    return x < y ? `${x}-${y}` : `${y}-${x}`
  }
  const passages = new Set(laid.passages)
  const joined = (a: string, b: string) => passages.has(passageKey(a, b))
  const claimed = new Set(laid.claimed)
  const regionOf = new Map(laid.regions.flatMap(region => region.nodes.map(node => [node, region.id] as const)))
  const nodesOf = (id: string) => laid.regions.find(region => region.id === id)!.nodes

  // 1. every region a connected stretch of enough claimed nodes, every corridor joining its two regions
  for (const region of plan.regions) {
    const nodes = nodesOf(region.id)
    expect(nodes.length).toBeGreaterThanOrEqual(region.minNodes)
    expect(nodes.every(node => claimed.has(node))).toBe(true)
    expect(new Set(nodes).size).toBe(nodes.length)
    nodes.slice(1).forEach((node, i) => expect(joined(nodes[i], node)).toBe(true))
  }
  const allowed = new Set(
    laid.regions.flatMap(region => region.nodes.slice(1).map((node, i) => passageKey(region.nodes[i], node)))
  )
  for (const corridor of plan.corridors) {
    const laidCorridor = laid.corridors.find(candidate => candidate.id === corridor.id)!
    expect(nodesOf(corridor.from)).toContain(laidCorridor.start)
    expect(nodesOf(corridor.to)).toContain(laidCorridor.end)
    expect(laidCorridor.nodes.length).toBeGreaterThanOrEqual(corridor.minNodes)
    const chain = [laidCorridor.start, ...laidCorridor.nodes, laidCorridor.end]
    chain.slice(1).forEach((node, i) => {
      expect(joined(chain[i], node)).toBe(true)
      allowed.add(passageKey(chain[i], node))
    })
    expect(laidCorridor.nodes.every(node => claimed.has(node) && !regionOf.has(node))).toBe(true)
  }

  // 4. the passages are exactly stretches and corridors; two regions meet only across a plan corridor
  expect([...allowed].sort()).toEqual([...passages].sort())
  const meets = new Set(plan.corridors.map(corridor => [corridor.from, corridor.to].sort().join("|")))
  for (const corridor of laid.corridors) {
    const chain = [corridor.start, ...corridor.nodes, corridor.end]
    chain.slice(1).forEach((node, i) => {
      const a = regionOf.get(chain[i])
      const b = regionOf.get(node)
      if (a && b && a !== b) expect(meets.has([a, b].sort().join("|"))).toBe(true)
    })
  }

  // 2. a junction cell's exits are exactly its route neighbours and its arms, one direction each
  for (const junction of plan.junctions) {
    const laidJunction = laid.junctions.find(candidate => candidate.region === junction.region)!
    expect(nodesOf(junction.region)).toContain(laidJunction.cell)
    expect(laidJunction.arms.map(arm => arm.corridor).sort()).toEqual([...junction.arms].sort())
    const at = laid.route.indexOf(laidJunction.cell)
    const [r, c] = rc(laidJunction.cell)
    const dirOf = (cell: string) => {
      const [nr, nc] = rc(cell)
      return nr < r ? "n" : nr > r ? "s" : nc > c ? "e" : "w"
    }
    const routeDirs = [laid.route[at - 1], laid.route[at + 1]].filter(Boolean).map(dirOf)
    const armDirs = laidJunction.arms.map(arm => arm.dir)
    expect(new Set(armDirs).size).toBe(armDirs.length)
    expect([...laidJunction.exits].sort()).toEqual([...routeDirs, ...armDirs].sort())
    expect(laidJunction.exits.length).toBe(new Set(laidJunction.exits).size)
  }

  // 3. every drop a straight run from a launch node to a landing node, its cells held and never walked
  const touched = new Set(laid.passages.flatMap(key => key.split("-")))
  for (const drop of plan.drops) {
    const laidDrop = laid.drops.find(candidate => candidate.id === drop.id)!
    expect(nodesOf(drop.launch)).toContain(laidDrop.from)
    expect(nodesOf(drop.landing)).toContain(laidDrop.to)
    const [fr, fc] = rc(laidDrop.from)
    const [tr, tc] = rc(laidDrop.to)
    const runCells = oneWayRunCells(laidDrop.dir)
    expect(Math.abs(fr - tr) + Math.abs(fc - tc)).toBe(runCells + 3)
    expect(fr === tr || fc === tc).toBe(true)
    const cells = [laidDrop.launchCell, ...laidDrop.run, laidDrop.landingCell]
    expect(laidDrop.run).toHaveLength(runCells)
    for (const cell of cells) {
      const [r, c] = rc(cell)
      expect(Math.abs(r - fr) + Math.abs(c - fc)).toBeLessThan(runCells + 3)
      expect(claimed.has(cell)).toBe(false)
      expect(touched.has(String(r * n + c))).toBe(false)
      expect(laid.held).toContain(cell)
    }
  }

  // the route: one simple path from an edge entrance through the plan's regions in order to the exit
  expect(new Set(laid.route).size).toBe(laid.route.length)
  laid.route.slice(1).forEach((node, i) => expect(joined(laid.route[i], node)).toBe(true))
  const [er, ec] = rc(laid.route[0])
  expect([er, ec].some(value => value === 0 || value === n - 1)).toBe(true)
  const regionsAlong = laid.route
    .map(node => regionOf.get(node))
    .filter((id, i, all) => id !== undefined && id !== all[i - 1])
  expect(regionsAlong).toEqual(plan.route)
  expect(regionOf.get(laid.route[laid.route.length - 1])).toBe(plan.route[plan.route.length - 1])
}
