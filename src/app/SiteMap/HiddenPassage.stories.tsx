import type { StoryObj } from "@storybook/react-vite"
import { useState, useMemo } from "react"
import { assembleFloor } from "../../game/siteAssembler"
import { completeCell } from "../../game/gridNavigation"
import type { Direction, FloorConfig, FloorGrid, GridCell } from "../../game/siteTypes"
import { SiteMapView } from "./SiteMapView"

// ── Grid setup ────────────────────────────────────────────────────────────────
// One fixed seed. Same seed + same maze size → same maze structure.
// Hidden section adds extra cells that aren't present in the base config.

const SEED = 17

const baseConfig: FloorConfig = {
  pathPuzzles: 2,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [{ pathPuzzles: 1, difficulty: "expert", end: "treasure" }],
}

const fullConfig: FloorConfig = {
  ...baseConfig,
  sideSections: [
    ...baseConfig.sideSections,
    // Hidden branch: no puzzle rooms, just a mosaic-piece chest directly at the end.
    { pathPuzzles: 0, difficulty: "expert", end: "treasure", endReward: { type: "mosaicPiece" } },
  ],
}

const build = (cfg: FloorConfig): FloorGrid => {
  const r = assembleFloor("hidden-story", cfg, SEED)
  if (!r.success) throw new Error(`hidden-passage story: assembly failed — ${JSON.stringify(r.reasons)}`)
  return r.grid
}

const baseGrid = build(baseConfig)
const fullGrid = build(fullConfig)

if (baseGrid.rows !== fullGrid.rows || baseGrid.cols !== fullGrid.cols) {
  throw new Error("hidden-passage story: grid size mismatch — choose a different seed")
}

// Every cell present in fullGrid but absent in baseGrid belongs to the hidden section.
const hiddenCells = new Set<string>()
for (let r = 0; r < fullGrid.rows; r++) {
  for (let c = 0; c < fullGrid.cols; c++) {
    if (fullGrid.cells[r][c].type !== "empty" && baseGrid.cells[r][c].type === "empty") {
      hiddenCells.add(`${r},${c}`)
    }
  }
}

// Cells that have an actual maze corridor leading INTO the hidden section.
// Geometric adjacency is not enough — the cell must have a dir pointing toward
// a hidden cell (i.e. there is a walkable passage, not just a shared wall).
const DELTA_TO_DIR: Record<string, Direction> = { "-1,0": "n", "1,0": "s", "0,-1": "w", "0,1": "e" }
const adjacentToHidden = new Set<string>()
for (const key of hiddenCells) {
  const [r, c] = key.split(",").map(Number)
  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as [number, number][]) {
    const nr = r + dr
    const nc = c + dc
    const nk = `${nr},${nc}`
    if (hiddenCells.has(nk)) continue
    const nCell = fullGrid.cells[nr]?.[nc]
    if (!nCell || nCell.type === "empty") continue
    if (nCell.type !== "room" && nCell.type !== "corridor") continue
    // Direction the neighbor must have to connect into the hidden cell
    const dirToHidden = DELTA_TO_DIR[`${-dr},${-dc}`]
    if (dirToHidden && nCell.dirs.has(dirToHidden)) adjacentToHidden.add(nk)
  }
}

// Dir → [row-delta, col-delta]
const DIR_MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

// ── Component ─────────────────────────────────────────────────────────────────

