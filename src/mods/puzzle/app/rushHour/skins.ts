import { RUSH_HOUR_META } from "@/mods/puzzle/game/rushHour/meta"
import marketGround from "@/assets/rushHour/market/ground.webp"
import marketPiece2 from "@/assets/rushHour/market/piece2.webp"
import marketPiece3 from "@/assets/rushHour/market/piece3.webp"
import marketPlayer from "@/assets/rushHour/market/player.webp"
import marketWall from "@/assets/rushHour/market/wall.webp"
import { faceFor, withAmbience } from "../faceFor"

/**
 * What this mechanic's place looks like, and how a room works out which place it is.
 *
 * **Two faces: nowhere, and a market lane.** `default` is deliberately no place at all — blocks in lanes,
 * told apart by their shape and their size. `market` is the same board painted as sledges jammed in an
 * Egyptian market street, which is what lets the family carry the `trade` tag (`meta.ts`).
 *
 * **A face either paints itself or it does not.** A painted face fills `art`, and the board stretches each
 * image over the box it had already sized; a face that leaves `art` undefined keeps the plain fills below
 * and nothing else changes. So a third face is a table entry and a block of sentences, not a change to the
 * board (`docs/game-design/art-pipeline.md` §A).
 */
export type RushHourSkin = {
  /** Which place this is, as its own name — the goal, the rules and every hint sentence are keyed on it. */
  name: string
  /** The ground the lanes are cut into, and the line between two cells. */
  ground: string
  seam: string
  /** A piece that is in the way, and the player's own. Shapes, not just fills — see the board. */
  piece: string
  pieceEdge: string
  player: string
  playerEdge: string
  /** The way out, on the east edge of the player's own lane. */
  exit: string
  /**
   * A walled cell, and the stripes across it.
   *
   * **It has to read as a DIFFERENT KIND of thing from a piece, not as a darker one.** Dark-on-dark was the
   * first attempt and it failed in play: the eye takes a black cell on a stone ground for empty floor, and a
   * board where you cannot see what pinned you is unreadable. So the cell is hatched — the one treatment on
   * this board that no piece wears, and one that survives being small.
   */
  wall: string
  wallHatch: string
  /** What a hint argues from and the piece it is ABOUT. */
  evidence: string
  focus: string
  /** What the player's piece wears as it leaves (`puzzle-screens.md` §3). */
  celebrate: string
  /**
   * The painted face, if this one has been drawn.
   *
   * **Each image is stretched over the box the board already computed**, which is what keeps the art
   * honest: a piece's length is decided by the grid and the picture obeys it, so a hull can never claim a
   * cell it does not own (`rush-hour.md` §5). A vertical piece is the horizontal image turned 90°, which
   * only works because the art carries no lighting direction.
   */
  art?: { ground: string; piece2: string; piece3: string; player: string; wall: string }
}

const SKINS: Record<string, RushHourSkin> = {
  /**
   * **Blocks in a stone frame** — the plainest possible face, and the one the mechanic reads as before it
   * is dressed as anywhere. Everything that carries meaning is geometry: a piece's LENGTH is how many
   * cells it owns, its long axis is the lane it may slide along, and the player's own piece is the one
   * with a nose pointing at the way out.
   *
   * **The player's piece is a shape before it is a colour.** It is the one piece on the board whose
   * identity a player must never doubt, and colour alone would fail a player who reads no hue
   * (`puzzle-screens.md` §2) — so it carries a pointed end no other piece has, and the amber is the
   * second signal rather than the first.
   */
  default: {
    name: "default",
    ground: "bg-stone-900",
    seam: "rgb(120 113 108 / 0.25)",
    piece: "bg-stone-600",
    pieceEdge: "border-stone-500",
    player: "bg-amber-500",
    playerEdge: "border-amber-300",
    exit: "bg-amber-400/70",
    wall: "bg-stone-950 ring-1 ring-stone-500/60 ring-inset",
    wallHatch: "rgba(214,211,209,0.38)",
    evidence: "ring-sky-300/60",
    focus: "ring-amber-300",
    celebrate: "animate-flare",
  },

  /**
   * **The market lane** — the same blockade as a street of loaded sledges, and the face that lets this
   * family claim `trade`.
   *
   * **The painted pieces say the same things the plain ones did, and say them the same way.** Length is
   * still the rule and still comes from the grid; the player's own is still the one piece with a pointed
   * end, now a prow rather than a clipped corner. What the art adds is the second signal on top of the
   * first — warm cedar against the grey working sledges — never a signal of its own.
   *
   * The walled cell keeps its hatch over the painted slab, because a stone block that reads as cargo is
   * the exact failure the hatch exists to prevent (see `wall` above).
   */
  market: {
    name: "market",
    ground: "bg-stone-900",
    seam: "rgb(120 113 108 / 0.25)",
    piece: "bg-transparent",
    pieceEdge: "border-stone-500/70",
    player: "bg-transparent",
    playerEdge: "border-amber-300",
    exit: "bg-amber-400/70",
    wall: "bg-stone-950 ring-1 ring-stone-500/60 ring-inset",
    wallHatch: "rgba(214,211,209,0.22)",
    evidence: "ring-sky-300/60",
    focus: "ring-amber-300",
    celebrate: "animate-flare",
    art: {
      ground: marketGround,
      piece2: marketPiece2,
      piece3: marketPiece3,
      player: marketPlayer,
      wall: marketWall,
    },
  },
}

/** Which place this room is, resolved the way every family resolves it (`app/faceFor.ts`). */
export const skinFor = (role: string | string[] | undefined, theme: string | undefined, board = 0): RushHourSkin =>
  withAmbience(SKINS[faceFor(RUSH_HOUR_META.faces, role, theme, Object.keys(SKINS), board)] ?? SKINS.default, theme)
