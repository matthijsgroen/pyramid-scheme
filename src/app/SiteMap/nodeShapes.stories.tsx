import type { Meta, StoryObj } from "@storybook/react-vite"
import type { CellState } from "../../game/siteTypes"
import type { ShapeKind } from "./nodeKinds"
import { NodeShape } from "./nodeShapes"

// THE LOOK, away from a floor: every marker at every state, in one grid, so a new shape (or a palette
// change to an old one) can be judged beside its neighbours rather than one at a time. This is the story
// Task 6's brief asks to be opened to compare the handle's lever against the switch's bare path and the
// gate's bars — the closest shapes on the map — at map zoom, over both grounds the game actually uses.

const meta = {
  component: NodeShape,
  parameters: { layout: "centered" },
} satisfies Meta<typeof NodeShape>

export default meta
type Story = StoryObj<typeof meta>

const STATES: CellState[] = ["fogged", "visible", "reachable"]

// Only the kinds a room actually stands as (portal kinds — entrance/stairhead/exit — read off position,
// not off a room's own family/tags, so they're left out of a "which room is this" comparison).
const KINDS: ShapeKind[] = ["puzzle", "trap", "fork", "switch", "handle", "gate", "treasure"]

const Grid = ({ ground }: { ground: string }) => (
  <table style={{ borderCollapse: "collapse", background: ground }}>
    <thead>
      <tr>
        <th style={{ padding: 8 }} />
        {STATES.map(state => (
          <th key={state} style={{ padding: 8, color: "#888", fontSize: 12, fontWeight: "normal" }}>
            {state}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {KINDS.map(kind => (
        <tr key={kind}>
          <td style={{ padding: 8, color: "#888", fontSize: 12, textAlign: "right" }}>{kind}</td>
          {STATES.map(state => (
            <td key={state} style={{ padding: 8 }}>
              <svg width={48} height={48} viewBox="-24 -24 48 48">
                <NodeShape type={kind} state={state} />
              </svg>
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
)

export const OnLimestone: Story = {
  args: { type: "handle", state: "reachable" },
  render: () => <Grid ground="#b9b6ae" />,
}

export const OnGranite: Story = {
  args: { type: "handle", state: "reachable" },
  render: () => <Grid ground="#14110d" />,
}
