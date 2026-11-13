import type { Meta, StoryObj } from "@storybook/react-vite"
import { TRAP_TIME_LIMITS_SECONDS } from "@/mods/trap/game/trapConfig"
import { generate } from "@/mods/trap/game/arithmeticReflex/generate"
import { ArithmeticReflexChallenge } from "./ArithmeticReflexChallenge"

const meta = {
  title: "Trap/ArithmeticReflexChallenge",
  component: ArithmeticReflexChallenge,
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
} satisfies Meta<typeof ArithmeticReflexChallenge>

export default meta
type Story = StoryObj<typeof meta>

export const Expert: Story = {}

/**
 * The choices as a keyboard or pad player sees them, untimed so it holds still: nothing is focused as the
 * clock starts, so a stray Enter picks nothing. A digit 1–4 picks that choice outright; arrows or WASD walk
 * them (the focus is the cursor, look C) and Enter or Space picks the focused one.
 */
export const KeyboardCursor: Story = {
  args: { timeLimit: 0 },
  globals: { input: "keys" },
}
