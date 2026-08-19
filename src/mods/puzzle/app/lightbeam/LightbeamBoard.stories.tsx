import type { Meta, StoryObj } from "@storybook/react-vite"
import type { FC } from "react"
import { useState } from "react"
import {
  BACKSLASH,
  DIR,
  isCut,
  pieceOptions,
  pieceStateCount,
  SLASH,
  traceBeam,
  TURN_ANGLES,
  type LightbeamPuzzleData,
  type MirrorAngle,
} from "@/mods/puzzle/game/lightbeam/beam"
import {
  generateLightbeam,
  type LightbeamOptions,
  type LightbeamPuzzle,
} from "@/mods/puzzle/game/lightbeam/generateLightbeam"
import { LIGHTBEAM_CONFIG } from "@/mods/puzzle/game/lightbeam/lightbeamConfig"
import { createLightbeamState, cycleLightbeamPiece } from "@/mods/puzzle/game/lightbeam/lightbeamState"
import { buildLightbeamHint } from "./lightbeamHint"
import { LightbeamBoard } from "./LightbeamBoard"

const meta = {
  title: "Puzzle/LightbeamBoard",
  component: LightbeamBoard,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dungeon", values: [{ name: "dungeon", value: "#110d08" }] },
  },
} satisfies Meta<typeof LightbeamBoard>

export default meta
type Story = StoryObj<typeof meta>

const board = (difficulty: keyof typeof LIGHTBEAM_CONFIG, seed: number, extra: LightbeamOptions = {}) => {
  const { size, ...options } = LIGHTBEAM_CONFIG[difficulty]
  return generateLightbeam(size, seed, { ...options, ...extra })
}

const starter = board("starter", 1)
const expert = board("expert", 2)
const wizard = board("wizard", 4)
/** A generated wizard board, which since §11.1 landed means one carrying a door and its two sockets. */
const wizardDoors = board("wizard", 11)
/** A generated wizard board whose winning route folds back through its own line (`crossings`). */
const wizardCrossing = board("wizard", 2)

/** How the board opens: dark, with the beam running out somewhere it should not. */
export const Starter: Story = { args: { puzzle: starter, states: starter.initial, onCycle: () => {} } }

/** The same board answered — the beam bends the whole way and the shrine takes the light. */
export const Solved: Story = { args: { puzzle: starter, states: starter.solution, onCycle: () => {} } }

/** Sliding pieces and a decoy. A vacant stop keeps its dashed outline, so its track shows before it is tapped. */
export const Expert: Story = { args: { puzzle: expert, states: expert.initial, onCycle: () => {} } }

/** The widest board the family ships. Seven squares still measure a thumb across on a 360px screen. */
export const Wizard: Story = { args: { puzzle: wizard, states: wizard.initial, onCycle: () => {} } }

/** Playable, so the beam can be watched moving. Each tap cycles one piece. */
export const Playable: Story = {
  args: { puzzle: expert, states: expert.initial, onCycle: () => {} },
  render: () => {
    const [state, setState] = useState(() => createLightbeamState(expert))
    return (
      <LightbeamBoard
        puzzle={expert}
        states={state.states}
        onCycle={piece => setState(prev => cycleLightbeamPiece(prev, expert, piece))}
      />
    )
  },
}

// ---------------------------------------------------------------------------------------------------
// Switch nodes (design doc §11.1) — the drawing, prototyped ahead of the logic.
//
// The doc's own warning is that the wire layer, not the reasoning, is what kills this mechanic: the board
// already carries cells, a beam, glyphs, movable rings, dashed ghost tracks and end markers at 35px a
// cell. So these boards are hand-authored to ask one question — can you follow a wire with a finger
// across a board that is already this busy — and nothing about firing is implemented yet.
//
// That is what keeps them honest. A node fires when the light crosses it, and in every pair below the
// piece the wire drives is ALREADY in the state the node would drive it to, so each frame is a real trace
// of a real configuration. What is missing is only the transition between them.
// ---------------------------------------------------------------------------------------------------

