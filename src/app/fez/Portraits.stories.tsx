import type { Meta, StoryObj } from "@storybook/react-vite"
import type { FC, ReactNode } from "react"
import type { Speaker } from "./arrivalConversation"
import { Portrait } from "./Portrait"
import { BASES, FACES, PORTRAITS, POSE_PARTS, POSES, portraitFor, portraitPart, type PortraitArt } from "./portraits"

type Args = { mirrorExplorer: boolean }

const SPEAKERS = Object.keys(PORTRAITS) as Speaker[]

const Backdrop: FC<{ children: ReactNode }> = ({ children }) => (
  // The app pins the page to one screen, so the backdrop scrolls itself.
  <div className="h-screen space-y-10 overflow-auto bg-stone-900 p-6 text-stone-100">{children}</div>
)

/** The conversation's portrait at half size; the explorer mirrored as there unless the toggle is off. */
const Cell: FC<{ speaker: Speaker; art: PortraitArt | undefined; mirrorExplorer: boolean; label?: string }> = ({
  speaker,
  art,
  mirrorExplorer,
  label,
}) => (
  <div className="flex flex-col items-center gap-1">
    {art ? (
      <div style={{ zoom: 0.5 }}>
        <Portrait speaker={speaker} art={art} mirrored={mirrorExplorer ? undefined : false} />
      </div>
    ) : (
      <div className="flex h-24 w-25 items-center justify-center text-2xl text-stone-500">—</div>
    )}
    {label && <span className="text-xs text-stone-300">{label}</span>}
  </div>
)

const SpeakerGrid: FC<{ speaker: Speaker; mirrorExplorer: boolean }> = ({ speaker, mirrorExplorer }) => (
  <section>
    <h2 className="mb-2 text-lg font-bold capitalize">{speaker}</h2>
    <table className="border-separate border-spacing-2">
      <thead>
        <tr>
          <th className="text-left text-xs text-stone-400">base \ face</th>
          {FACES.map(face => (
            <th key={face} className="text-sm font-semibold">
              {face}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {BASES.map(base => (
          <tr key={base}>
            <th className="pr-2 text-right text-sm font-semibold">{base}</th>
            {FACES.map(face => (
              <td key={face} className="rounded bg-stone-800 p-2 align-bottom">
                <Cell speaker={speaker} art={portraitPart(speaker, base, face)} mirrorExplorer={mirrorExplorer} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </section>
)

const meta: Meta<Args> = {
  parameters: { layout: "fullscreen" },
  args: { mirrorExplorer: true },
  argTypes: { mirrorExplorer: { control: "boolean", name: "Mirror the explorer (as in conversation)" } },
}

export default meta
type Story = StoryObj<Args>

/** Every speaker's pose bases (rows) under every face (columns), drawn as a conversation draws them. */
export const Grid: Story = {
  render: ({ mirrorExplorer }) => (
    <Backdrop>
      {SPEAKERS.map(speaker => (
        <SpeakerGrid key={speaker} speaker={speaker} mirrorExplorer={mirrorExplorer} />
      ))}
    </Backdrop>
  ),
}

/** What each pose name a line is written with draws for each speaker, giving way as the game does. */
export const PoseNames: Story = {
  render: ({ mirrorExplorer }) => (
    <Backdrop>
      <table className="border-separate border-spacing-2">
        <thead>
          <tr>
            <th className="text-left text-xs text-stone-400">pose \ speaker</th>
            {SPEAKERS.map(speaker => (
              <th key={speaker} className="text-sm font-semibold capitalize">
                {speaker}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {POSES.map(pose => (
            <tr key={pose}>
              <th className="pr-2 text-right text-sm font-semibold">
                {pose}
                <div className="text-xs font-normal text-stone-400">
                  {POSE_PARTS[pose].base} + {POSE_PARTS[pose].face}
                </div>
              </th>
              {SPEAKERS.map(speaker => {
                const art = portraitFor(speaker, pose)
                return (
                  <td key={speaker} className="rounded bg-stone-800 p-2 align-bottom">
                    <Cell
                      speaker={speaker}
                      art={art}
                      mirrorExplorer={mirrorExplorer}
                      label={art && `${art.drawn.base} + ${art.drawn.face}`}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Backdrop>
  ),
}
