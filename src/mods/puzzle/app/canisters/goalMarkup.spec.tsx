import { beforeAll, describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { createInstance, type i18n as I18n } from "i18next"
import { I18nextProvider, Trans } from "react-i18next"
import commonEn from "../../../../../public/locales/en/common.json"
import commonNl from "../../../../../public/locales/nl/common.json"

/**
 * The goal sets the amount asked for apart from the sentence, and `Trans` is what lets the translator
 * decide where in the sentence that falls (Dutch puts it before the verb, English after).
 *
 * **Worth a real i18next rather than the suite's identity `t`.** A tag in the locale file that the screen
 * does not map renders as the raw key or drops the number silently — nothing about that fails a
 * typecheck, and the mocked `t` the rest of these specs use cannot see it either.
 */
describe("the amount in the goal", () => {
  let i18n: I18n

  beforeAll(async () => {
    i18n = createInstance()
    await i18n.init({
      lng: "en",
      fallbackLng: "en",
      interpolation: { escapeValue: false },
      // Mirrors src/i18n/index.ts: the app names common as the default namespace, which is what lets a
      // `Trans` resolve a bare key. An instance without it renders the key itself.
      defaultNS: "common",
      ns: ["common"],
      resources: { en: { common: commonEn }, nl: { common: commonNl } },
    })
  })

  const goal = (lng: string) => {
    i18n.changeLanguage(lng)
    return render(
      <I18nextProvider i18n={i18n}>
        <Trans i18nKey="canisters.goal.default" values={{ target: 4 }} components={{ amount: <strong /> }} />
      </I18nextProvider>
    )
  }

  it.each(["en", "nl"])("is set in bold, in %s", lng => {
    const { container } = goal(lng)
    const strong = container.querySelector("strong")
    expect(strong, `${lng} rendered no <strong> — the tag in the locale file is not mapped`).not.toBeNull()
    expect(strong?.textContent).toBe("4")
  })

  it.each(["en", "nl"])("still reads as a sentence around it, in %s", lng => {
    const { container } = goal(lng)
    // The raw key leaking through is the other way this fails, and it looks fine until you read it.
    expect(container.textContent).not.toContain("canisters.goal")
    expect(container.textContent).toContain("4")
    expect(container.textContent?.length).toBeGreaterThan(20)
  })
})