/** The door. A wall stands on the route, and the socket that clears it is upstream of the wall. */
const doorBoard: LightbeamPuzzleData = {
  size: 8,
  sun: { at: { row: 3, col: 0 }, facing: DIR.right },
  shrine: { row: 6, col: 0 },
  fixed: [{ kind: "mirror", at: { row: 6, col: 3 }, angle: SLASH }],
  movable: [
    { kind: "turnMirror", at: { row: 3, col: 3 }, angles: TURN_ANGLES },
    {
      kind: "slidingWall",
      stops: [
        { row: 6, col: 1 },
        { row: 4, col: 1 },
      ],
    },
  ],
  nodes: [{ at: { row: 5, col: 3 } }],
  wirings: [{ from: [0], piece: 1, to: 1 }],
}

/** The trap. The same shape inverted: crossing this socket drops stone in front of the shrine. */
const trapBoard: LightbeamPuzzleData = {
  size: 8,
  sun: { at: { row: 2, col: 0 }, facing: DIR.right },
  shrine: { row: 0, col: 4 },
  fixed: [],
  movable: [
    { kind: "turnMirror", at: { row: 2, col: 4 }, angles: TURN_ANGLES },
    {
      kind: "slidingWall",
      stops: [
        { row: 4, col: 1 },
        { row: 1, col: 4 },
      ],
    },
  ],
  nodes: [{ at: { row: 4, col: 4 } }],
  wirings: [{ from: [0], piece: 1, to: 1 }],
}

/**
 * The worst case, and the one that decides it: a real generated wizard board — nine movable pieces,
 * their ghost tracks, a five-bend route — with two long wires laid across the busiest part of it.
 *
 * Both sockets sit on this board's winning route, and each drives its piece to the state that route
 * needs — so in the solved frame both wires carry and both pieces stand where a fired node would have
 * put them. Wiring a node to any other state would draw a lit wire beside a piece that had not moved,
 * which is exactly the lie these stories exist to avoid.
 */
const wizardWired: LightbeamPuzzleData = {
  ...wizard,
  nodes: [{ at: { row: 4, col: 5 } }, { at: { row: 6, col: 5 } }],
  wirings: [
    { from: [0], piece: 5, to: 0 },
    { from: [1], piece: 4, to: 2 },
  ],
}

/**
 * The same two sockets, the second rewired to a piece on the far side of the board. Nothing about the
 * drawing differs — only which cells the wires have to reach, and therefore whether they run into each
 * other. That is the whole argument for making wire separation a generation gate rather than a rendering
 * problem: the renderer cannot fix the pair above, and does not have to.
 */
const wizardWiredApart: LightbeamPuzzleData = {
  ...wizard,
  nodes: [{ at: { row: 2, col: 4 } }, { at: { row: 6, col: 5 } }],
  wirings: [
    { from: [0], piece: 5, to: 0 },
    { from: [1], piece: 4, to: 2 },
  ],
}

/**
 * Fan-out: one socket, three pieces. Crossing it sets all of them at once, and the board says so without
 * a word — the three pieces wearing the socket's colour are the three it drives, and every other piece
 * keeps its white outline meaning "yours".
 */
const wizardFanOut: LightbeamPuzzleData = {
  ...wizard,
  nodes: [{ at: { row: 2, col: 4 } }],
  wirings: [
    { from: [0], piece: 5, to: 0 },
    { from: [0], piece: 8, to: 0 },
    { from: [0], piece: 9, to: 1 },
  ],
}

/**
 * Fan-in: two sockets, one piece, and it does not move until the light has been through both. A different
 * problem from a door — not "reach that square" but "reach these two squares, with one beam" — and the
 * piece wears both their colours, split round its edge, so the demand is visible on the thing being
 * demanded of rather than only along the wires.
 */
const wizardFanIn: LightbeamPuzzleData = {
  ...wizard,
  nodes: [{ at: { row: 2, col: 4 } }, { at: { row: 6, col: 5 } }],
  wirings: [{ from: [0, 1], piece: 5, to: 0 }],
}

