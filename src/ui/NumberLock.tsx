import type { FC } from "react"
import { useState, useEffect } from "react"
import clsx from "clsx"

export type NumberLockState = "empty" | "error" | "open"

type NumberLockProps = {
  state?: NumberLockState
  value?: string
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  className?: string
}

export const NumberLock: FC<NumberLockProps> = ({
  state = "empty",
  value = "",
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Enter code",
  maxLength = 4,
  className,
}) => {
  const [internalValue, setInternalValue] = useState(value)

  useEffect(() => {
    setInternalValue(value)
  }, [value])

  const handleInputChange = (newValue: string) => {
    // Only allow numbers
    const numericValue = newValue.replace(/[^0-9]/g, "")

    // Respect maxLength
    const truncatedValue = numericValue.slice(0, maxLength)

    setInternalValue(truncatedValue)
    onChange?.(truncatedValue)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && internalValue) {
      onSubmit?.(internalValue)
    }
  }

  const isDisabled = disabled || state === "open"

  return (
    <div className={clsx("flex flex-col items-center gap-6", className)}>
      {/* Ancient Egyptian Lock visual */}
      <div className="relative pt-12 pb-4">
        {/* Ornate base platform with hieroglyphic pattern */}
        <div className="absolute -bottom-3 left-1/2 h-4 w-28 -translate-x-1/2 rounded-sm bg-gradient-to-r from-yellow-700 via-yellow-600 to-yellow-700 shadow-xl">
          {/* Hieroglyphic decorations on base */}
          <div className="absolute top-1 left-2 h-1 w-1 rounded-full bg-yellow-900" />
          <div className="absolute top-1 left-4 h-1 w-2 bg-yellow-900" />
          <div className="absolute top-1 left-7 h-1 w-1 rounded-full bg-yellow-900" />
          <div className="absolute top-1 right-7 h-1 w-1 rounded-full bg-yellow-900" />
          <div className="absolute top-1 right-4 h-1 w-2 bg-yellow-900" />
          <div className="absolute top-1 right-2 h-1 w-1 rounded-full bg-yellow-900" />
        </div>

        {/* Main lock body with Egyptian styling */}
        <div
          className={clsx(
            "relative h-24 w-28 rounded-b-xl border-4 bg-gradient-to-b shadow-2xl transition-all duration-300",
            "before:absolute before:-top-1 before:left-1 before:h-3 before:w-24 before:rounded-t-lg before:content-['']",
            {
              "border-amber-700 from-amber-100 to-amber-200 before:bg-amber-300":
                state === "empty",
              "border-red-800 from-red-100 to-red-200 before:bg-red-300":
                state === "error",
              "border-emerald-800 from-emerald-100 to-emerald-200 before:bg-emerald-300":
                state === "open",
            }
          )}
        >
          {/* Egyptian decorative corners */}
          <div className="absolute top-1 left-1 h-2 w-2 border-t-2 border-l-2 border-amber-900" />
          <div className="absolute top-1 right-1 h-2 w-2 border-t-2 border-r-2 border-amber-900" />

          {/* Sacred Eye of Horus keyhole */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2">
            <div
              className={clsx(
                "relative h-5 w-8 rounded-full transition-colors duration-300",
                {
                  "bg-amber-800": state === "empty",
                  "bg-red-900": state === "error",
                  "bg-emerald-900": state === "open",
                }
              )}
            >
              {/* Eye pupil with inner glow */}
              <div className="absolute top-1/2 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black">
                <div
                  className={clsx(
                    "absolute top-1/2 left-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full",
                    {
                      "bg-amber-400": state === "empty",
                      "bg-red-400": state === "error",
                      "bg-emerald-400": state === "open",
                    }
                  )}
                />
              </div>
              {/* Eye of Horus tear mark */}
              <div
                className={clsx(
                  "absolute right-0 -bottom-1 h-2 w-3 rounded-bl-full transition-colors duration-300",
                  {
                    "bg-amber-800": state === "empty",
                    "bg-red-900": state === "error",
                    "bg-emerald-900": state === "open",
                  }
                )}
              />
              {/* Eye of Horus eyebrow */}
              <div
                className={clsx(
                  "absolute -top-1 left-1 h-1 w-6 rounded-full transition-colors duration-300",
                  {
                    "bg-amber-800": state === "empty",
                    "bg-red-900": state === "error",
                    "bg-emerald-900": state === "open",
                  }
                )}
              />
            </div>
          </div>

          {/* Hieroglyphic patterns */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
            <div className="h-1 w-1 rounded-full bg-amber-900/70" />
            <div className="h-1 w-3 bg-amber-900/70" />
            <div className="h-1 w-1 rounded-full bg-amber-900/70" />
            <div className="h-1 w-2 bg-amber-900/70" />
            <div className="h-1 w-1 rounded-full bg-amber-900/70" />
          </div>

          {/* Ankh symbols in corners */}
          <div className="absolute bottom-1 left-1 text-xs text-amber-900/50">
            ⚱
          </div>
          <div className="absolute right-1 bottom-1 text-xs text-amber-900/50">
            ☥
          </div>
        </div>

        {/* Ornate Egyptian shackle with hieroglyphic details */}
        <div
          className={clsx(
            "absolute top-3 left-1/2 h-12 w-20 -translate-x-1/2 rounded-t-full border-4 border-b-0 bg-gradient-to-t transition-all duration-500",
            "before:absolute before:-top-1 before:left-3 before:h-3 before:w-12 before:rounded-t-full before:content-['']",
            {
              "border-amber-700 from-amber-50 to-amber-100 before:bg-amber-200":
                state === "empty",
              "border-red-800 from-red-50 to-red-100 before:bg-red-200":
                state === "error",
              "border-emerald-800 from-emerald-50 to-emerald-100 before:bg-emerald-200 translate-x-4 rotate-15":
                state === "open",
            }
          )}
        >
          {/* Shackle decorative scarab beetles */}
          <div className="absolute top-3 left-2 h-1 w-2 rounded-full bg-amber-900/60" />
          <div className="absolute top-3 right-2 h-1 w-2 rounded-full bg-amber-900/60" />

          {/* Egyptian symbols on shackle */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 text-xs text-amber-900/40">
            𓂀
          </div>
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

      {/* Ancient Egyptian input field */}
      <div
        className={clsx(
          "relative rounded-lg border-2 px-4 py-3 shadow-lg transition-all duration-300",
          "before:absolute before:-inset-1 before:-z-10 before:rounded-lg before:bg-gradient-to-r before:p-px before:content-['']",
          {
            "border-amber-600 bg-amber-50 before:from-amber-400 before:to-amber-600":
              state === "empty",
            "border-red-700 bg-red-50 before:from-red-500 before:to-red-700":
              state === "error",
            "border-emerald-700 bg-emerald-50 before:from-emerald-500 before:to-emerald-700":
              state === "open",
          }
        )}
      >
        {/* Papyrus-like background texture */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-100 opacity-60" />

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={internalValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isDisabled}
          placeholder={placeholder}
          maxLength={maxLength}
          className={clsx(
            "relative z-10 w-24 bg-transparent text-center font-serif text-xl font-bold tracking-wider transition-colors duration-300 outline-none",
            {
              "text-amber-900 placeholder-amber-600": state === "empty",
              "text-red-900 placeholder-red-600": state === "error",
              "text-emerald-900 placeholder-emerald-600": state === "open",
            }
          )}
          style={{ fontFamily: "'Papyrus', 'Bradley Hand', cursive" }}
        />

        {/* Hieroglyphic decorative corners */}
        <div className="absolute top-1 left-1 text-xs text-amber-700/40">𓈖</div>
        <div className="absolute top-1 right-1 text-xs text-amber-700/40">
          𓊪
        </div>
        <div className="absolute bottom-1 left-1 text-xs text-amber-700/40">
          𓇯
        </div>
        <div className="absolute right-1 bottom-1 text-xs text-amber-700/40">
          𓊖
        </div>
      </div>

      {/* Egyptian-themed status messages */}
      {state === "error" && (
        <div className="flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-800 shadow-md">
          <span className="text-base">⚠️</span>
          <span>The spirits reject this code</span>
        </div>
      )}

      {state === "open" && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 shadow-md">
          <span className="text-base">🔓</span>
          <span>The sacred seal is broken</span>
        </div>
      )}
    </div>
  )
}
