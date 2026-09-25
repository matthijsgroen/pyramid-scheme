import { useCallback, useEffect, useState, type FC } from "react"
import clsx from "clsx"
import { useTranslation } from "react-i18next"
import type { Direction as WayOut, RoomCell } from "@/game/siteTypes"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { usePuzzleState } from "@/mods/core/app/puzzleState"
import type { MirrorAngle } from "@/mods/core/game/beam/physics"
import { Glyph } from "@/mods/topology/app/beamGlyphs"
import { ShrineBeamBoard } from "@/mods/topology/app/shrineBeam/ShrineBeamBoard"
import type { LightbeamSwitchBoard } from "../../game/lightbeamSwitch/generateLightbeamSwitch"
import { shutWaysOut } from "../../game/lightbeamSwitch/waysOut"
import {
  createLightbeamSwitchState,
  litWayOut,
  turnSwitchMirror,
} from "../../game/lightbeamSwitch/lightbeamSwitchState"

type Props = {
  /** Already turned to face this room, so a shrine's bearing is the bearing of the door it opens. */
  board: LightbeamSwitchBoard
  /** The fork's own ways out (RoomCell.exits) — the ones carrying a `gateKeyId` are what this decides. */
  exits: RoomCell["exits"]
  /** The way out standing open as the player walks in, from the last time this board was solved. */
  openWayOut?: WayOut
  /**
   * Where the light stands: that way out opens now and the fork's others shut, and `undefined` — the
   * light reaching no shrine at all — shuts every one of them.
   */
  onRoute: (way: WayOut | undefined) => void
  onSolved: () => void
  /** Omitted where there is nowhere to go back to — a story, a spec exercising only the routing. */
  onCancel?: () => void
}

/**
 * A doorway in the wall of the junction, drawn as the arch it is: barred while it is shut, and standing
 * clear once the light is on the shrine above it.
 */
const Doorway: FC<{ open: boolean }> = ({ open }) => (
  <Glyph>
    <path
      d="M18 96 L18 44 A32 32 0 0 1 82 44 L82 96 Z"
      strokeWidth={7}
      className={clsx(open ? "fill-stone-950 stroke-amber-300" : "fill-stone-800 stroke-stone-500")}
    />
    {!open && (
      <g strokeWidth={7} strokeLinecap="round" className="stroke-stone-400">
        <line x1={34} y1={30} x2={34} y2={96} />
        <line x1={50} y1={24} x2={50} y2={96} />
        <line x1={66} y1={30} x2={66} y2={96} />
      </g>
    )}
  </Glyph>
)

/** Where each way out's door is drawn: outside the board, on the side of the room it leads out of. */
const DOOR_PLACE: Record<WayOut, string> = {
  n: "col-start-2 row-start-1",
  e: "col-start-3 row-start-2",
  s: "col-start-2 row-start-3",
  w: "col-start-1 row-start-2",
}

/**
 * The room where solving is choosing WHICH WAY ON: one beam, a shrine over every way out of the junction,
 * and the way out the light rests on is the one that stands open while the rest are shut.
 *
 * There is nothing to name before routing, because the routing is the naming. And nothing is won here —
 * the doors are the state of this board, so walking back in and sending the light elsewhere moves which
 * one is open rather than adding a second.
 */
export const LightbeamSwitchPuzzle: FC<Props> = ({ board, exits, openWayOut, onRoute, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  const [state, setState] = usePuzzleState(() => createLightbeamSwitchState(board))
  // How the board lay when the player last turned a mirror — the measure of whether that turn has LANDED,
  // which a flag set by the tap is not. The board's state is saved, so it arrives a render behind the tap
  // that changed it, and in that render the board on screen is still the one the player walked in on: for
  // a switch walked back into that is the lit board that opened the way out standing open beside it.
  const [turnedFrom, setTurnedFrom] = useState<readonly MirrorAngle[]>()
  // A turn made in THIS visit is on the board. A board walked back into stands on the routing that opened
  // the way out beside it, and that is a switch to throw again rather than a board already answered.
  const turned = turnedFrom !== undefined && state.angles.some((angle, mirror) => angle !== turnedFrom[mirror])

  const lit = litWayOut(board, state)
  const settled = turned && lit !== undefined

  // The doors are the state of this board, so they follow the light: the way it lands on opens the moment
  // it lands rather than when the banner is dismissed — a player may back out of a solved board and the
  // way they opened stays open — and a light sent nowhere leaves the fork as the assembler left it, every
  // way out shut. Only once a turn has landed, because a board still being read out of the save is dark
  // too, and that darkness would shut the way out the player walked in to find standing open.
  useEffect(() => {
    if (lit !== undefined) onRoute(lit)
    else if (turned) onRoute(undefined)
  }, [lit, turned, onRoute])

  const turn = useCallback(
    (mirror: number) => {
      if (settled) return // the door has swung; nothing may move under it
      setTurnedFrom(state.angles)
      setState(prev => turnSwitchMirror(prev, mirror))
    },
    [settled, state.angles, setState]
  )

  // What the doors say right now: the way the light is on, or — with the board still dark — the way this
  // switch was left open on an earlier visit.
  const standing = lit ?? openWayOut
  const wayName = (way: WayOut) => t(`lightbeamSwitch.way.${way}`)

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel ?? (() => {})}
      solved={settled}
      onReset={() => setState(createLightbeamSwitchState(board))}
      title={t("lightbeamSwitch.name")}
      goal={t("lightbeamSwitch.goal")}
      rules={
        <ul className="list-disc space-y-1 pl-4">
          <li>{t("lightbeamSwitch.rules.shrines")}</li>
          <li>{t("lightbeamSwitch.rules.doors")}</li>
          {/* Next to the rule it qualifies: a player who reads "the others shut" as "the rest are lost"
              plays the junction as a trap and never comes back for the branch they did not take. */}
          <li>{t("lightbeamSwitch.rules.returning")}</li>
          <li>{t("lightbeamSwitch.rules.tap")}</li>
        </ul>
      }
    >
      {({ reportInput }) => (
        <div
          className="grid w-full max-w-[min(56vh,26rem)] items-center justify-items-center gap-1"
          style={{ gridTemplateColumns: "12% minmax(0, 1fr) 12%", gridTemplateRows: "12% minmax(0, 1fr) 12%" }}
        >
          {shutWaysOut(exits).map(way => (
            <div
              key={way}
              className={clsx("size-full", DOOR_PLACE[way])}
              role="img"
              aria-label={t(standing === way ? "lightbeamSwitch.doorOpen" : "lightbeamSwitch.doorShut", {
                way: wayName(way),
              })}
            >
              <Doorway open={standing === way} />
            </div>
          ))}
          <div className="col-start-2 row-start-2 w-full">
            <ShrineBeamBoard
              grid={board.grid}
              shrines={board.shrines.map(shrine => shrine.at)}
              angles={state.angles}
              shrineLabel={shrine => wayName(board.shrines[shrine].canonicalDir)}
              onTurn={mirror => {
                reportInput()
                turn(mirror)
              }}
            />
          </div>
        </div>
      )}
    </PuzzleFamilyShell>
  )
}