/** Every pair is shown side by side: the wires dark, then the wires carrying. */
const Pair = ({ puzzle, before, after }: { puzzle: LightbeamPuzzleData; before: number[]; after: number[] }) => (
  <div className="flex flex-wrap items-start justify-center gap-6">
    <LightbeamBoard puzzle={puzzle} states={before} onCycle={() => {}} />
    <LightbeamBoard puzzle={puzzle} states={after} onCycle={() => {}} />
  </div>
)

/**
 * A door, shut and open. Left: the mirror is turned the wrong way, the light never reaches the socket,
 * and the wire is dark stone. Right: the mirror is turned, the light crosses the socket, the wire carries
 * and the wall it drives has stood aside.
 */
export const NodeDoor: Story = {
  args: { puzzle: doorBoard, states: [0, 0], onCycle: () => {} },
  render: () => <Pair puzzle={doorBoard} before={[0, 0]} after={[1, 1]} />,
}

/**
 * A node worth steering clear of. Left: the light crosses the socket and the stone it drives has landed
 * in front of the shrine. Right: the other setting keeps the light off the socket entirely, and the
 * shrine takes it.
 */
export const NodeTrap: Story = {
  args: { puzzle: trapBoard, states: [1, 1], onCycle: () => {} },
  render: () => <Pair puzzle={trapBoard} before={[1, 1]} after={[0, 0]} />,
}

/**
 * Wizard density with two wires over it, at the 318px the encounter modal actually gives the board — the
 * frame that decides whether the mechanic can be drawn at all. Three boards, and each answers one thing:
 *
 * 1. **Dark.** Two wires as scenery over ten pieces and their ghost tracks. Both are followable, and
 *    neither competes with the beam.
 * 2. **Carrying, wires crossing.** Both sockets lit, and the two wires meet at a shared corner near the
 *    middle of the board.
 * 3. **Carrying, wires apart.** The same board with one socket moved so they never touch.
 *
 * The first cut of this story concluded that 2 was unreadable and that wire separation therefore had to be
 * a generation gate beside `piecesAreSpaced`. **Giving each socket its own colour made that wrong.** The
 * ambiguity at a crossing was never geometric — it was that both wires were the same green, so where they
 * met there was nothing to tell them apart. Two colours and the crossing reads fine, which leaves
 * separation a nicety rather than a constraint, and leaves the generator one fewer thing to fit.
 */
export const NodeDensity: Story = {
  args: { puzzle: wizardWired, states: [...wizard.solution], onCycle: () => {} },
  render: () => (
    <div className="flex flex-wrap items-start justify-center gap-6">
      <div className="w-[318px]">
        <LightbeamBoard puzzle={wizardWired} states={[...wizard.initial]} onCycle={() => {}} />
      </div>
      <div className="w-[318px]">
        <LightbeamBoard puzzle={wizardWired} states={[...wizard.solution]} onCycle={() => {}} />
      </div>
      <div className="w-[318px]">
        <LightbeamBoard puzzle={wizardWiredApart} states={[...wizard.solution]} onCycle={() => {}} />
      </div>
    </div>
  ),
}

/**
 * The two shapes a socket can take beyond a plain door, both on the same wizard board.
 *
 * Left, **fan-out**: one socket, three pieces, all of them wearing its colour. Right, **fan-in**: two
 * sockets and one piece that does not move until the light has been through both, so the piece wears both
 * colours split round its edge. Neither needs a rule explained: the outline says who owns a piece before
 * any wire is traced, and white always means yours.
 */
export const NodeFanning: Story = {
  args: { puzzle: wizardFanOut, states: [...wizard.solution], onCycle: () => {} },
  render: () => (
    <div className="flex flex-wrap items-start justify-center gap-6">
      <div className="w-[318px]">
        <LightbeamBoard puzzle={wizardFanOut} states={[...wizard.solution]} onCycle={() => {}} />
      </div>
      <div className="w-[318px]">
        <LightbeamBoard puzzle={wizardFanIn} states={[...wizard.solution]} onCycle={() => {}} />
      </div>
    </div>
  ),
}

