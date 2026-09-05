import type { Meta, StoryObj } from "@storybook/react-vite"
import { useEffect, useState, type FC } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { assembleFloor } from "@/game/siteAssembler"
import { ART_IMAGE_RENDERING, tileUrl } from "./tileAssets"
import { authoredKindsFor } from "./authoredKinds"

// The art backlog, as the world itself reports it — the same numbers `yarn art-census` prints, in the
// place the art is actually judged. What it answers that PropSheet cannot: which of these files is REAL,
// and how many rooms are waiting on it. Every kind has a placeholder, so a sheet that only marks the
// absent ones shows nothing missing while most of the game is still dummies.

const TIERS: Difficulty[] = ["starter", "junior", "expert", "master", "wizard"]

/**
 * A placeholder is told from painted art by how many COLOURS it has.
 *
 * `generate-dummy-tiles` draws flat SVG shapes, so a dummy comes out with 2 to 4 distinct colours where
 * painted art has 300 to 1600. File size cannot separate the two and reported dummies as finished: the
 * junior brazier's placeholder is 2125 bytes and the starter statue's real art is 1964.
 */
const PAINTED_MIN_COLOURS = 32

/** Distinct colours among a tile's opaque pixels, read off a canvas. */
const coloursIn = (url: string): Promise<number> =>
  new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onerror = () => resolve(0)
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) return resolve(0)
      ctx.drawImage(img, 0, 0)
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const seen = new Set<number>()
      for (let i = 0; i < data.length; i += 4)
        if (data[i + 3] >= 128) seen.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2])
      resolve(seen.size)
    }
    img.src = url
  })

type Row = { tier: Difficulty; kind: string; wall: boolean; rooms: number }

/** How many rooms of the generated world each kind lands in. Assembles every floor, which takes a few
 * seconds — the reason this is its own story rather than a badge on the prop sheet. */
const countRooms = (): Row[] => {
  const counts = new Map<string, number>()
  for (const [siteId, levels] of Object.entries(generatedWorldConfigs))
    levels.flat().forEach((floor, i) => {
      const result = assembleFloor(`${siteId}:${i}`, floor, 7)
      if (!result.success) return
      for (const row of result.grid.cells)
        for (const cell of row) {
          if (cell.type !== "room") continue
          const bump = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1)
          if (cell.decoration) bump(`${floor.difficulty}/prop/${cell.decoration}`)
          if (cell.wallDecoration) bump(`${floor.difficulty}/wall/${cell.wallDecoration}`)
        }
    })
  const rows: Row[] = []
  for (const tier of TIERS) {
    const { props, wallItems } = authoredKindsFor(tier)
    for (const kind of props) rows.push({ tier, kind, wall: false, rooms: counts.get(`${tier}/prop/${kind}`) ?? 0 })
    for (const kind of wallItems) rows.push({ tier, kind, wall: true, rooms: counts.get(`${tier}/wall/${kind}`) ?? 0 })
  }
  return rows.sort((a, b) => b.rooms - a.rooms)
}

const Backlog: FC<{ onlyTodo: boolean }> = ({ onlyTodo }) => {
  const [rows, setRows] = useState<Row[] | null>(null)
  /** kind → distinct colours in its tile; what says placeholder or art. */
  const [sizes, setSizes] = useState<Record<string, number>>({})

  useEffect(() => {
    const measured = countRooms()
    setRows(measured)
    let live = true
    void Promise.all(
      measured.map(async row => {
        const url = tileUrl(row.tier, row.kind)
        if (!url) return null as [string, number] | null
        return [`${row.tier}/${row.kind}`, await coloursIn(url)] as [string, number]
      })
    ).then(pairs => {
      if (live) setSizes(Object.fromEntries(pairs.filter((pair): pair is [string, number] => pair !== null)))
    })
    return () => {
      live = false
    }
  }, [])

  if (!rows) return <div className="p-6 text-sm text-white/70">assembling every floor of the world…</div>

  const state = (row: Row) => {
    const colours = sizes[`${row.tier}/${row.kind}`]
    if (colours === undefined) return "…"
    return colours === 0 ? "missing" : colours < PAINTED_MIN_COLOURS ? "placeholder" : "art"
  }
  const shown = onlyTodo ? rows.filter(r => state(r) !== "art") : rows
  const waiting = rows.filter(r => state(r) === "placeholder").reduce((n, r) => n + r.rooms, 0)

  return (
    <div className="flex h-screen flex-col gap-3 overflow-auto bg-neutral-900 p-6 text-white/80">
      <h2 className="m-0 text-sm">
        art backlog — {shown.length} files, {waiting} rooms waiting on a placeholder
      </h2>
      <table className="text-xs">
        <thead className="text-white/40">
          <tr>
            <th className="px-2 text-left">tile</th>
            <th className="px-2 text-left">rank</th>
            <th className="px-2 text-left">kind</th>
            <th className="px-2 text-left">slot</th>
            <th className="px-2 text-right">rooms</th>
            <th className="px-2 text-left">state</th>
          </tr>
        </thead>
        <tbody>
          {shown.map(row => {
            const url = tileUrl(row.tier, row.kind)
            const s = state(row)
            return (
              <tr key={`${row.tier}/${row.kind}`} className="border-t border-white/10">
                <td className="px-2 py-1">
                  {url && (
                    <img
                      src={url}
                      alt={row.kind}
                      style={{ height: 32, imageRendering: ART_IMAGE_RENDERING, background: "#3a342c" }}
                    />
                  )}
                </td>
                <td className="px-2">{row.tier}</td>
                <td className="px-2">{row.kind}</td>
                <td className="px-2 text-white/50">{row.wall ? "wall" : "prop"}</td>
                <td className="px-2 text-right">{row.rooms}</td>
                <td
                  className={`px-2 ${s === "art" ? "text-emerald-400" : s === "missing" ? "text-red-400" : "text-amber-400"}`}
                >
                  {s}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const meta = {
  component: Backlog,
  parameters: { layout: "fullscreen" },
  args: { onlyTodo: true },
} satisfies Meta<typeof Backlog>

export default meta
type Story = StoryObj<typeof meta>

/** What is still to draw, most-used first — the order to work in. */
export const ToDo: Story = {}

/** Everything the world draws, including what is finished. */
export const Everything: Story = { args: { onlyTodo: false } }
