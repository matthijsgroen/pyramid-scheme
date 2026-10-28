import type { Meta, StoryObj } from "@storybook/react-vite"
import { useEffect, useState, type FC, type ReactNode } from "react"
import { CampScene } from "@/ui/atoms/CampScene"
import { NewBadge } from "@/ui/atoms/NewBadge"
import { fullFound } from "@/ui/atoms/campScene/campLayout"
import { CAMP_CATALOGUE } from "@/ui/atoms/campScene/campCatalogue"
import { ContinueCard } from "@/ui/molecules/ContinueCard"
import { HaulRow } from "@/ui/molecules/HaulRow"

// The camp's UI colours (the `@theme` tokens in src/index.css) laid over the starter camp, so the see-through
// panels are judged on the scene they blur. Below the swatches, today's components stand beside story-local
// copies dressed in the tokens.

type Swatch = { token: string; hex: string; from: string }

const RAMPS: { name: string; role: string; swatches: Swatch[] }[] = [
  {
    name: "parchment",
    role: "panels, cards, chips, rules — the tent canvas",
    swatches: [
      { token: "parchment-50", hex: "#FFF8EA", from: "card" },
      { token: "parchment-100", hex: "#F4EAD5", from: "panel" },
      { token: "parchment-200", hex: "#E9DCBF", from: "chip" },
      { token: "parchment-300", hex: "#D6C4A0", from: "rule" },
      { token: "parchment-400", hex: "#B8A584", from: "dashed" },
    ],
  },
  {
    name: "ink",
    role: "text — the tent's shadows",
    swatches: [
      { token: "ink-500", hex: "#7B5B3A", from: "muted" },
      { token: "ink-600", hex: "#5C4A36", from: "label" },
      { token: "ink-700", hex: "#4A3B2A", from: "body" },
      { token: "ink-800", hex: "#3A2E22", from: "sketch" },
      { token: "ink-900", hex: "#2B2118", from: "text, outline" },
    ],
  },
  {
    name: "ochre",
    role: "primary buttons, NEW, badges — fire and reed mats",
    swatches: [
      { token: "ochre-100", hex: "#F5D9C7", from: "tint" },
      { token: "ochre-300", hex: "#D58B56", from: "reed mat" },
      { token: "ochre-400", hex: "#C25E30", from: "campfire" },
      { token: "ochre-500", hex: "#A3401A", from: "accent" },
      { token: "ochre-600", hex: "#8A3515", from: "hover" },
      { token: "ochre-700", hex: "#6E2A12", from: "pressed" },
      { token: "ochre-800", hex: "#451D19", from: "tent shadow" },
    ],
  },
  {
    name: "faience",
    role: "selected, links, info — the starter rank's turquoise",
    swatches: [
      { token: "faience-100", hex: "#CDE8E4", from: "tint" },
      { token: "faience-300", hex: "#7FC4C0", from: "on night" },
      { token: "faience-500", hex: "#2E8A88", from: "faience" },
      { token: "faience-600", hex: "#23706F", from: "fill" },
      { token: "faience-700", hex: "#1C5A5C", from: "text" },
    ],
  },
  {
    name: "night",
    role: "HUD, dark screens — the sky",
    swatches: [
      { token: "night-200", hex: "#C9CFE2", from: "on night" },
      { token: "night-600", hex: "#475481", from: "star cloth" },
      { token: "night-700", hex: "#3A4566", from: "sketch" },
      { token: "night-800", hex: "#27304A", from: "HUD" },
      { token: "night-900", hex: "#1B2236", from: "coming home" },
      { token: "night-950", hex: "#0F1733", from: "sky top" },
    ],
  },
  {
    name: "ember",
    role: "glow, focus, coins — the fire's light",
    swatches: [
      { token: "ember-200", hex: "#FFE3A8", from: "glow" },
      { token: "ember-300", hex: "#FFD27A", from: "spark" },
      { token: "ember-400", hex: "#EAB54B", from: "window glass" },
      { token: "ember-500", hex: "#E0A526", from: "coins, focus" },
      { token: "ember-600", hex: "#B87F14", from: "deep" },
      { token: "ember-700", hex: "#855A0C", from: "deepest" },
    ],
  },
]

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** The text colour that reads best on a swatch, and by how much. */
const textOn = (hex: string) => {
  const dark = contrast("#2B2118", hex)
  const light = contrast("#FFF8EA", hex)
  return dark >= light
    ? { color: "#2B2118", label: `ink ${dark.toFixed(1)}` }
    : { color: "#FFF8EA", label: `card ${light.toFixed(1)}` }
}

