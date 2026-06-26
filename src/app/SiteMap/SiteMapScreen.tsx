import { useCallback, useMemo, useState } from "react"
import { assembleFloor } from "@/game/siteAssembler"
import { completeCell, getCell } from "@/game/gridNavigation"
import { generateSumplete } from "@/game/generateSumplete"
import { hashString } from "@/support/hashString"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"
import { SiteMapView } from "./SiteMapView"
import { ExplorerDot } from "./ExplorerDot"
import { SumpleteBoard } from "@/app/PuzzleFamilies/Sumplete/SumpleteBoard"
import { useJourneys } from "@/app/state/useJourneys"

type Props = {
  journeyId: string
  siteConfig: FloorConfig
  seed: number
  onSiteComplete: () => void
  onCancel: () => void
}

const parsePos = (s: string): readonly [number, number] => {
  const [r, c] = s.split(",").map(Number)
  return [r, c]
}
const encodePos = (row: number, col: number): string => `${row},${col}`

const applyEdges = (grid: FloorGrid, solvedEdges: string[]): FloorGrid =>
  solvedEdges.reduce((g, edgeId) => {
    const [r, c] = parsePos(edgeId)
    return completeCell(g, r, c)
  }, grid)

export const SiteMapScreen = ({ journeyId, siteConfig, seed, onSiteComplete, onCancel }: Props) => {
  const journeys = useJourneys()
  const solvedEdges = journeys.getSolvedEdges(journeyId)
  const journeyState = journeys.getJourney(journeyId)

  // ponytail: assemble once per seed; solved edges reconstruct completed state on top
  const baseGrid = useMemo(() => {
    const result = assembleFloor(journeyId, siteConfig, seed)
    return result.success ? result.grid : null
  }, [journeyId, siteConfig, seed])

  const grid = useMemo(() => (baseGrid ? applyEdges(baseGrid, solvedEdges) : null), [baseGrid, solvedEdges])

  const explorerPos: readonly [number, number] = useMemo(() => {
    if (!grid) return [0, 0]
    const pos = journeyState?.position
    return pos ? parsePos(pos) : grid.entrancePos
  }, [grid, journeyState?.position])

  // active puzzle: [row, col] or null
  const [activePuzzlePos, setActivePuzzlePos] = useState<readonly [number, number] | null>(null)

  const activePuzzle = useMemo(() => {
    if (!activePuzzlePos) return null
    const edgeId = encodePos(activePuzzlePos[0], activePuzzlePos[1])
    // ponytail: fixed 3×3 sumplete for all puzzle rooms; difficulty scaling in Phase 6
    return generateSumplete(3, hashString(journeyId + edgeId))
  }, [activePuzzlePos, journeyId])

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!grid) return
      const cell = getCell(grid, row, col)
      if (!cell || cell.type !== "room") return
      if (cell.state !== "reachable") return

      if (cell.roomType === "entrance") {
        // Phase 4 adds the entrance seal; for now just complete it
        const edgeId = encodePos(row, col)
        journeys.markEdgeSolved(edgeId)
        journeys.updatePosition(journeyId, edgeId)
      } else if (cell.roomType === "puzzle") {
        setActivePuzzlePos([row, col])
      } else if (cell.roomType === "fork") {
        // Fork is a free branch point — completing it reveals adjacent branches
        const edgeId = encodePos(row, col)
        journeys.markEdgeSolved(edgeId)
        journeys.updatePosition(journeyId, edgeId)
      } else if (cell.roomType === "exit") {
        onSiteComplete()
      } else if (cell.roomType === "treasure") {
        // Phase 6 wires treasure rewards; for now just collect
        const edgeId = encodePos(row, col)
        journeys.markEdgeSolved(edgeId)
        journeys.updatePosition(journeyId, edgeId)
      }
    },
    [grid, journeys, journeyId, onSiteComplete]
  )

  const handlePuzzleSolved = useCallback(() => {
    if (!activePuzzlePos) return
    const edgeId = encodePos(activePuzzlePos[0], activePuzzlePos[1])
    journeys.markEdgeSolved(edgeId)
    journeys.updatePosition(journeyId, edgeId)
    setActivePuzzlePos(null)
  }, [activePuzzlePos, journeys, journeyId])

  if (!grid) {
    return <div className="p-4 text-red-400">Site layout unavailable.</div>
  }

  return (
    <div className="relative flex flex-col items-center">
      <button
        onClick={onCancel}
        className="absolute top-2 left-2 z-10 rounded bg-stone-800 px-3 py-1 text-sm text-amber-200"
      >
        ← Back
      </button>
      <div className="relative">
        <SiteMapView grid={grid} onCellClick={handleCellClick} explorerPos={explorerPos} />
        <ExplorerDot grid={grid} pos={explorerPos} />
      </div>
      {activePuzzle && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center gap-4 rounded-lg border border-amber-900 bg-stone-900 p-4">
            <SumpleteBoard
              grid={activePuzzle.grid}
              rowTargets={activePuzzle.rowTargets}
              colTargets={activePuzzle.colTargets}
              onSolved={handlePuzzleSolved}
            />
            <button onClick={() => setActivePuzzlePos(null)} className="text-sm text-stone-400 hover:text-stone-200">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