/**
 * A **generated** wizard board with a door on it — no longer hand-authored, and no longer a picture of a
 * mechanic that does not run. The sockets fire, the doors open, and the beam drawn here is the real trace.
 *
 * Left: as it opens. Right: answered. Every wizard board carries a door now, and its wiring names two
 * sockets, so the light has to be routed through both before the stone will shift.
 */
export const NodeGenerated: Story = {
  args: { puzzle: wizardDoors, states: wizardDoors.initial, onCycle: () => {} },
  render: () => (
    <div className="flex flex-wrap items-start justify-center gap-6">
      <div className="w-[318px]">
        <LightbeamBoard puzzle={wizardDoors} states={wizardDoors.initial} onCycle={() => {}} />
      </div>
      <div className="w-[318px]">
        <LightbeamBoard puzzle={wizardDoors} states={wizardDoors.solution} onCycle={() => {}} />
      </div>
    </div>
  ),
}

/** Playable, with a door: the stone only shifts once the beam is routed through both sockets. */
export const NodePlayable: Story = {
  args: { puzzle: wizardDoors, states: wizardDoors.initial, onCycle: () => {} },
  render: () => {
    const [state, setState] = useState(() => createLightbeamState(wizardDoors))
    return (
      <LightbeamBoard
        puzzle={wizardDoors}
        states={state.states}
        onCycle={piece => setState(prev => cycleLightbeamPiece(prev, wizardDoors, piece))}
      />
    )
  },
}

/**
 * A route that crosses itself, which the family forbade until it turned out the objection did not hold.
 *
 * The crossed square is the one square on the board provably empty — anything standing there would have
 * turned the first pass — and it is the only place the beam arrives from two directions at once. Nothing in
 * the renderer needed changing for it: the beam was always drawn one polyline per `(cell, direction)`
 * segment, so a crossed square draws as a cross without being asked.
 *
 * Left as it opens, right answered.
 */
export const CrossedBeams: Story = {
  args: { puzzle: wizardCrossing, states: wizardCrossing.initial, onCycle: () => {} },
  render: () => (
    <div className="flex flex-wrap items-start justify-center gap-6">
      <div className="w-[318px]">
        <LightbeamBoard puzzle={wizardCrossing} states={wizardCrossing.initial} onCycle={() => {}} />
      </div>
      <div className="w-[318px]">
        <LightbeamBoard puzzle={wizardCrossing} states={wizardCrossing.solution} onCycle={() => {}} />
      </div>
    </div>
  ),
}

/** The board with the hint's piece and beam lit — the state after pressing Hint. */
export const WithHint: Story = {
  args: { puzzle: starter, states: starter.initial, onCycle: () => {} },
  render: () => {
    const [state, setState] = useState(() => createLightbeamState(starter))
    const hint = buildLightbeamHint(starter, state.states)
    return (
      <div className="flex flex-col items-center gap-3">
        <LightbeamBoard
          puzzle={starter}
          states={state.states}
          highlighted={hint?.cells}
          litBeam={hint?.beam}
          onCycle={piece => setState(prev => cycleLightbeamPiece(prev, starter, piece))}
        />
        <p className="text-sm text-amber-300">{hint ? hint.key : "lit"}</p>
      </div>
    )
  },
}

// ---------------------------------------------------------------------------------------------------
// The diagonal-cut mirror (design doc §11.8). Step 1 was the drawing, ahead of any logic; step 2 is the
// eight-direction walk, and it has landed — so every frame below is a real trace of a real configuration
// with nothing held back, which is what the two frames drawn first could only be by coincidence.
//
// Two of these stories answered §11.8's drawing questions and are kept because those answers still have
// to hold once light actually goes diagonally. The third is step 2's own question, and it is the one the
// handoff into step 2 flagged as cheap to look at and expensive to guess.
// ---------------------------------------------------------------------------------------------------

