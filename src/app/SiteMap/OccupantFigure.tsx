import { CELL } from "./mapScale"
import { CHAR_H, CHAR_W, FIGURE_LIT, FOOT_LIFT, FootShadow } from "./ExplorerDot"
import type { RoomOccupant } from "./roomOccupants"

/** A stand-in bust is a shade wider than a figure, so a face at map size is still somebody's. */
const BUST_W = CHAR_W * 1.2
/** A portrait's face frame is 250x375 (character-art-prompts.md §3), so its height follows from the width. */
const BUST_H = BUST_W * 1.5
/** A wide portrait carries 100px of the figure behind it on its left, past the 250 face frame. */
const WIDE = 350 / 250

/** The dead are lit like everyone else, with a cold rim in place of the torch's warm one: the explorer's
 * flame is not theirs. */
const GHOST_LIT = "brightness(1.08) drop-shadow(0 0 4px rgba(170,235,225,0.55))"
const GHOST_OPACITY = 0.7

/**
 * Somebody standing in a room, in cell-local units around the spot they stand on — the explorer's own
 * frame, feet on the floor line. A painted figure gets the explorer's foot shadow; a stand-in bust does
 * not, having no feet to cast one.
 */
export const OccupantFigure = ({ occupant }: { occupant: RoomOccupant }) => {
  const sprite = occupant.kind === "sprite"
  const w = sprite ? CHAR_W : BUST_W
  const h = sprite ? CHAR_H : BUST_H
  return (
    <>
      {sprite && <FootShadow />}
      <div
        data-occupant={occupant.id}
        data-occupant-kind={occupant.kind}
        style={{
          position: "absolute",
          left: -w / 2,
          top: CELL / 2 - h - FOOT_LIFT,
          width: w,
          height: h,
          backgroundImage: `url(${occupant.src})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: sprite ? "100% 100%" : `${occupant.wide ? w * WIDE : w}px ${h}px`,
          // The face frame of a wide portrait is its right-hand side.
          backgroundPosition: sprite ? undefined : "right bottom",
          opacity: occupant.translucent ? GHOST_OPACITY : undefined,
          filter: occupant.translucent ? GHOST_LIT : FIGURE_LIT,
          pointerEvents: "none",
        }}
      />
    </>
  )
}