const HiddenPassageDemo = () => {
  const [explored, setExplored] = useState<FloorGrid>(fullGrid)
  const [explorerPos, setExplorerPos] = useState<[number, number] | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [mosaicFound, setMosaicFound] = useState(false)

  // Build the display grid:
  //  - Hidden cells → empty (completely invisible, no dead-end stub)
  //  - Cells adjacent to hidden cells → strip the dirs pointing toward hidden cells
  //    so a junction looks like a plain corner, not a 3-way branch
  const displayGrid = useMemo((): FloorGrid => {
    if (revealed) return explored
    const newCells: GridCell[][] = explored.cells.map((row, r) =>
      row.map((cell, c): GridCell => {
        // Hidden cells are invisible
        if (hiddenCells.has(`${r},${c}`)) return { type: "empty" }

        // Strip any dirs that point into hidden cells
        if (cell.type === "room" || cell.type === "corridor") {
          const newDirs = new Set(cell.dirs) as Set<Direction>
          for (const [dir, [dr, dc]] of Object.entries(DIR_MOVES) as [Direction, [number, number]][]) {
            if (newDirs.has(dir) && hiddenCells.has(`${r + dr},${c + dc}`)) newDirs.delete(dir)
          }
          if (newDirs.size !== cell.dirs.size) return { ...cell, dirs: newDirs as ReadonlySet<Direction> }
        }

        return cell
      })
    )
    return { ...explored, cells: newCells }
  }, [explored, revealed])

  // Reveal button shows only when the explorer is AT the junction cell.
  const stoppedAtHidden =
    !revealed && explorerPos !== null && adjacentToHidden.has(`${explorerPos[0]},${explorerPos[1]}`)

  const handleClick = (row: number, col: number) => {
    const cell = explored.cells[row]?.[col]
    if (!cell || cell.type === "empty") return
    if (cell.state !== "reachable" && cell.state !== "completed") return

    if (cell.state === "reachable") {
      if (cell.type === "room" && cell.roomType === "treasure" && cell.reward?.type === "mosaicPiece") {
        setMosaicFound(true)
      }
      setExplored(completeCell(explored, row, col))
    }
    setExplorerPos([row, col])
  }

  const handleReveal = () => setRevealed(true)

  const handleReset = () => {
    setExplored(fullGrid)
    setExplorerPos(null)
    setRevealed(false)
    setMosaicFound(false)
  }

  const heading = mosaicFound
    ? "Mosaic piece recovered!"
    : stoppedAtHidden
      ? "Something is behind this wall…"
      : revealed
        ? "Hidden passage revealed!"
        : "Explore the pyramid"

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-stone-950 p-6">
      <div className="flex w-full max-w-lg flex-col items-center gap-1 text-center">
        <h2
          className={`font-pyramid text-2xl transition-colors duration-300 ${
            mosaicFound
              ? "text-amber-400"
              : stoppedAtHidden
                ? "text-yellow-300"
                : revealed
                  ? "text-green-300"
                  : "text-amber-300"
          }`}
        >
          {heading}
        </h2>
        <p className="text-sm text-stone-500">
          {mosaicFound
            ? "The ancient mosaic piece joins your collection."
            : stoppedAtHidden
              ? "Your explorer stopped at a suspicious corner. Press Reveal to investigate."
              : revealed
                ? "A hidden chamber now visible — navigate to the chest inside."
                : "Click reachable nodes to advance your explorer through the pyramid."}
        </p>
      </div>

      {/* Reveal button — appears only while explorer is at the junction */}
      <div className="flex h-10 items-center">
        {stoppedAtHidden && (
          <button
            onClick={handleReveal}
            className="rounded-lg border border-yellow-700 bg-yellow-950 px-5 py-2 font-pyramid text-sm text-yellow-200 shadow-[0_0_12px_1px_rgba(200,160,0,0.25)] transition hover:bg-yellow-900 active:scale-95"
          >
            ✦ Reveal hidden passage
          </button>
        )}
        {mosaicFound && (
          <span className="font-pyramid text-sm text-amber-400">✦ Mosaic piece added to your collection</span>
        )}
      </div>

      {/* Map — same grid, same layout throughout; only dirs and visibility change */}
      <div
        className={`rounded-xl border transition-all duration-500 ${
          mosaicFound
            ? "border-amber-700 shadow-[0_0_24px_2px_rgba(180,100,0,0.2)]"
            : revealed
              ? "border-green-800 shadow-[0_0_20px_2px_rgba(0,180,80,0.15)]"
              : stoppedAtHidden
                ? "border-yellow-800 shadow-[0_0_16px_2px_rgba(200,160,0,0.2)]"
                : "border-stone-800"
        }`}
      >
        <SiteMapView
          grid={displayGrid}
          onCellClick={handleClick}
          explorerPos={explorerPos ?? undefined}
          className="h-[58vh] w-[58vw] max-w-[520px]"
        />
      </div>

      <button
        onClick={handleReset}
        className="rounded bg-stone-800 px-4 py-1.5 text-xs text-stone-500 transition hover:bg-stone-700 hover:text-stone-300"
      >
        Reset
      </button>
    </div>
  )
}

export default {
  title: "App/SiteMap/HiddenPassage",
  parameters: { layout: "fullscreen" },
}

export const FindThePassage: StoryObj = {
  render: () => <HiddenPassageDemo />,
  name: "Find the Hidden Passage",
}
