import { useTranslation } from "react-i18next"
import { homecomingPanels } from "@/app/homecomingRegistry"
import { useHaulLines } from "@/app/home/haulLines"
import { useHomeSave } from "@/app/home/useHomeSave"
import { campArt } from "@/ui/atoms/campScene/campArt"
import { ComingHomeScreen } from "@/ui/organisms/ComingHomeScreen"

const fireUrl = campArt("campfire")?.url

// Coming home: the fire, what the mods say about resting, and the haul since the last unpacking. The
// button is the only thing that empties the haul, so a trip's loot is never lost to a reload.
export const ComingHome = ({ onDone }: { onDone: () => void }) => {
  const { t } = useTranslation("common")
  const { haul, clearHaul } = useHomeSave()
  const lines = useHaulLines(haul)

  const unpack = async () => {
    await clearHaul()
    onDone()
  }

  return (
    <ComingHomeScreen
      title={t("camp.comingHome.title")}
      fire={fireUrl && <img src={fireUrl} alt="" className="h-full object-contain" />}
      rest={homecomingPanels().map(({ id, Component }) => (
        <Component key={id} />
      ))}
      haulTitle={t("camp.comingHome.haulTitle")}
      lines={lines.map(({ isNew, ...line }) => ({ ...line, badge: isNew ? t("camp.comingHome.new") : undefined }))}
      buttonLabel={lines.length > 0 ? t("camp.comingHome.unpack") : t("camp.comingHome.toCamp")}
      onDone={unpack}
    />
  )
}
