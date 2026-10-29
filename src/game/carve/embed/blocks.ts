// ponytail: per-row/column gaps keep rows aligned; upgrade to per-node compaction if floors read as a grid
import type { Direction } from "../../siteTypes"
import type { Cell } from "../state"

/** How far a gap's draw reaches past one cell at full spread. */
export const GAP_RANGE = 6

/** Where a footprint sits along one axis of its block: where the seed puts it, with its node on the block's middle
 * line, or flush against the block's near (top or left) or far side. */
export type Hold = "free" | "middle" | "near" | "far"

/** A node's footprint: its size, its node's offset inside it, and how it is held in its block on each axis. */
export type BlockNode = {
  key: string
  r: number
  c: number
  rows: number
  cols: number
  node: Cell
  hold: { row: Hold; col: Hold }
}

/** A drop between two nodes on one axis, which holds them `reach` cells apart: launch, run, landing and the step on. */
export type BlockDrop = { from: string; to: string; dir: Direction; reach: number }

/** The gap cells after a kept lattice line, first to last, by that line's lattice index. */
export type Gaps = ReadonlyMap<number, readonly [number, number]>

export type Blocks = {
  rows: number
  cols: number
  /** Each footprint's top-left cell, by node key. */
  origin: ReadonlyMap<string, Cell>
  /** Each node's own cell, by node key. */
  at: ReadonlyMap<string, Cell>
  rowGaps: Gaps
  colGaps: Gaps
}

type AxisName = "row" | "col"

const lineOf = (node: BlockNode, axis: AxisName) => (axis === "row" ? node.r : node.c)
const extentOf = (node: BlockNode, axis: AxisName) => (axis === "row" ? node.rows : node.cols)
const nodeIn = (node: BlockNode, axis: AxisName) => (axis === "row" ? node.node[0] : node.node[1])
const axisOf = (dir: Direction): AxisName => (dir === "n" || dir === "s" ? "row" : "col")

const offsetFor = (hold: Hold, size: number, extent: number, inside: number, rand: () => number): number => {
  const slack = size - extent
  if (slack === 0) return 0
  if (hold === "near") return 0
  if (hold === "far") return slack
  if (hold === "middle") return Math.min(slack, Math.max(0, Math.floor((size - 1) / 2) - inside))
  return Math.floor(rand() * (slack + 1))
}

/**
 * THE BLOCKS OF THE FLOOR. Each kept lattice row is as tall as its tallest footprint and each kept column as wide as
 * its widest; a lattice line no node stands on is dropped. Each footprint is offset in its block by its hold, then
 * each boundary between kept lines gets a gap of `1 + round(spread * GAP_RANGE * u)` with u in [0.5, 1.5). A boundary
 * a drop crosses takes no draw: it is as wide as puts the drop's two nodes its `reach` apart, never less than one
 * cell, so between two claiming rooms it is the run exactly and the launch and landing stand in their rings. Draws come from `rand`, offsets first in the
 * order the nodes are given, then row gaps, then column gaps.
 */
export const layBlocks = (
  nodes: readonly BlockNode[],
  drops: readonly BlockDrop[],
  spread: number,
  rand: () => number
): Blocks => {
  const keep = (axis: AxisName) => [...new Set(nodes.map(node => lineOf(node, axis)))].sort((a, b) => a - b)
  const lines = { row: keep("row"), col: keep("col") }
  const index = {
    row: new Map(lines.row.map((line, i) => [line, i])),
    col: new Map(lines.col.map((line, i) => [line, i])),
  }
  const sizes = (axis: AxisName) =>
    lines[axis].map(line =>
      Math.max(...nodes.filter(node => lineOf(node, axis) === line).map(node => extentOf(node, axis)))
    )
  const size = { row: sizes("row"), col: sizes("col") }
  const block = (node: BlockNode, axis: AxisName) => index[axis].get(lineOf(node, axis)) as number

  const offset = new Map<string, Cell>()
  for (const node of nodes) {
    const off = (axis: AxisName) =>
      offsetFor(node.hold[axis], size[axis][block(node, axis)], extentOf(node, axis), nodeIn(node, axis), rand)
    const row = off("row")
    offset.set(node.key, [row, off("col")])
  }

  const byKey = new Map(nodes.map(node => [node.key, node]))
  const crossed = (axis: AxisName) => {
    const spans = drops
      .filter(drop => axisOf(drop.dir) === axis)
      .map(drop => {
        const [a, b] = [block(byKey.get(drop.from)!, axis), block(byKey.get(drop.to)!, axis)]
        const [lo, hi] = a < b ? [drop.from, drop.to] : [drop.to, drop.from]
        return { lo, hi, first: Math.min(a, b), last: Math.max(a, b) - 1, reach: drop.reach }
      })
    return { spans, boundaries: new Set(spans.flatMap(({ first, last }) => range(first, last))) }
  }
  const drawGaps = (axis: AxisName, boundaries: ReadonlySet<number>) =>
    lines[axis].slice(1).map((_, b) => (boundaries.has(b) ? 1 : 1 + Math.round(spread * GAP_RANGE * (0.5 + rand()))))
  const rowDrops = crossed("row")
  const colDrops = crossed("col")
  const gaps = { row: drawGaps("row", rowDrops.boundaries), col: drawGaps("col", colDrops.boundaries) }

  const starts = (axis: AxisName) => {
    const out = [0]
    for (let i = 1; i < lines[axis].length; i++) out.push(out[i - 1] + size[axis][i - 1] + gaps[axis][i - 1])
    return out
  }
  const position = (key: string, axis: AxisName, start: readonly number[]) => {
    const node = byKey.get(key)!
    const off = offset.get(key)!
    return start[block(node, axis)] + off[axis === "row" ? 0 : 1] + nodeIn(node, axis)
  }
  for (const axis of ["row", "col"] as const) {
    for (const { lo, hi, last, reach } of (axis === "row" ? rowDrops : colDrops).spans) {
      const start = starts(axis)
      const short = reach - (position(hi, axis, start) - position(lo, axis, start))
      if (short > 0) gaps[axis][last] += short
    }
  }

  const rowStart = starts("row")
  const colStart = starts("col")
  const origin = new Map<string, Cell>()
  const at = new Map<string, Cell>()
  for (const node of nodes) {
    const [dr, dc] = offset.get(node.key)!
    const top = rowStart[block(node, "row")] + dr
    const left = colStart[block(node, "col")] + dc
    origin.set(node.key, [top, left])
    at.set(node.key, [top + node.node[0], left + node.node[1]])
  }
  const gapsAfter = (axis: AxisName, start: readonly number[]): Gaps =>
    new Map(
      lines[axis].slice(0, -1).map((line, i) => {
        const first = start[i] + size[axis][i]
        return [line, [first, first + gaps[axis][i] - 1] as const]
      })
    )
  const total = (axis: AxisName, start: readonly number[]) =>
    lines[axis].length === 0 ? 0 : start[start.length - 1] + size[axis][size[axis].length - 1]
  return {
    rows: total("row", rowStart),
    cols: total("col", colStart),
    origin,
    at,
    rowGaps: gapsAfter("row", rowStart),
    colGaps: gapsAfter("col", colStart),
  }
}

const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i)