/** Puts authored stops on named turn mirrors, leaving everything else exactly as the generator built it. */
const withCuts = <T extends LightbeamPuzzleData>(puzzle: T, cuts: Record<number, readonly MirrorAngle[]>): T => ({
  ...puzzle,
  movable: puzzle.movable.map((piece, index) =>
    piece.kind === "turnMirror" && cuts[index] ? { ...piece, angles: cuts[index] } : piece
  ),
})

/**
 * The two stop sets against the mirror they have to be told apart from, with nothing else to read.
 *
 * The beam runs up the far column and reaches none of the three, so both frames are honest whatever the
 * pieces are set to — which is the only way to show a half-step stop before the walk can trace one.
 */
const stopSets: LightbeamPuzzleData = {
  size: 9,
  sun: { at: { row: 8, col: 8 }, facing: DIR.up },
  shrine: { row: 0, col: 0 },
  fixed: [],
  movable: [
    { kind: "turnMirror", at: { row: 4, col: 1 }, angles: TURN_ANGLES },
    { kind: "turnMirror", at: { row: 4, col: 3 }, angles: [1, 6] },
    { kind: "turnMirror", at: { row: 4, col: 5 }, angles: [2, 7] },
  ],
}

/** A generated wizard board, cut mirrors swapped in for four of its eight turn mirrors (§11.8 rule 8). */
const cutWizard = withCuts(wizard, { 0: [1, 6], 3: [2, 6, 7], 8: [2, 7], 9: [1, 3, 6] })
/** The same swap on the board that also carries a door and its sockets — the busiest frame the family has. */
const cutDoors = withCuts(wizardDoors, { 0: [1, 6], 2: [1, 6], 7: [2, 7], 8: [2, 7] })

/**
 * The mechanic at the size it ships at: a 9-wide board, 35.3px a cell, with a six-step diagonal run.
 *
 * The disc shines along the bottom row into a cut mirror. Its shallow stop sends the light up-right the
 * whole width of the board to a shrine in the right-hand wall — a shrine no square beam on this board
 * could have reached — and its steep stop is the ordinary quarter turn, straight down off the frame.
 *
 * Stone hugs the run in three places, two cells at a time, so §11.8 rule 4 is visible rather than
 * described: **a diagonal step resolves only the cell it lands in.** The light goes between the corners.
 */
const diagonalRun: LightbeamPuzzleData = {
  size: 9,
  sun: { at: { row: 8, col: 0 }, facing: DIR.right },
  shrine: { row: 2, col: 8 },
  fixed: [
    { kind: "wall", at: { row: 7, col: 2 } },
    { kind: "wall", at: { row: 8, col: 3 } },
    { kind: "wall", at: { row: 5, col: 4 } },
    { kind: "wall", at: { row: 6, col: 5 } },
    { kind: "wall", at: { row: 3, col: 6 } },
    { kind: "wall", at: { row: 4, col: 7 } },
  ],
  movable: [{ kind: "turnMirror", at: { row: 8, col: 2 }, angles: [1, BACKSLASH] }],
}

/**
 * A generated wizard board with a door on it, every turn mirror swapped for a cut one, in a configuration
 * that lights the shrine with a beam that goes diagonally **across a wire's rivet**.
 *
 * Found by search rather than authored: over 40 generated wizard boards there are 104 lit configurations
 * where a diagonal beam's corner lands exactly on a rivet, on 2 of the 40 boards — common enough that it
 * had to be looked at, which is why this frame exists. Uniqueness is gone once every mirror is cut, so
 * this is a picture of the geometry rather than a puzzle.
 */
const cutRivet = withCuts(board("wizard", 12), {
  0: [2, 7],
  1: [1, 6],
  2: [2, 7],
  3: [1, 6],
  7: [2, 7],
  8: [1, 6],
  9: [2, 7],
})

