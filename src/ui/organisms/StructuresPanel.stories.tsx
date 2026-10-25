import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { StructureRow } from "@/ui/molecules/StructureRow"
import { StructuresPanel } from "./StructuresPanel"

const labels = { progress: "", built: "gebouwd", unknownPart: "???", toggle: "Onderdelen tonen" }

const rows = [
  { name: "Tent", found: 2, total: 3, parts: [{ name: "Tentstokken" }, { name: "Geweven doek" }, {}] },
  { name: "Put", found: 1, total: 4, parts: [{ name: "Putstenen" }, {}, {}, {}] },
  { name: "Vuur", found: 2, total: 2, parts: [{ name: "Tondel" }, { name: "Acaciahout" }] },
]

const Demo = () => {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="w-80">
      <StructuresPanel title="Constructies">
        {rows.map((row, index) => (
          <StructureRow
            key={row.name}
            {...row}
            labels={{ ...labels, progress: `${row.found} van ${row.total}` }}
            open={open === index}
            onToggle={() => setOpen(open === index ? null : index)}
          />
        ))}
      </StructuresPanel>
    </div>
  )
}

const meta = { component: StructuresPanel, parameters: { layout: "centered" } } satisfies Meta<typeof StructuresPanel>

export default meta
type Story = StoryObj<typeof meta>

export const ThreeRowsOneOpen: Story = { args: { title: "Constructies" }, render: () => <Demo /> }
