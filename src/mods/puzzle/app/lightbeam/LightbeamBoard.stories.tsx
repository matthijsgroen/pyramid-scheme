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

// Switch nodes. These boards are hand-authored to ask one question: can you follow a wire with a finger
// across a board that is already this busy.

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
 * Wizard density with two wires over it, at the 318px the encounter modal gives the board. Dark, then
 * carrying with the wires crossing, then carrying with them apart.
 *
 * A crossing was unreadable while both wires were the same green; a colour each is what fixed it, which
 * left wire separation a nicety rather than a generation gate beside `piecesAreSpaced`.
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
 * A generated wizard board with a door on it. Left as it opens, right answered. Its wiring names two
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
 * A route that crosses itself. The crossed square is the one square on the board provably empty — anything
 * standing there would have turned the first pass. Left as it opens, right answered.
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

// The diagonal-cut mirror. Every frame below is a real trace of a real configuration.

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

/** A generated wizard board, cut mirrors swapped in for four of its eight turn mirrors. */
const cutWizard = withCuts(wizard, { 0: [1, 6], 3: [2, 6, 7], 8: [2, 7], 9: [1, 3, 6] })
/** The same swap on the board that also carries a door and its sockets — the busiest frame the family has. */
const cutDoors = withCuts(wizardDoors, { 0: [1, 6], 2: [1, 6], 7: [2, 7], 8: [2, 7] })

/**
 * A six-step diagonal run at the size the family ships at. The disc shines along the bottom row into a cut
 * mirror whose shallow stop carries the light up-right to a shrine no square beam here could reach. Stone
 * hugs the run in three places, two cells at a time, so the light is seen going between the corners.
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
 * A generated wizard board with every turn mirror swapped for a cut one, lit by a beam that goes diagonally
 * across a wire's rivet — found by search, and common enough on real boards to be worth a frame.
 * Uniqueness is gone once every mirror is cut, so this is a picture of the geometry rather than a puzzle.
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
 * Do the two stops of one cut mirror read as a pair? Left is every piece on its first stop, right on its
 * second, so each column is one piece turning: an ordinary turn mirror 90° apart as the control, then two
 * cut mirrors 67.5° apart. Two thirds of a right angle is plenty — what it costs is the *feel* of the turn,
 * which is the tell that this is a different kind of piece.
 *
 * Columns 1 and 3 in the left frame are both at 45° and must still be told apart. The ticks do it: their
 * other stops are at 135° and 157.5°, so the marks sit in different places.
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
 * Does a full board read, or is it a field of marks? Every mirror carries at least one tick, and a wizard
 * grid holds nine of them. Both boards are generated at the size the modal gives them; four of the eight
 * turn mirrors are retrofitted to three- and two-stop lists so forks differ in size as well as angle.
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
 * Does a diagonal beam read as light, and does the corner it turns read as a gap?
 *
 * Left, the run at the size it ships at, with stone hugging it in three places so the light is seen going
 * between the corners. Right, a beam corner landing exactly on a wire's rivet — a diagonal beam turns at
 * cell corners and rivets are drawn at corners, so the endpoints can coincide, and on real boards they do.
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
 * The first boards a player will actually be handed with a cut mirror on them: master and wizard route **diagonally on purpose**, so the winning beam leaves the rows and
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
 * The mechanic as a player meets it: the route itself is the diagonal, so the last leg runs corner to
 * corner into a shrine set in the frame and the piece's other stop is the plain quarter turn.
 *
 * A diagonal end is marked at the cell centre rather than the face it meets, because for a diagonal entry
 * that face is a corner — the one point that means "it got through" everywhere else on the board.
 *
 * Then the two diagonal deaths, off the grid and into stone, and last a crossing that meets at 45° rather
 * than 90°. It still reads as one square the beam goes through twice: both passes bend at the same centre.
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
