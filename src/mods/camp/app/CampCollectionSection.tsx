import { useState } from "react"
import type { FC } from "react"
import { useTranslation } from "react-i18next"
import type { CollectionSectionProps } from "@/app/pages/collectionSectionRegistry"
import type { CampStepTable } from "@/mods/camp/game/campSteps"
import { campArt } from "@/ui/atoms/campScene/campArt"
import { StructureRow } from "@/ui/molecules/StructureRow"
import { StructuresPanel } from "@/ui/organisms/StructuresPanel"
import { partIcon } from "./campIcons"
import { useCampProgress } from "./useCampProgress"

const NS = { ns: "camp" }

// The camp's Collection contribution: one row per started structure, its parts only in the opened row.
// One row is open at a time.
export const CampCollectionSection: FC<CollectionSectionProps & { table?: CampStepTable }> = ({
  table,
  isNew,
  newLabel,
}) => {
  const { t } = useTranslation(["camp"])
  const { startedStructures, structureProgress, save } = useCampProgress(table)
  const [open, setOpen] = useState<string | null>(null)

  return (
    <StructuresPanel>
      {startedStructures().map(structure => {
        const { found, total } = structureProgress(structure)
        const recorded = save.parts[structure] ?? []
        const fresh = (part: string) =>
          recorded.includes(part) && isNew(`${structure}/${part}`) ? newLabel : undefined
        return (
          <StructureRow
            key={structure}
            name={t(`structures.${structure}`, NS)}
            artUrl={(campArt(structure, true) ?? campArt(structure))?.url}
            found={found.length}
            total={total.length}
            parts={total.map(part =>
              recorded.includes(part)
                ? {
                    id: part,
                    name: t(`parts.${structure}.${part}`, NS),
                    iconUrl: partIcon(structure, part),
                    newLabel: fresh(part),
                  }
                : { id: part }
            )}
            open={open === structure}
            onToggle={() => setOpen(open === structure ? null : structure)}
            labels={{
              progress: t("collection.progress", { ...NS, found: found.length, total: total.length }),
              built: t("collection.built", NS),
              unknownPart: t("collection.unknownPart", NS),
              toggle: t(open === structure ? "collection.close" : "collection.open", NS),
            }}
          />
        )
      })}
    </StructuresPanel>
  )
}
