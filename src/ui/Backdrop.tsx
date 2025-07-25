import type { FC, PropsWithChildren } from "react"

const colors: Record<string, string> = {
  "sky-50": "oklch(97.7% 0.013 236.62)",
  "sky-100": "oklch(95.1% 0.026 236.824)",
  "sky-200": "oklch(90.1% 0.058 230.902)",
  "sky-300": "oklch(82.8% 0.111 230.318)",
  "sky-400": "oklch(74.6% 0.16 232.661)",
  "sky-500": "oklch(68.5% 0.169 237.323)",
  "sky-600": "oklch(54.6% 0.245 262.881)",
  "sky-700": "oklch(48.8% 0.243 264.376)",
  "sky-800": "oklch(42.4% 0.199 265.638)",
  "sky-900": "oklch(39.1% 0.09 240.876)",
  "sky-950": "oklch(29.3% 0.066 243.157)",
  "sand-50": "oklch(98.7% 0.022 95.277)",
  "sand-100": "oklch(96.2% 0.059 95.617)",
  "sand-200": "oklch(92.4% 0.12 95.746)",
  "sand-300": "oklch(87.9% 0.169 91.605)",
  "sand-400": "oklch(82.8% 0.189 84.429)",
  "sand-500": "oklch(76.9% 0.188 70.08)",
  "sand-600": "oklch(66.6% 0.179 58.318)",
  "sand-700": "oklch(55.5% 0.163 48.998)",
  "sand-800": "oklch(47.3% 0.137 46.201)",
  "sand-900": "oklch(41.4% 0.112 45.904)",
  "sand-950": "oklch(27.9% 0.077 45.635)",
}

// prettier-ignore
const skyTop = ["sky-300", "sky-300", "sky-400", "sky-400", "sky-500", "sky-500", "sky-600", "sky-700", "sky-800", "sky-900", "sky-950"]
// prettier-ignore
const skyMiddle = ["sky-100", "sky-200", "sky-200", "sky-300", "sky-300", "sky-400", "sky-400", "sky-500", "sky-600", "sky-700", "sky-800"]
// prettier-ignore
const skyBottom = ["sky-100", "sky-200", "sky-200", "sky-300", "sky-300", "sky-400", "sand-300", "sand-400", "sand-500", "sand-400", "sky-800"]

// prettier-ignore
const sandTop = ["sand-100", "sand-100", "sand-200", "sand-200", "sand-300", "sand-300", "sand-400", "sand-400", "sand-500", "sand-500", "sand-600"]
// prettier-ignore
const sandBottom = ["sand-300", "sand-400", "sand-400", "sand-500", "sand-500", "sand-600", "sand-600", "sand-700", "sand-700", "sand-800", "sand-900"]

export const Backdrop: FC<PropsWithChildren<{ levelNr: number }>> = ({
  children,
  levelNr,
}) => {
  const step = levelNr % (2 * skyTop.length)
  const actualStep = step < skyTop.length ? step : 2 * skyTop.length - step - 1

  return (
    <div
      className="relative flex flex-col h-dvh bg-gradient-to-b from-0% via-40% to-55% from-(--sky-top) via-(--sky-middle) to-(--sky-bottom) transition-colors duration-6000 [container-type:size]"
      style={{
        "--sky-top": colors[skyTop[actualStep]],
        "--sky-middle": colors[skyMiddle[actualStep]],
        "--sky-bottom": colors[skyBottom[actualStep]],
        "--sun-offset": `${5 + actualStep * 5}cqh`,
      }}
    >
      <div className="absolute size-20 rounded-full bg-yellow-200 z-0 transition-transform translate-x-1/1 translate-y-(--sun-offset) duration-6000"></div>
      <div
        className="absolute inset-0 z-10 flex-1 flex-col flex items-center justify-center transition-colors duration-6000 bg-gradient-to-b from-transparent from-49% via-50% via-(--sand-top) to-(--sand-bottom)"
        style={{
          "--sand-top": colors[sandTop[actualStep]],
          "--sand-bottom": colors[sandBottom[actualStep]],
        }}
      >
        {children}
      </div>
    </div>
  )
}
