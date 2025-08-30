import clsx from "clsx"
import type { FC } from "react"

export type ChestState = "empty" | "error" | "open"
export type ChestVariant = "vibrant" | "muted"

export const Chest: FC<{
  allowInteraction: boolean
  onClick: () => void
  label?: string
  state?: ChestState
  variant?: ChestVariant
}> = ({ allowInteraction, onClick, label, state = "empty", variant = "vibrant" }) => {
  return (
    <>
      {/* Ancient Egyptian Lock visual */}
      <div
        className={clsx(
          "relative pt-12 pb-4 transition-transform duration-200",
          allowInteraction ? "cursor-pointer hover:scale-105" : "cursor-default"
        )}
        onClick={onClick}
        role={allowInteraction ? "button" : undefined}
        aria-label={allowInteraction ? label : undefined}
      >
        {/* Ornate base platform with hieroglyphic pattern */}
        <div
          className={clsx(
            "absolute -bottom-3 left-1/2 h-4 w-28 -translate-x-1/2 rounded-sm bg-gradient-to-r shadow-xl",
            {
              "from-yellow-700 via-yellow-600 to-yellow-700": variant === "vibrant",
              "from-stone-600 via-stone-500 to-stone-600": variant === "muted",
            }
          )}
        >
          {/* Hieroglyphic decorations on base */}
          <div
            className={clsx("absolute top-1 left-2 h-1 w-1 rounded-full", {
              "bg-yellow-900": variant === "vibrant",
              "bg-stone-800": variant === "muted",
            })}
          />
          <div
            className={clsx("absolute top-1 left-4 h-1 w-2", {
              "bg-yellow-900": variant === "vibrant",
              "bg-stone-800": variant === "muted",
            })}
          />
          <div
            className={clsx("absolute top-1 left-7 h-1 w-1 rounded-full", {
              "bg-yellow-900": variant === "vibrant",
              "bg-stone-800": variant === "muted",
            })}
          />
          <div
            className={clsx("absolute top-1 right-7 h-1 w-1 rounded-full", {
              "bg-yellow-900": variant === "vibrant",
              "bg-stone-800": variant === "muted",
            })}
          />
          <div
            className={clsx("absolute top-1 right-4 h-1 w-2", {
              "bg-yellow-900": variant === "vibrant",
              "bg-stone-800": variant === "muted",
            })}
          />
          <div
            className={clsx("absolute top-1 right-2 h-1 w-1 rounded-full", {
              "bg-yellow-900": variant === "vibrant",
              "bg-stone-800": variant === "muted",
            })}
          />
        </div>

        {/* Main lock body with Egyptian styling */}
        <div
          className={clsx(
            "relative h-24 w-28 rounded-b-xl border-4 bg-gradient-to-b shadow-2xl transition-all duration-300",
            "before:absolute before:-top-1 before:left-1 before:h-3 before:w-24 before:rounded-t-lg before:content-['']",
            {
              // Vibrant colors
              "border-amber-700 from-amber-100 to-amber-200 before:bg-amber-300":
                state === "empty" && variant === "vibrant",
              "border-red-800 from-red-100 to-red-200 before:bg-red-300": state === "error" && variant === "vibrant",
              "border-emerald-800 from-emerald-100 to-emerald-200 before:bg-emerald-300":
                state === "open" && variant === "vibrant",
              // Muted colors
              "border-stone-600 from-stone-100 to-stone-200 before:bg-stone-300":
                state === "empty" && variant === "muted",
              "border-red-700 from-red-50 to-red-100 before:bg-red-200": state === "error" && variant === "muted",
              "border-emerald-700 from-emerald-50 to-emerald-100 before:bg-emerald-200":
                state === "open" && variant === "muted",
            }
          )}
        >
          {/* Egyptian decorative corners */}
          <div
            className={clsx("absolute top-1 left-1 h-2 w-2 border-t-2 border-l-2", {
              "border-amber-900": variant === "vibrant",
              "border-stone-700": variant === "muted",
            })}
          />
          <div
            className={clsx("absolute top-1 right-1 h-2 w-2 border-t-2 border-r-2", {
              "border-amber-900": variant === "vibrant",
              "border-stone-700": variant === "muted",
            })}
          />

          {/* Sacred Eye of Horus keyhole */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2">
            <div
              className={clsx("relative h-5 w-8 rounded-full transition-colors duration-300", {
                // Vibrant colors
                "bg-amber-800": state === "empty" && variant === "vibrant",
                "bg-red-900": state === "error" && variant === "vibrant",
                "bg-emerald-900": state === "open" && variant === "vibrant",
                // Muted colors
                "bg-stone-700": state === "empty" && variant === "muted",
                "bg-red-800": state === "error" && variant === "muted",
                "bg-emerald-800": state === "open" && variant === "muted",
              })}
            >
              {/* Eye pupil with inner glow */}
              <div className="absolute top-1/2 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black">
                <div
                  className={clsx("absolute top-1/2 left-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full", {
                    // Vibrant colors
                    "bg-amber-400": state === "empty" && variant === "vibrant",
                    "bg-red-400": state === "error" && variant === "vibrant",
                    "bg-emerald-400": state === "open" && variant === "vibrant",
                    // Muted colors
                    "bg-stone-400": state === "empty" && variant === "muted",
                    "bg-red-300": state === "error" && variant === "muted",
                    "bg-emerald-300": state === "open" && variant === "muted",
                  })}
                />
              </div>
              {/* Eye of Horus tear mark - only show in vibrant mode */}
              {variant === "vibrant" && (
                <div
                  className={clsx("absolute right-0 -bottom-1 h-2 w-3 rounded-bl-full transition-colors duration-300", {
                    "bg-amber-800": state === "empty",
                    "bg-red-900": state === "error",
                    "bg-emerald-900": state === "open",
                  })}
                />
              )}
              {/* Eye of Horus eyebrow - only show in vibrant mode */}
              {variant === "vibrant" && (
                <div
                  className={clsx("absolute -top-1 left-1 h-1 w-6 rounded-full transition-colors duration-300", {
                    "bg-amber-800": state === "empty",
                    "bg-red-900": state === "error",
                    "bg-emerald-900": state === "open",
                  })}
                />
              )}
            </div>
          </div>

          {/* Hieroglyphic patterns - only show in vibrant mode */}
          {variant === "vibrant" && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
              <div className="h-1 w-1 rounded-full bg-amber-900/70" />
              <div className="h-1 w-3 bg-amber-900/70" />
              <div className="h-1 w-1 rounded-full bg-amber-900/70" />
              <div className="h-1 w-2 bg-amber-900/70" />
              <div className="h-1 w-1 rounded-full bg-amber-900/70" />
            </div>
          )}

          {/* Ankh symbols in corners - only show in vibrant mode */}
          {variant === "vibrant" && (
            <>
              <div className="absolute bottom-1 left-1 text-xs text-amber-900/50">⚱</div>
              <div className="absolute right-1 bottom-1 text-xs text-amber-900/50">☥</div>
            </>
          )}
        </div>

        {/* Ornate Egyptian shackle with hieroglyphic details */}
        <div
          className={clsx(
            "absolute top-3 left-1/2 h-12 w-20 -translate-x-1/2 rounded-t-full border-4 border-b-0 bg-gradient-to-t transition-all duration-500",
            "before:absolute before:-top-1 before:left-3 before:h-3 before:w-12 before:rounded-t-full before:content-['']",
            {
              // Vibrant colors
              "border-amber-700 from-amber-50 to-amber-100 before:bg-amber-200":
                state === "empty" && variant === "vibrant",
              "border-red-800 from-red-50 to-red-100 before:bg-red-200": state === "error" && variant === "vibrant",
              "border-emerald-800 from-emerald-50 to-emerald-100 before:bg-emerald-200 translate-x-4 rotate-15":
                state === "open" && variant === "vibrant",
              // Muted colors
              "border-stone-600 from-stone-50 to-stone-100 before:bg-stone-200":
                state === "empty" && variant === "muted",
              "border-red-700 from-red-50 to-red-100 before:bg-red-200": state === "error" && variant === "muted",
              "border-emerald-700 from-emerald-50 to-emerald-100 before:bg-emerald-200 translate-x-4 rotate-15":
                state === "open" && variant === "muted",
            }
          )}
        >
          {/* Shackle decorative scarab beetles - only show in vibrant mode */}
          {variant === "vibrant" && (
            <>
              <div className="absolute top-3 left-2 h-1 w-2 rounded-full bg-amber-900/60" />
              <div className="absolute top-3 right-2 h-1 w-2 rounded-full bg-amber-900/60" />
            </>
          )}

          {/* Egyptian symbols on shackle - only show in vibrant mode */}
          {variant === "vibrant" && (
            <div className="absolute top-1 left-1/2 -translate-x-1/2 text-xs text-amber-900/40">𓂀</div>
          )}
        </div>

        {/* Mystical glow effects */}
        {state === "open" && (
          <>
            <div className="absolute -inset-6 rounded-full bg-emerald-400/30 blur-xl" />
            <div className="absolute -inset-4 rounded-full bg-emerald-300/20 blur-lg" />
          </>
        )}
        {state === "error" && (
          <>
            <div className="absolute -inset-6 animate-pulse rounded-full bg-red-400/30 blur-xl" />
            <div className="absolute -inset-4 animate-pulse rounded-full bg-red-300/20 blur-lg" />
          </>
        )}
      </div>
    </>
  )
}