const useViewport = () => {
  const read = () => ({ width: window.innerWidth, height: window.innerHeight })
  const [size, setSize] = useState(read)
  useEffect(() => {
    const onResize = () => setSize(read())
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])
  return size
}

const Glass: FC<{ children: ReactNode; className?: string }> = ({ children, className = "" }) => (
  <section
    className={`rounded-[18px] border-2 border-camp-ink bg-camp-glass-solid p-4 text-camp-ink supports-backdrop-filter:bg-camp-glass supports-backdrop-filter:backdrop-blur-md ${className}`}
  >
    {children}
  </section>
)

const SwatchChip: FC<Swatch> = ({ token, hex, from }) => {
  const text = textOn(hex)
  return (
    <div className="flex w-26 flex-col overflow-hidden rounded-[10px] border-[1.5px] border-camp-rule bg-camp-card">
      <div
        className="flex h-14 items-end p-1.5 text-[11px] font-extrabold"
        style={{ background: hex, color: text.color }}
      >
        {text.label}
      </div>
      <div className="flex flex-col px-1.5 py-1 text-[11px] leading-tight">
        <span className="font-extrabold">{token}</span>
        <span className="font-mono text-camp-label">{hex}</span>
        <span className="text-camp-muted">{from}</span>
      </div>
    </div>
  )
}

const PAIRS: [string, string, string, number][] = [
  ["ink-900 on parchment-100", "#2B2118", "#F4EAD5", 4.5],
  ["ink-900 on parchment-50", "#2B2118", "#FFF8EA", 4.5],
  ["ink-700 on parchment-100", "#4A3B2A", "#F4EAD5", 4.5],
  ["ink-600 on parchment-100", "#5C4A36", "#F4EAD5", 4.5],
  ["ink-600 on parchment-200", "#5C4A36", "#E9DCBF", 4.5],
  ["ink-500 on parchment-100", "#7B5B3A", "#F4EAD5", 3],
  ["parchment-50 on ochre-500", "#FFF8EA", "#A3401A", 4.5],
  ["parchment-50 on ochre-600", "#FFF8EA", "#8A3515", 4.5],
  ["ochre-500 on parchment-50", "#A3401A", "#FFF8EA", 4.5],
  ["faience-700 on parchment-100", "#1C5A5C", "#F4EAD5", 4.5],
  ["faience-700 on parchment-200", "#1C5A5C", "#E9DCBF", 4.5],
  ["parchment-50 on faience-700", "#FFF8EA", "#1C5A5C", 4.5],
  ["parchment-100 on night-800", "#F4EAD5", "#27304A", 4.5],
  ["night-200 on night-800", "#C9CFE2", "#27304A", 4.5],
  ["parchment-200 on night-900", "#E9DCBF", "#1B2236", 4.5],
  ["ember-300 on night-900", "#FFD27A", "#1B2236", 4.5],
  ["ink-900 on ember-500", "#2B2118", "#E0A526", 4.5],
  ["ink-600 on glass over night-950", "#5C4A36", "#C6C0B5", 4.5],
]

const ContrastTable: FC = () => (
  <table className="w-full text-left text-[13px]">
    <tbody>
      {PAIRS.map(([label, fg, bg, need]) => {
        const ratio = contrast(fg, bg)
        return (
          <tr key={label} className="border-t border-camp-rule">
            <td className="py-1 pr-2">
              <span className="rounded px-1.5 py-0.5 font-extrabold" style={{ background: bg, color: fg }}>
                Aa
              </span>
            </td>
            <td className="py-1 pr-2">{label}</td>
            <td className="py-1 pr-2 font-mono">{ratio.toFixed(2)}</td>
            <td className={`py-1 font-extrabold ${ratio >= need ? "text-camp-select" : "text-camp-accent"}`}>
              {ratio >= need ? "pass" : "fail"} {need}:1
            </td>
          </tr>
        )
      })}
    </tbody>
  </table>
)

