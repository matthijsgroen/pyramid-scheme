import { useEffect, type FC, type ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useTranslation } from "react-i18next"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { RushHourRules } from "./rushHour/RushHourRules"
import { useRushHourControls } from "./rushHour/rushHourControls"
import { ConstellationRules } from "./constellation/ConstellationRules"
import { useConstellationControls } from "./constellation/constellationControls"
import { SudokuRules } from "./sudoku/SudokuRules"
import { useSudokuControls } from "./sudoku/sudokuControls"

const noop = () => {}

// The shell as each family hands it over, with the board left out: only the rules box is under review.
const Panel: FC<{ title: string; goal: string; rules: ReactNode; controls: ReturnType<typeof useSudokuControls> }> = ({
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
        title="Rush hour"
        goal={t("rushHour.goal.default")}
        rules={<RushHourRules skin="default" />}
        controls={rushHour}
      />
      <Panel
        title="Constellation"
        goal={t("constellation.goal.default")}
        rules={<ConstellationRules skin="default" />}
        controls={constellation}
      />
      <Panel title="Sudoku" goal={t("sudoku.goal.default")} rules={<SudokuRules skin="default" />} controls={sudoku} />
    </div>
  )
}

// The brand a pad wears, as the gamepad source would mark it on <html>.
const PadBrand: FC<{ brand?: string; children: ReactNode }> = ({ brand, children }) => {
  useEffect(() => {
    const root = document.documentElement
    if (brand) root.dataset.pad = brand
    else delete root.dataset.pad
    return () => void delete root.dataset.pad
  }, [brand])
  return children
}

const meta = {
  title: "Spikes/Controls block",
  component: Families,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Families>

export default meta
type Story = StoryObj<typeof meta>

/** Keyboard: keycaps for each family, the shell's own undo, hint and leave closing the block. */
export const Keys: Story = { globals: { input: "keys" } }

/** A pad: Xbox buttons, the look an unknown pad gets. */
export const Pad: Story = { globals: { input: "pad" } }

/** A PlayStation pad: shapes on dark buttons, L1/R1 for the shoulders. */
export const PadPlayStation: Story = {
  globals: { input: "pad" },
  render: () => (
    <PadBrand brand="playstation">
      <Families />
    </PadBrand>
  ),
}

/** Touch: no block at all, the rules box is what it was. */
export const Touch: Story = { globals: { input: "touch" } }
