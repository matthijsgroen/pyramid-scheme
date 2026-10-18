import type { Meta, StoryObj } from "@storybook/react-vite"
import type { FC } from "react"
import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import { PROP_ROLES, WALL_ITEM_ROLES } from "@/game/dressingTags"
import {
  DECORATION_KINDS,
  WALL_DECORATION_KINDS,
  type DecorationKind,
  type Direction,
  type FloorGrid,
  type GridCell,
  type WallDecorationKind,
} from "@/game/siteTypes"
import { SiteMapView } from "./SiteMapView"
import { tileUrl } from "./tileAssets"

// A painting batch judged in one look: the rank's own floor and wall, every prop and wall item the rank
// has art for, drawn by the real map. PropSheet stages one object per chamber; this is the same art in
// rooms, lit and walled the way a floor draws it.

/** A room of the sheet: one prop and one wall item, the most the map dresses a room with (plus the
 * companion `roomClaims` may add on its own). */
type Room = { prop?: DecorationKind; wall?: WallDecorationKind }
type Purpose = { name: string; rooms: Room[] }

/**
 * THE SEAM FOR ACTIVITIES (docs/game-design/themed-rooms.md). Until that table exists, a kind is grouped by the first
 * role `PROP_ROLES` / `WALL_ITEM_ROLES` give it, and an untagged kind is filler. When the activity table
 * lands, group by activity here and nothing else in the story changes.
 */
const purposeOf = (roles: readonly string[] | undefined): string => roles?.[0] ?? "filler"

/** Every kind that has art for this rank, read off the tile registry, grouped by purpose. A purpose holds
 * as many rooms as it has props or wall items, whichever is more. */
const purposesFor = (tier: Difficulty): Purpose[] => {
  const props = new Map<string, DecorationKind[]>()
  const walls = new Map<string, WallDecorationKind[]>()
  const push = <K,>(into: Map<string, K[]>, key: string, kind: K) => into.set(key, [...(into.get(key) ?? []), kind])
  // A chest means treasure you can open, never furniture (siteTypes.ts), so it is not judged as a prop here.
  for (const kind of DECORATION_KINDS)
    if (kind !== "chestProp" && tileUrl(tier, kind)) push(props, purposeOf(PROP_ROLES[kind]), kind)
  for (const kind of WALL_DECORATION_KINDS) if (tileUrl(tier, kind)) push(walls, purposeOf(WALL_ITEM_ROLES[kind]), kind)
  const names = [...new Set([...props.keys(), ...walls.keys()])].sort()
  return names.map(name => {
    const p = props.get(name) ?? []
    const w = walls.get(name) ?? []
    return { name, rooms: Array.from({ length: Math.max(p.length, w.length) }, (_, i) => ({ prop: p[i], wall: w[i] })) }
  })
}

/** Rooms four cells apart, so each chamber's 3x3 footprint has a wall of its own on every side. */
const STEP = 4
const MARGIN = 2

/** One purpose per row of rooms, joined by corridors: rows run east, the first rooms join north-south. */
const sheetGrid = (tier: Difficulty, purposes: Purpose[]): FloorGrid => {
  const widest = Math.max(1, ...purposes.map(p => p.rooms.length))
  const rows = MARGIN * 2 + (purposes.length - 1) * STEP + 1
  const cols = MARGIN * 2 + (widest - 1) * STEP + 1
  const cells: GridCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (): GridCell => ({ type: "empty" }))
  )
  const corridor = (r: number, c: number, dirs: Direction[]) => {
    cells[r][c] = { type: "corridor", dirs: new Set(dirs), state: "reachable" }
  }
  purposes.forEach((purpose, g) => {
    const r = MARGIN + g * STEP
    purpose.rooms.forEach((room, i) => {
      const c = MARGIN + i * STEP
      const dirs: Direction[] = []
      if (i > 0) dirs.push("w")
      if (i < purpose.rooms.length - 1) dirs.push("e")
      if (i === 0 && g > 0) dirs.push("n")
      if (i === 0 && g < purposes.length - 1) dirs.push("s")
      cells[r][c] = {
        type: "room",
        roomType: "fork",
        dirs: new Set(dirs),
        state: "reachable",
        difficulty: tier,
        ...(room.prop ? { decoration: room.prop } : {}),
        ...(room.wall ? { wallDecoration: room.wall } : {}),
      }
      if (i < purpose.rooms.length - 1) for (let k = 1; k < STEP; k++) corridor(r, c + k, ["e", "w"])
      if (i === 0 && g < purposes.length - 1) for (let k = 1; k < STEP; k++) corridor(r + k, c, ["n", "s"])
    })
  })
  const last = purposes.length - 1
  return {
    siteId: `${tier}-on-the-floor`,
    difficulty: tier,
    rows,
    cols,
    cells,
    entrancePos: [MARGIN, MARGIN],
    exitPos: [MARGIN + last * STEP, MARGIN + Math.max(0, (purposes[last]?.rooms.length ?? 1) - 1) * STEP],
    staircases: {},
  }
}

const RankOnTheFloor: FC<{ tier: Difficulty }> = ({ tier }) => {
  const purposes = purposesFor(tier)
  return (
    <div className="flex h-screen flex-col bg-neutral-900">
      <ol className="m-0 flex flex-wrap gap-x-6 gap-y-1 p-3 text-[11px] text-white/70">
        {purposes.map(p => (
          <li key={p.name}>
            <span className="text-white">{p.name}</span>:{" "}
            {p.rooms.map(r => [r.prop, r.wall].filter(Boolean).join(" + ")).join(" · ")}
          </li>
        ))}
      </ol>
      {purposes.length > 0 ? (
        <SiteMapView grid={sheetGrid(tier, purposes)} className="min-h-0 flex-1" />
      ) : (
        <p className="p-3 text-sm text-white/60">{tier} has no prop art yet.</p>
      )}
    </div>
  )
}

const meta = {
  component: RankOnTheFloor,
  parameters: { layout: "fullscreen" },
  argTypes: { tier: { control: "select", options: difficulties } },
  args: { tier: "starter" },
} satisfies Meta<typeof RankOnTheFloor>

export default meta
type Story = StoryObj<typeof meta>

export const Starter: Story = { name: "starter on the floor", args: { tier: "starter" } }
export const Junior: Story = { name: "junior on the floor", args: { tier: "junior" } }
export const Expert: Story = { name: "expert on the floor", args: { tier: "expert" } }
export const Master: Story = { name: "master on the floor", args: { tier: "master" } }
export const Wizard: Story = { name: "wizard on the floor", args: { tier: "wizard" } }
