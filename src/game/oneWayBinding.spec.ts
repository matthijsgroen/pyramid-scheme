import { describe, expect, it } from "vitest"
import type { OneWayRealisationMeta, ResolveOneWayRealisation } from "./oneWayRealisation"
import { assembleFloor } from "./siteAssembler"
import type { FloorConfig } from "./siteTypes"
import { designerDoubleBack } from "./testSupport/forkSwitchFixtures"
import en from "../../public/locales/en/common.json"
import nl from "../../public/locales/nl/common.json"
import { defaultResolveOneWayRealisation } from "./encounterFallback"
import { resolveOneWayRealisation } from "@/mods/allOneWayRealisations"
import { MOD_ONE_WAY_REALISATIONS } from "@/mods/registeredMods"

const lookup = (locale: unknown, key: string): unknown =>
  key.split(".").reduce<unknown>((at, part) => (at as Record<string, unknown> | undefined)?.[part], locale)

const NO_PROMPT: OneWayRealisationMeta = { id: "mute", ownerMod: "test" }
const resolve: ResolveOneWayRealisation = id => (id === NO_PROMPT.id ? NO_PROMPT : resolveOneWayRealisation(id))

const sectioned: FloorConfig = {
  pathPuzzles: 2,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "upper" },
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "lower" },
  ],
  oneWays: [{ from: "upper", to: "lower" }],
}

const bind = (config: FloorConfig, realisation?: string) =>
  assembleFloor(
    "spec:binding",
    { ...config, ...(realisation ? { oneWayRealisation: realisation } : {}) },
    1,
    undefined,
    {
      resolveOneWay: resolve,
    }
  )

describe("binding a one-way to its realisation", () => {
  it("refuses a realisation that declares no prompt, naming the realisation and every one-way", () => {
    expect(bind(designerDoubleBack(), "mute")).toEqual({
      success: false,
      reasons: [
        { type: "oneWayRealisationRefused", from: "s1Chamber", to: "leftLower", realisation: "mute", why: "noPrompt" },
        { type: "oneWayRealisationRefused", from: "leftLower", to: "entrance", realisation: "mute", why: "noPrompt" },
      ],
    })
  })

  it("refuses a one-way no realisation is bound to, since there is no default", () => {
    expect(bind(sectioned)).toEqual({
      success: false,
      reasons: [{ type: "oneWayRealisationRefused", from: "upper", to: "lower", realisation: null, why: "unbound" }],
    })
  })

  it("refuses a realisation no registered mod declares, as a mod that is off would leave it", () => {
    expect(bind(sectioned, "headwind")).toEqual({
      success: false,
      reasons: [
        { type: "oneWayRealisationRefused", from: "upper", to: "lower", realisation: "headwind", why: "unknown" },
      ],
    })
  })

  it("binds a realisation that declares its prompt", () => {
    const outcomes = Array.from({ length: 60 }, (_, i) =>
      assembleFloor("spec:binding", { ...sectioned, oneWayRealisation: "zipline" }, i + 1, undefined, {
        resolveOneWay: resolve,
      })
    )
    expect(outcomes.some(result => result.success)).toBe(true)
    expect(JSON.stringify(outcomes)).not.toContain("oneWayRealisationRefused")
  })

  it("asks nothing of a floor that authors no one-way", () => {
    const plain: FloorConfig = { ...sectioned, oneWays: undefined }
    const outcomes = Array.from({ length: 10 }, (_, i) =>
      assembleFloor("spec:binding", plain, i + 1, undefined, { resolveOneWay: resolve })
    )
    expect(JSON.stringify(outcomes)).not.toContain("oneWayRealisationRefused")
  })
})

describe("the realisations a mod declares", () => {
  it("each declare a prompt that both locales write", () => {
    expect(MOD_ONE_WAY_REALISATIONS.map(r => r.id)).toContain("zipline")
    for (const { prompt } of MOD_ONE_WAY_REALISATIONS) {
      expect(prompt).toBeTypeOf("string")
      for (const locale of [en, nl]) expect(lookup(locale, prompt!)).toBeTypeOf("string")
    }
  })

  it("are what the registry-less fallback catalogue also knows, so a story and the game agree", () => {
    expect(defaultResolveOneWayRealisation(undefined)).toEqual(resolveOneWayRealisation("zipline"))
  })
})