const SEMANTIC: [string, string][] = [
  ["camp-paper", "parchment-100"],
  ["camp-card", "parchment-50"],
  ["camp-chip", "parchment-200"],
  ["camp-rule", "parchment-300"],
  ["camp-dashed", "parchment-400"],
  ["camp-ink", "ink-900"],
  ["camp-ink-soft", "ink-700"],
  ["camp-label", "ink-600"],
  ["camp-muted", "ink-500"],
  ["camp-accent", "ochre-500"],
  ["camp-accent-hover", "ochre-600"],
  ["camp-on-accent", "parchment-50"],
  ["camp-select", "faience-700"],
  ["camp-night", "night-800"],
  ["camp-night-deep", "night-900"],
  ["camp-on-night", "night-200"],
  ["camp-glow", "ember-500"],
  ["camp-glass", "parchment-100 at 80%"],
  ["camp-glass-solid", "parchment-100 at 95%"],
]

// Story-local copies in the tokens. The changes they propose: the selected tab and an info hint in faience
// (ochre stays for NEW and the one thing to press), the focus ring in ember.

const TokenTabs: FC<{ tabs: string[] }> = ({ tabs }) => (
  <div className="flex gap-1.5 rounded-xl bg-camp-chip p-1 text-camp-ink">
    {tabs.map((tab, i) => (
      <span
        key={tab}
        className={`flex h-11 flex-1 items-center justify-center rounded-[9px] px-3 text-[13px] font-extrabold ${i === 0 ? "bg-camp-select text-camp-card" : ""}`}
      >
        {tab}
      </span>
    ))}
  </div>
)

const TodayTabs: FC<{ tabs: string[] }> = ({ tabs }) => (
  <div className="flex gap-1.5 rounded-xl bg-[#E9DCBF] p-1 text-[#2B2118]">
    {tabs.map((tab, i) => (
      <span
        key={tab}
        className={`flex h-11 flex-1 items-center justify-center rounded-[9px] px-3 text-[13px] font-extrabold ${i === 0 ? "bg-[#2B2118] text-[#FFF8EA]" : ""}`}
      >
        {tab}
      </span>
    ))}
  </div>
)

const TokenHaulRow: FC<{ title: string; note: string; badge?: string; visual: ReactNode }> = ({
  title,
  note,
  badge,
  visual,
}) => (
  <div className="flex items-center gap-3 rounded-[10px] border-2 border-transparent bg-camp-paper p-2.5 text-camp-ink lg:border-camp-rule lg:bg-camp-card">
    <span className="relative flex size-10 flex-none overflow-hidden rounded-lg">{visual}</span>
    <span className="flex flex-1 flex-col gap-px">
      <span className="text-[15px] font-extrabold">{title}</span>
      <span className="text-[13px] text-camp-label">{note}</span>
    </span>
    {badge && (
      <span className="rounded-[10px] bg-camp-accent px-2 py-0.5 text-xs font-extrabold text-camp-on-accent">
        {badge}
      </span>
    )}
  </div>
)

const TokenContinueCard: FC = () => (
  <div className="flex flex-col gap-3 text-camp-ink">
    <div className="flex flex-col gap-2.5 rounded-[14px] border-2 border-camp-ink bg-camp-card p-4 lg:p-[18px]">
      <div className="text-xs font-extrabold tracking-widest text-camp-label uppercase">Verder met</div>
      <div className="flex flex-col gap-0.5">
        <div className="font-pyramid text-lg lg:text-xl">Vallei van de Ambachtslieden</div>
        <div className="text-sm text-camp-label">Piramide 3 van 5 · Junior</div>
      </div>
      <button
        type="button"
        className="h-13 w-full rounded-xl bg-camp-accent px-4 text-[17px] font-extrabold text-camp-on-accent outline-offset-2 hover:bg-camp-accent-hover focus-visible:outline-2 focus-visible:outline-camp-glow"
      >
        Op pad
      </button>
    </div>
    <div className="flex items-center gap-2.5 rounded-xl bg-camp-chip px-3 py-2.5 text-sm">
      <span className="size-2.5 flex-none rounded-full bg-faience-600" />
      <span>2 oude reizen hebben iets nieuws te ontdekken</span>
    </div>
  </div>
)

const HUD_TODAY = "flex h-14 items-center justify-between rounded-xl bg-[#27304A]/90 px-4 text-[#F4EAD5]"
const HUD_TOKENS = "flex h-14 items-center justify-between rounded-xl bg-camp-night/90 px-4 text-camp-paper"

const Side: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <div className="flex min-w-0 flex-1 flex-col gap-3">
    <h3 className="text-xs font-extrabold tracking-widest text-camp-label uppercase">{title}</h3>
    {children}
  </div>
)

