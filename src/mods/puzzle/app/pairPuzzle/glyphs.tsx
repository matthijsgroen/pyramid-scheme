import { useId, type FC } from "react"

/**
 * The drawings of the pair boards (mummy rest and dung beetles). Their own module because a file that exports components may
 * export nothing else, and the skin table is not a component.
 *
 * All are silhouettes, a shape and not a colour, so they read at arm's length and without any hue.
 */

/**
 * The sarcophagus printed on the board: a lidded stone case standing upright, wide at the shoulders and
 * narrowing to the foot, with a band across the lid.
 *
 * It is an outline with a solid band, where the mummy is solid throughout, and the skin draws it muted on a
 * darker tile while the mummy stands dark and larger, so the two never read as the same thing at a glance.
 */
export const Sarcophagus: FC = () => (
  <svg viewBox="-50 -50 100 100" className="size-full" aria-hidden focusable="false">
    <g fill="none" stroke="currentColor" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M -17 -42 L 17 -42 L 27 -22 L 21 38 L -21 38 L -27 -22 Z" />
    </g>
    <g fill="currentColor">
      <circle cx={0} cy={-26} r={9} />
      <path d="M -17 -6 L 17 -6 L 16 4 L -16 4 Z" />
      <path d="M -15 14 L 15 14 L 14 24 L -14 24 Z" />
    </g>
  </svg>
)

/**
 * The piece the player places: a wrapped mummy standing upright, a head over a body bound in bands.
 *
 * The wrappings are gaps cut through the shape with a mask, so they show whatever ground the square has and
 * the drawing carries no colour of its own.
 */
export const Mummy: FC = () => {
  // One mask per drawing: a board draws many mummies, and a shared id would point them all at the first.
  const wrappings = useId()
  return (
    <svg viewBox="-50 -50 100 100" className="size-full" aria-hidden focusable="false">
      <mask id={wrappings} maskUnits="userSpaceOnUse" x={-50} y={-50} width={100} height={100}>
        <rect x={-50} y={-50} width={100} height={100} fill="white" />
        <g fill="none" stroke="black" strokeWidth={5} strokeLinecap="round">
          <path d="M -19 0 L 19 6 M -20 14 L 20 20 M -20 28 L 20 34" />
          <path d="M -8 -34 L 8 -30" />
        </g>
      </mask>
      <g fill="currentColor" mask={`url(#${wrappings})`}>
        <circle cx={0} cy={-30} r={13} />
        <path d="M -17 -14 L 17 -14 L 21 40 L -21 40 Z" />
      </g>
    </svg>
  )
}

/**
 * The dung ball printed on the board: a round ball with a few pits cut out of it, muted on a darker tile.
 * Round and without legs, where the beetle is long and has them, so the two differ in outline and not only
 * in colour.
 */
export const DungBall: FC = () => {
  const pits = useId()
  return (
    <svg viewBox="-50 -50 100 100" className="size-full" aria-hidden focusable="false">
      <mask id={pits} maskUnits="userSpaceOnUse" x={-50} y={-50} width={100} height={100}>
        <rect x={-50} y={-50} width={100} height={100} fill="white" />
        <g fill="black">
          <circle cx={-14} cy={-14} r={5} />
          <circle cx={12} cy={-6} r={4} />
          <circle cx={-4} cy={12} r={5} />
          <circle cx={16} cy={20} r={3.5} />
        </g>
      </mask>
      <circle cx={0} cy={0} r={38} fill="currentColor" mask={`url(#${pits})`} />
    </svg>
  )
}

/**
 * The piece the player places: a dung beetle seen from above, head to the top, with a wing-case split down
 * its back and three legs a side. The split is a gap cut through the shell with a mask, so the drawing
 * carries no colour of its own.
 */
export const DungBeetle: FC = () => {
  const split = useId()
  return (
    <svg viewBox="-50 -50 100 100" className="size-full" aria-hidden focusable="false">
      <mask id={split} maskUnits="userSpaceOnUse" x={-50} y={-50} width={100} height={100}>
        <rect x={-50} y={-50} width={100} height={100} fill="white" />
        <path d="M 0 -8 L 0 34" stroke="black" strokeWidth={4} strokeLinecap="round" />
      </mask>
      <g fill="none" stroke="currentColor" strokeWidth={6} strokeLinecap="round">
        <path d="M -16 -4 L -40 -16 M -18 10 L -44 10 M -15 24 L -38 38" />
        <path d="M 16 -4 L 40 -16 M 18 10 L 44 10 M 15 24 L 38 38" />
        <path d="M -9 -38 L -16 -46 M 9 -38 L 16 -46" />
      </g>
      <g fill="currentColor">
        <path d="M -14 -26 L 14 -26 L 10 -38 L -10 -38 Z" />
        <ellipse cx={0} cy={11} rx={22} ry={30} mask={`url(#${split})`} />
      </g>
    </svg>
  )
}
