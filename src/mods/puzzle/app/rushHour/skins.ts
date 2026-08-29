import { RUSH_HOUR_META } from "@/mods/puzzle/game/rushHour/meta"
import { faceFor, withAmbience } from "../faceFor"

/**
 * What this mechanic's place looks like, and how a room works out which place it is.
 *
 * **One face today, and it is deliberately no place at all**: blocks in lanes, told apart by their shape
 * and their size. The fiction this board is for — sledges shoved along a market lane, barges warped along
 * a quay — arrives as painted art per face (`docs/game-design/puzzles/rush-hour.md` §5), and a face is
 * where that art will hang. Everything a face decides is already routed through this table, so adding one
 * is a table entry and a block of sentences, not a change to the board.
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
}

/** Which place this room is, resolved the way every family resolves it (`app/faceFor.ts`). */
export const skinFor = (role: string | string[] | undefined, theme: string | undefined, board = 0): RushHourSkin =>
  withAmbience(SKINS[faceFor(RUSH_HOUR_META.faces, role, theme, Object.keys(SKINS), board)] ?? SKINS.default, theme)