const Compare: FC<{ title: string; today: ReactNode; tokens: ReactNode }> = ({ title, today, tokens }) => (
  <Glass>
    <h2 className="mb-3 font-pyramid text-xl">{title}</h2>
    <div className="flex flex-col gap-4 sm:flex-row">
      <Side title="Today">{today}</Side>
      <Side title="Tokens">{tokens}</Side>
    </div>
  </Glass>
)

const coin = <span className="size-full bg-ember-500" />
const tile = <span className="size-full bg-faience-600" />

const PalettePage: FC = () => {
  const { width, height } = useViewport()
  return (
    <div className="relative h-screen overflow-hidden">
      <div className="absolute inset-0">
        <CampScene width={width} height={height} chapter="starter" found={fullFound(CAMP_CATALOGUE, "starter")} />
      </div>
      <div className="absolute inset-0 overflow-auto px-4 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          <Glass>
            <h1 className="font-pyramid text-2xl">Camp palette</h1>
            <p className="mt-1 text-sm text-camp-ink-soft">
              Tailwind colours: <code>bg-parchment-100</code>, <code>text-ink-600</code>, or by job{" "}
              <code>bg-camp-paper</code>. This panel is <code>camp-glass</code> with the backdrop blurred.
            </p>
            <div className="mt-4 flex flex-col gap-4">
              {RAMPS.map(ramp => (
                <div key={ramp.name} className="flex flex-col gap-1.5">
                  <div className="text-sm">
                    <span className="font-extrabold">{ramp.name}</span>{" "}
                    <span className="text-camp-label">— {ramp.role}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ramp.swatches.map(swatch => (
                      <SwatchChip key={swatch.token} {...swatch} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Glass>
          <div className="flex flex-col gap-4 lg:flex-row">
            <Glass className="flex-1">
              <h2 className="mb-2 font-pyramid text-xl">Contrast</h2>
              <ContrastTable />
            </Glass>
            <Glass className="lg:w-80">
              <h2 className="mb-2 font-pyramid text-xl">By job</h2>
              <ul className="text-[13px]">
                {SEMANTIC.map(([name, token]) => (
                  <li key={name} className="flex justify-between gap-2 border-t border-camp-rule py-1">
                    <span className="font-mono">{name}</span>
                    <span className="text-camp-label">{token}</span>
                  </li>
                ))}
              </ul>
            </Glass>
          </div>
          <Compare
            title="Popup tabs"
            today={<TodayTabs tabs={["Hiërogliefen", "Schatten"]} />}
            tokens={<TokenTabs tabs={["Hiërogliefen", "Schatten"]} />}
          />
          <Compare
            title="Haul row"
            today={
              <>
                <HaulRow visual={coin} title="+85 munten" note="Losse munten onderweg" />
                <HaulRow visual={tile} title="Bronzen waterkruik" note="Nieuw in je kamp" badge="NIEUW" />
              </>
            }
            tokens={
              <>
                <TokenHaulRow visual={coin} title="+85 munten" note="Losse munten onderweg" />
                <TokenHaulRow visual={tile} title="Bronzen waterkruik" note="Nieuw in je kamp" badge="NIEUW" />
              </>
            }
          />
          <Compare
            title="Continue card"
            today={
              <ContinueCard
                heading="Verder met"
                journeyName="Vallei van de Ambachtslieden"
                detail="Piramide 3 van 5 · Junior"
                setOffLabel="Op pad"
                hint={{ text: "2 oude reizen hebben iets nieuws te ontdekken" }}
              />
            }
            tokens={<TokenContinueCard />}
          />
          <Compare
            title="HUD and NEW badge"
            today={
              <div className={HUD_TODAY}>
                <span className="font-pyramid">Kamp</span>
                <span className="text-sm text-[#C9CFE2]">
                  Verzameling <NewBadge label="NIEUW" />
                </span>
              </div>
            }
            tokens={
              <div className={HUD_TOKENS}>
                <span className="font-pyramid">Kamp</span>
                <span className="text-sm text-camp-on-night">
                  Verzameling{" "}
                  <span className="rounded-full bg-camp-accent px-1.5 py-px text-[10px] font-extrabold text-camp-on-accent">
                    NIEUW
                  </span>
                </span>
              </div>
            }
          />
        </div>
      </div>
    </div>
  )
}

const meta = {
  parameters: { layout: "fullscreen" },
  render: () => <PalettePage />,
} satisfies Meta

export default meta

export const CampPalette: StoryObj<typeof meta> = {}