/** One board at the 318px the encounter modal gives it, which on a 9-wide grid is 35.3px a cell. */
const Frame: FC<{ puzzle: LightbeamPuzzleData; states: readonly number[]; caption: string }> = ({
  puzzle,
  states,
  caption,
}) => (
  <figure className="flex flex-col items-center gap-1">
    <div className="w-[318px]">
      <LightbeamBoard puzzle={puzzle} states={[...states]} onCycle={() => {}} />
    </div>
    <figcaption className="font-mono text-[10px] text-amber-300">{caption}</figcaption>
  </figure>
)

/**
 * **Question 1: do the two stops of one cut mirror read as a pair?** Left is every piece on its first
 * stop, right on its second — so each column is one piece turning, and the three columns are, in order:
 *
 * 1. Today's turn mirror, `/` then `\`. **90° apart**, and the control.
 * 2. A cut mirror stopping at `{22.5°, 135°}`. **67.5° apart.**
 * 3. A cut mirror stopping at `{45°, 157.5°}`. **67.5° apart.**
 *
 * Two thirds of a right angle turns out to be plenty: the shallow stop lies along the row and the steep
 * one across it, and no amount of squinting makes either look like the other. What the 22.5° short of a
 * quarter turn costs is not legibility but the *feel* of the turn — the control snaps between two
 * diagonals, and a cut mirror lands somewhere in between them, which is the tell that it is a different
 * kind of piece before its glyph is even read.
 *
 * The left frame also carries the tightest possible form of the *other* question: columns 1 and 3 are both
 * sitting at **45°**, the same angle, and must still be told apart. ~~Nothing but the glyph can be doing
 * that work.~~ **That is no longer what does it** (§11.13): there is one mirror glyph now, and what separates
 * these two cells is the **tick** — column 1's other stop is at 135° and column 3's is at 157.5°, so the
 * marks sit in different places. Strictly more than the old hollow plate said, on the same cell: not "this
 * is a different kind of piece" but "this one's other option is *there*".
 */
export const CutMirrorStops: Story = {
  args: { puzzle: stopSets, states: [0, 0, 0], onCycle: () => {} },
  render: () => (
    <div className="flex flex-wrap items-start justify-center gap-6">
      <Frame puzzle={stopSets} states={[0, 0, 0]} caption="first stop — 45° / 22.5° / 45°" />
      <Frame puzzle={stopSets} states={[1, 1, 1]} caption="second stop — 135° / 135° / 157.5°" />
    </div>
  ),
}

/**
 * **~~Question 2: does a cut mirror read as a different object?~~ — retired, and replaced by the question
 * that drawing the fork creates instead.**
 *
 * This frame used to ask whether solid bar against hollow plate could tell two kinds of mirror apart on one
 * cell. It could, and it does not matter any more: §11.13 replaced the one bit with a tick at each stop a
 * mirror is not in, so there is one glyph and no kinds. What the retirement *creates* is the opposite worry,
 * and this is the right board to ask it on:
 *
 * **Every mirror now carries at least one tick, so does a full board read, or is it a field of marks?** A
 * wizard grid holds nine turn mirrors; before, eight of them were a bare bar. Now every one of them says
 * where else it goes, which is nine or more extra strokes on a 9-wide board — and §9's bar is that a board
 * is read, not decoded. If a dense board turns to noise, the answer is not to draw the tick only on unusual
 * pieces (that is the old bit in a new coat, and it keeps the hard bare-against-one-tick reading) but to
 * make the tick quieter or shorter.
 *
 * Both boards are generated, at the size the modal gives them, with every piece of furniture the family has
 * on top: dashed tracks, ghost stops, sliding walls, sockets, wires, the two-pass beam. Four of the eight
 * turn mirrors are retrofitted to three- and two-stop lists so the forks differ in **size** as well as in
 * angle, which is what the shipped generator does not yet do (§11.13 point 2) and what this has to survive
 * before it does.
 *
 * The one thing worth keeping from the old question: the beam crosses a mirror's cell through its centre,
 * and the ticks sit out at the cell's edge where the beam is not — so amber and sky still do not fight,
 * which is §9's "nothing but light is drawn amber" paying out again.
 */
