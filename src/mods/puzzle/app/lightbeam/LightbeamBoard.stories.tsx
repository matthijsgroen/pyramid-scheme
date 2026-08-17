import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import type { LightbeamPuzzleData } from "@/mods/puzzle/game/lightbeam/beam"
import { generateLightbeam } from "@/mods/puzzle/game/lightbeam/generateLightbeam"
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

const board = (difficulty: keyof typeof LIGHTBEAM_CONFIG, seed: number) => {
  const { size, ...options } = LIGHTBEAM_CONFIG[difficulty]
  return generateLightbeam(size, seed, options)
}

const starter = board("starter", 1)
const expert = board("expert", 2)
const wizard = board("wizard", 4)
/** A generated wizard board, which since §12.1 landed means one carrying a door and its two sockets. */
const wizardDoors = board("wizard", 11)

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
// Switch nodes (design doc §12.1) — the drawing, prototyped ahead of the logic.
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
  sun: { at: { row: 3, col: 0 }, facing: "right" },
  shrine: { row: 6, col: 0 },
  fixed: [{ kind: "mirror", at: { row: 6, col: 3 }, face: "/" }],
  movable: [
    { kind: "turnMirror", at: { row: 3, col: 3 }, faces: ["/", "\\"] },
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
  sun: { at: { row: 2, col: 0 }, facing: "right" },
  shrine: { row: 0, col: 4 },
  fixed: [],
  movable: [
    { kind: "turnMirror", at: { row: 2, col: 4 }, faces: ["/", "\\"] },
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
