import type { FC, ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useTranslation } from "react-i18next"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import type { ControlStep } from "@/ui/molecules/ControlsBlock"
import { RushHourRules } from "./rushHour/RushHourRules"
import { useRushHourControls } from "./rushHour/rushHourControls"
import { ConstellationRules } from "./constellation/ConstellationRules"
import { useConstellationControls } from "./constellation/constellationControls"
import { SudokuRules } from "./sudoku/SudokuRules"
import { useSudokuControls } from "./sudoku/sudokuControls"

const noop = () => {}

// The shell as each family hands it over, with the board left out: the pills and the rules box are what is shown.
const Panel: FC<{ title: string; goal: string; rules: ReactNode; controls: ControlStep[] }> = ({
  title,
  goal,
  rules,
  controls,
}) => (
  <div className="relative flex w-full max-w-sm flex-col items-center gap-4">
    <PuzzleFamilyShell
      onSolved={noop}
      onCancel={noop}
      undo={{ onPress: noop, enabled: true }}
      hint="—"
      title={title}
      goal={goal}
      rules={rules}
      controls={controls}
    >
      {() => <div className="h-16" />}
    </PuzzleFamilyShell>
  </div>
)

const Families: FC = () => {
  const { t } = useTranslation("common")
  const rushHour = useRushHourControls()
  const constellation = useConstellationControls()
  const sudoku = useSudokuControls(6)
  return (
    <div className="flex min-h-screen flex-wrap items-start justify-center gap-6 bg-stone-900 p-6">
      <Panel
        title={t("rushHour.name.default")}
        goal={t("rushHour.goal.default")}
        rules={<RushHourRules skin="default" />}
        controls={rushHour}
      />
      <Panel
        title={t("constellation.name.default")}
        goal={t("constellation.goal.default")}
        rules={<ConstellationRules skin="default" />}
        controls={constellation}
      />
      <Panel
        title={t("sudoku.name.default")}
        goal={t("sudoku.goal.default")}
        rules={<SudokuRules skin="default" />}
        controls={sudoku}
      />
    </div>
  )
}

const meta = {
  title: "Puzzle/Controls",
  component: Families,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Families>

export default meta
type Story = StoryObj<typeof meta>

/** Keyboard: each family's keycaps one step a line, the shell's undo, hint and back closing the block. */
export const Keys: Story = { globals: { input: "keys" } }

/** An Xbox pad, the look every pad that is not a PlayStation gets. */
export const PadXbox: Story = { globals: { input: "pad", pad: "xbox" } }

/** A PlayStation pad: shapes on dark buttons, L1/R1 for the shoulders. */
export const PadPlayStation: Story = { globals: { input: "pad", pad: "playstation" } }

/** Touch: no block and no glyphs on the pills; the rules box is what it was. */
export const Touch: Story = { globals: { input: "touch" } }