export const CutMirrorDensity: Story = {
  args: { puzzle: cutWizard, states: cutWizard.initial, onCycle: () => {} },
  render: () => (
    <div className="flex flex-wrap items-start justify-center gap-6">
      <Frame puzzle={cutWizard} states={cutWizard.initial} caption="wizard — opens" />
      <Frame puzzle={cutWizard} states={cutWizard.solution} caption="wizard — answered" />
      <Frame puzzle={cutDoors} states={cutDoors.initial} caption="wizard + door — opens" />
      <Frame puzzle={cutDoors} states={cutDoors.solution} caption="wizard + door — answered" />
    </div>
  ),
}

/**
 * **Step 2's question: does a diagonal beam read as light, and does the corner it turns read as a gap?**
 *
 * Left, the mechanic at the size it ships at. The disc shines along the bottom row into a cut mirror; its
 * shallow stop carries the light up-right the whole width of a 9-wide board — 35.3px a cell — to a shrine
 * no square beam here could reach, and its steep stop is the ordinary quarter turn, straight down off the
 * frame. Stone hugs the run in three places, two cells at a time, which is §11.8 rule 4 made visible
 * instead of written down: **a diagonal step resolves only the cell it lands in**, and the light goes
 * between the corners. Nothing in the walk implements that — it is what not implementing it looks like.
 *
 * Right, the one thing the handoff into step 2 said was cheap to look at and expensive to guess. §11.2
 * rule 1 keeps wires out of the beam's lane by giving the beam cell centres and edge midpoints and the
 * wire the grid lines; a diagonal beam turns at cell **corners**, which are on the wire's side of that
 * line, and the rivets are drawn at corners too. So the endpoints can coincide — and they do, often
 * enough that guessing was not an option: over 40 generated wizard boards with every mirror cut, 104 lit
 * configurations put a beam corner exactly on a rivet, spread over 2 boards. This is one of them, found by
 * search: the beam's corner in the cell above the right-hand door lands on that door's rivet.
 *
 * Uniqueness is gone on the right-hand board once every mirror is cut, so it is a picture of the geometry
 * rather than a puzzle. That is the whole point of the frame.
 */
export const DiagonalBeam: Story = {
  args: { puzzle: diagonalRun, states: [0], onCycle: () => {} },
  render: () => (
    <div className="flex flex-wrap items-start justify-center gap-6">
      <Frame puzzle={diagonalRun} states={[0]} caption="22.5° — six diagonal steps past six walls" />
      <Frame puzzle={diagonalRun} states={[1]} caption="135° — the quarter turn it keeps" />
      <Frame puzzle={cutRivet} states={[1, 0, 0, 0, 0, 0, 0, 0, 1, 0]} caption="a beam corner on a rivet" />
    </div>
  ),
}

/**
 * The first boards a player will actually be handed with a cut mirror on them (§11.8 rule 10 step 4, and
 * §11.12): master and wizard now route **diagonally on purpose**, so the winning beam leaves the rows and
 * columns and the piece's other stop is the quarter turn the board would have had.
 */
const diagonalMaster = board("master", 10)
const diagonalWizard = board("wizard", 12)

/** A master board whose own diagonal leg crosses a square one at 45°. */
const diagonalCrossing = board("master", 34)

/** A master board whose wrong setting leaves the grid on a diagonal — the escape marker's own case. */
const diagonalEscape = board("master", 11)

/** A wizard board whose wrong setting is swallowed by stone on a diagonal — the absorbed marker's case. */
const diagonalAbsorbed = board("wizard", 8)

/** The same board with its cut mirror on the stop that is not the answer — the ordinary quarter turn. */
const onTheWrongStop = (puzzle: LightbeamPuzzle): number[] => {
  const index = puzzle.movable.findIndex(piece => piece.kind === "turnMirror" && isCut(piece.angles))
  const states = [...puzzle.solution]
  states[index] = (states[index] + 1) % pieceStateCount(puzzle.movable[index])
  return states
}

