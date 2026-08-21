import type { Meta, StoryObj } from "@storybook/react-vite"
import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import { TRAP_TIME_LIMITS_SECONDS } from "@/mods/trap/game/trapConfig"
import { generate } from "@/mods/trap/game/clockReflex/generate"
import { ClockReflexChallenge } from "./ClockReflexChallenge"

const meta = {
  title: "Trap/ClockReflexChallenge",
  component: ClockReflexChallenge,
  parameters: {
    layout: "centered",
    backgrounds: { default: "trap", values: [{ name: "trap", value: "#0a0806" }] },
  },
  args: {
    question: generate(3, "expert"),
    timeLimit: TRAP_TIME_LIMITS_SECONDS.expert,
    onPass: () => {},
    onFail: () => {},
  },
} satisfies Meta<typeof ClockReflexChallenge>

export default meta
type Story = StoryObj<typeof meta>

export const Expert: Story = {}

/** Half hours and eight seconds — the first face the game ever asks anyone to read against a clock. */
export const Starter: Story = {
  args: { question: generate(2, "starter"), timeLimit: TRAP_TIME_LIMITS_SECONDS.starter },
}

/** Single minutes in four seconds. */
export const Wizard: Story = {
  args: { question: generate(5, "wizard"), timeLimit: TRAP_TIME_LIMITS_SECONDS.wizard },
}

/** Every tier's question, to see how far apart the four readings sit as the grid gets finer. */
export const EveryTier: Story = {
  render: () => (
    <div className="flex flex-wrap gap-8">
      {difficulties.map((difficulty: Difficulty) => (
        <div key={difficulty} className="flex flex-col items-center gap-2">
          <span className="text-xs text-stone-400 uppercase">{difficulty}</span>
          <ClockReflexChallenge
            question={generate(9, difficulty)}
            timeLimit={TRAP_TIME_LIMITS_SECONDS[difficulty]}
            onPass={() => {}}
            onFail={() => {}}
          />
        </div>
      ))}
    </div>
  ),
}
