import { use } from "react"
import { useTranslation } from "react-i18next"
import { FezContext } from "@/app/fez/context"
import { LANGUAGES, languageChoices } from "@/i18n/languages"
import { LanguageChip } from "@/ui/molecules/LanguageChip"

// A new player whose browser picked the language finds the choice here, while the camp's first conversation
// plays; afterwards it lives only in the settings.
export const WelcomeLanguageChip = () => {
  const { t, i18n } = useTranslation("common")
  const { conversation } = use(FezContext)
  if (conversation !== "welcome") return null
  const current = LANGUAGES.find(language => language.code === i18n.language) ?? LANGUAGES[0]
  return (
    <LanguageChip
      name={current.name}
      label={t("ui.language")}
      value={current.code}
      {...languageChoices(navigator.languages ?? [])}
      onChange={code => void i18n.changeLanguage(code)}
    />
  )
}
