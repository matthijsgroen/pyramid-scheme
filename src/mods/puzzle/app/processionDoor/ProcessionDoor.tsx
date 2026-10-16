import { useEffect, useMemo, useRef, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import type { SequenceFace } from "@/game/gateFace"
import { GateFacePanel, type GateFaceMarker } from "@/ui/atoms/GateFacePanel"
import { castGlyphs } from "@/mods/puzzle/game/procession/casts"
import {
  brokenMarks,
  processionOrder,
  processionSolved,
  slideBar,
  type ProcessionPuzzle,
} from "@/mods/puzzle/game/procession/procession"
import { requiredRung } from "@/mods/puzzle/game/procession/solveProcession"
import { buildProcessionHint } from "../procession/processionHint"
import { ProcessionBoard } from "../procession/ProcessionBoard"
import { skinFor } from "../procession/skins"

type Props = {
  puzzle: ProcessionPuzzle
  /** The door's sequence, as its face carries it: each step's sign and whether its tile was walked, and the read. */
  face: SequenceFace & { hidden: NonNullable<SequenceFace["hidden"]> }
  /** The door's other owners, drawn. */
  markers: readonly GateFaceMarker[]
  /** Where the player left the bars, if anywhere. */
  savedStarts?: readonly number[]
  onStarts: (starts: number[]) => void
  /** The board was solved: the order is read. Called once. */
  onRead: () => void
  /** Sends the run back to its first step; offered once the order is read. */
  onReset?: () => void
  onTurnAround: () => void
}

const SIGNS = castGlyphs("default")

/**
 * A SEQUENCE'S DOOR THAT IS READ RATHER THAN SHOWN: a procession board, one bar per step, whose one answer starts
 * the bars in the order the tiles are walked. A bar stays locked until its tile has been walked. Solved once, it
 * stays solved, and the order it shows is the walk; the door opens once that walk is made.
 */
export const ProcessionDoor: FC<Props> = ({
  puzzle,
  face,
  markers,
  savedStarts,
  onStarts,
  onRead,
  onReset,
  onTurnAround,
}) => {
  const { t } = useTranslation("common")
  const skin = skinFor()
  const { read, walked } = face.hidden
  // The k-th bar to start is step k, and wears step k's sign.
  const order = useMemo(() => processionOrder(puzzle) ?? puzzle.bars.map((_, bar) => bar), [puzzle])
  const stepOf = (bar: number) => order.indexOf(bar)
  const casting = puzzle.bars.map((_, bar) => SIGNS.indexOf(face.tiles[stepOf(bar)]?.glyph ?? -1))
  const locked = puzzle.bars.map((_, bar) => !walked[stepOf(bar)])
  const answer = useMemo(() => requiredRung(puzzle)?.starts, [puzzle])

  const [starts, setStarts] = useState<readonly number[]>(() => savedStarts ?? puzzle.bars.map(bar => bar.start))
  const shown = { starts: read && answer ? answer : starts }
  const solved = read || (locked.every(lock => !lock) && processionSolved(puzzle, shown))

  const asked = useRef(false)
  useEffect(() => {
    if (read || !solved || asked.current) return
    asked.current = true
    onRead()
  }, [read, solved, onRead])

  const [hinted, setHinted] = useState(false)
  const hint = hinted && !solved ? buildProcessionHint(puzzle, shown) : undefined

  return (
    <GateFacePanel
      title={t("procession.door.title")}
      hint={t(read ? "procession.door.read" : "procession.door.hint")}
      markers={markers}
      turnAroundLabel={t("gate.turnAround")}
      onTurnAround={onTurnAround}
    >
      <ProcessionBoard
        puzzle={puzzle}
        state={shown}
        skin={skin}
        broken={brokenMarks(puzzle, shown)}
        onFocus={() => {}}
        hintBar={hint?.bar}
        hintTick={hint?.tick}
        solved={solved}
        locked={read ? undefined : locked}
        casting={casting}
        onSlide={(bar, start) => {
          if (solved || locked[bar]) return
          const moved = slideBar(puzzle, shown, bar, start)
          if (moved === shown) return
          setStarts(moved.starts)
          onStarts([...moved.starts])
        }}
      />
      {hint && (
        <p className="text-sm text-stone-300">
          {t(`procession.hint.default.${hint.rung}`)} {t("procession.hint.default.move")}
        </p>
      )}
      {/* A hint can name any bar, so it waits until none is locked. */}
      {!solved && !hinted && locked.every(lock => !lock) && (
        <button onClick={() => setHinted(true)} className="text-sm text-amber-200 hover:text-amber-100">
          {t("procession.door.hintButton")}
        </button>
      )}
      {read && onReset && (
        <button
          onClick={onReset}
          className="rounded border border-amber-400 px-3 py-1 text-sm text-amber-200 hover:bg-amber-900/50"
        >
          {t("gateFace.reset")}
        </button>
      )}
    </GateFacePanel>
  )
}