/**
 * Whichever setting of whichever piece makes the beam die while it is travelling on a diagonal.
 *
 * Over the pieces the **player** owns, which is what `restingState` names: a door is not anyone's to set,
 * and putting one in a state no tap reaches draws a board nobody can be handed.
 */
const diagonalDeath = (puzzle: LightbeamPuzzle): number[] => {
  for (let piece = 0; piece < puzzle.movable.length; piece++)
    for (const state of pieceOptions(puzzle, piece)) {
      const states = [...puzzle.solution]
      states[piece] = state
      const walk = traceBeam(puzzle, states)
      const last = walk.path[walk.path.length - 1]
      if (walk.end !== "lit" && last && last.enter % 2 === 1) return states
    }
  return [...puzzle.solution]
}

/**
 * **The mechanic as a player meets it, and the two drawing questions step 4 had to close.**
 *
 * The route itself is the diagonal now. A cut mirror's answer is its half-step stop, so the last leg runs
 * corner to corner into a shrine set in the frame, and the piece's *other* stop is the plain quarter turn —
 * the exact inverse of the swap-in these frames used to show, where the answer was square and the wrong
 * setting was the diagonal. What a player has to read is therefore a beam that leaves the rows and columns,
 * which is the whole of what §6.4 assigns to master.
 *
 * **The marker now sits at the cell centre for a diagonal end, and both markers take it.** An absorbed beam
 * used to be dotted where it met the obstacle's face, which for a diagonal entry is the cell **corner** —
 * the one point §11.8 rule 4 gives the opposite meaning to, since diagonal light slips *between* two corners
 * everywhere else on the board, and on a 9-wide grid it lands in a four-cell junction belonging to none of
 * them. The centre says the one thing the picture has to say: the light got in and stopped there. The escape
 * marker had the same question open since §11.10 and takes the same answer, four lines apart in `BeamLayer`.
 *
 * The next two frames are the cases that were only hypothetical while no board routed diagonally: a wrong
 * setting that leaves the grid on a diagonal, and one that is swallowed by stone on a diagonal.
 *
 * **And the last is the crossing this widened.** `axisOf` used to answer `"h" | "v"`, so a crossing was a
 * right angle by construction; there are four axes now, and a row crossed by a diagonal forces exactly what
 * a row crossed by a column does — nothing can stand there, or the first pass would have turned. Measured
 * over 200 generated boards: 9 crossings at master and 13 at wizard now meet at 45° rather than 90°. It
 * draws as an X leaning over, and it still reads as one square the beam goes through twice, because a beam
 * polyline bends only at cell centres and both passes bend at the same point.
 */
export const DiagonalRoute: Story = {
  args: { puzzle: diagonalMaster, states: diagonalMaster.solution, onCycle: () => {} },
  render: () => (
    <div className="flex flex-wrap items-start justify-center gap-6">
      <Frame
        puzzle={diagonalMaster}
        states={diagonalMaster.solution}
        caption="master — the answer, five diagonal steps"
      />
      <Frame
        puzzle={diagonalMaster}
        states={onTheWrongStop(diagonalMaster)}
        caption="the wrong stop — the quarter turn it kept"
      />
      <Frame puzzle={diagonalWizard} states={diagonalWizard.solution} caption="wizard — six diagonal steps" />
      <Frame
        puzzle={diagonalEscape}
        states={diagonalDeath(diagonalEscape)}
        caption="off the frame on a diagonal — the escape marker"
      />
      <Frame
        puzzle={diagonalAbsorbed}
        states={diagonalDeath(diagonalAbsorbed)}
        caption="into stone on a diagonal — the absorbed marker"
      />
      <Frame
        puzzle={diagonalCrossing}
        states={diagonalCrossing.solution}
        caption="a crossing at 45° — a diagonal over a column, and over a row"
      />
    </div>
  ),
}
