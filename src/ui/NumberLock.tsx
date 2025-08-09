import type { FC } from "react"
import clsx from "clsx"
import { type ChestState, type ChestVariant } from "./Chest"

type NumberLockProps = {
  state?: ChestState
  variant?: ChestVariant
  value?: string
  onChange?: (value: string) => void
  onSubmit?: () => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  className?: string
}

export const NumberLock: FC<NumberLockProps> = ({
  state = "empty",
  variant = "vibrant",
  value = "",
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Enter code",
  maxLength = 4,
}) => {
  const handleInputChange = (newValue: string) => {
    // Only allow numbers
    const numericValue = newValue.replace(/[^0-9]/g, "")

    // Respect maxLength
    const truncatedValue = numericValue.slice(0, maxLength)

    onChange?.(truncatedValue)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value) {
      onSubmit?.()
    }
  }

  const isDisabled = disabled || state === "open"

  return (
    <div className="flex flex-row gap-1">
      <div
        className={clsx(
          "relative rounded-lg border-2 px-4 py-3 shadow-lg transition-all duration-300",
          "before:absolute before:-inset-1 before:-z-10 before:rounded-lg before:bg-gradient-to-r before:p-px before:content-['']",
          {
            // Vibrant colors
            "border-amber-600 bg-amber-50 before:from-amber-400 before:to-amber-600":
              state === "empty" && variant === "vibrant",
            "border-red-700 bg-red-50 before:from-red-500 before:to-red-700":
              state === "error" && variant === "vibrant",
            "border-emerald-700 bg-emerald-50 before:from-emerald-500 before:to-emerald-700":
              state === "open" && variant === "vibrant",
            // Muted colors
            "border-stone-500 bg-stone-50 before:from-stone-400 before:to-stone-600":
              state === "empty" && variant === "muted",
            "border-red-600 bg-red-50 before:from-red-400 before:to-red-600":
              state === "error" && variant === "muted",
            "border-emerald-600 bg-emerald-50 before:from-emerald-400 before:to-emerald-600":
              state === "open" && variant === "muted",
          }
        )}
      >
        {/* Papyrus-like background texture - only show in vibrant mode */}
        {variant === "vibrant" && (
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-100 opacity-60" />
        )}

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={isDisabled}
          placeholder={placeholder}
          maxLength={maxLength}
          className={clsx(
            "relative z-10 w-24 bg-transparent text-center font-serif text-xl font-bold tracking-wider transition-colors duration-300 outline-none",
            {
              // Vibrant colors
              "text-amber-900 placeholder-amber-600":
                state === "empty" && variant === "vibrant",
              "text-red-900 placeholder-red-600":
                state === "error" && variant === "vibrant",
              "text-emerald-900 placeholder-emerald-600":
                state === "open" && variant === "vibrant",
              // Muted colors
              "text-stone-800 placeholder-stone-500":
                state === "empty" && variant === "muted",
              "text-red-800 placeholder-red-500":
                state === "error" && variant === "muted",
              "text-emerald-800 placeholder-emerald-500":
                state === "open" && variant === "muted",
            }
          )}
          style={{ fontFamily: "'Papyrus', 'Bradley Hand', cursive" }}
        />

        {/* Hieroglyphic decorative corners - only show in vibrant mode */}
        {variant === "vibrant" && (
          <>
            <div className="absolute top-1 left-1 text-xs text-amber-700/40">
              𓈖
            </div>
            <div className="absolute top-1 right-1 text-xs text-amber-700/40">
              𓊪
            </div>
            <div className="absolute bottom-1 left-1 text-xs text-amber-700/40">
              𓇯
            </div>
            <div className="absolute right-1 bottom-1 text-xs text-amber-700/40">
              𓊖
            </div>
          </>
        )}
      </div>
      <button
        onClick={onSubmit}
        className={clsx(
          "relative rounded-lg border-2 px-4 py-3 shadow-lg transition-all duration-300",
          "before:absolute before:-inset-1 before:-z-10 before:rounded-lg before:bg-gradient-to-r before:p-px before:content-['']",
          {
            // Vibrant colors
            "border-amber-600 bg-amber-50 before:from-amber-400 before:to-amber-600":
              state === "empty" && variant === "vibrant",
            "border-red-700 bg-red-50 before:from-red-500 before:to-red-700":
              state === "error" && variant === "vibrant",
            "border-emerald-700 bg-emerald-50 before:from-emerald-500 before:to-emerald-700":
              state === "open" && variant === "vibrant",
            // Muted colors
            "border-stone-500 bg-stone-50 before:from-stone-400 before:to-stone-600":
              state === "empty" && variant === "muted",
            "border-red-600 bg-red-50 before:from-red-400 before:to-red-600":
              state === "error" && variant === "muted",
            "border-emerald-600 bg-emerald-50 before:from-emerald-400 before:to-emerald-600":
              state === "open" && variant === "muted",
          }
        )}
      >
        {/* Papyrus-like background texture - only show in vibrant mode */}
        {variant === "vibrant" && (
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-100 opacity-60" />
        )}

        {/* Sacred Eye of Horus keyhole */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <div
            className={clsx(
              "relative h-4 w-6 rounded-full transition-colors duration-300",
              {
                // Vibrant colors
                "bg-amber-800": state === "empty" && variant === "vibrant",
                "bg-red-900": state === "error" && variant === "vibrant",
                "bg-emerald-900": state === "open" && variant === "vibrant",
                // Muted colors
                "bg-stone-700": state === "empty" && variant === "muted",
                "bg-red-800": state === "error" && variant === "muted",
                "bg-emerald-800": state === "open" && variant === "muted",
              }
            )}
          >
            {/* Eye pupil with inner glow */}
            <div className="absolute top-1/2 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black">
              <div
                className={clsx(
                  "absolute top-1/2 left-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full",
                  {
                    // Vibrant colors
                    "bg-amber-400": state === "empty" && variant === "vibrant",
                    "bg-red-400": state === "error" && variant === "vibrant",
                    "bg-emerald-400": state === "open" && variant === "vibrant",
                    // Muted colors
                    "bg-stone-400": state === "empty" && variant === "muted",
                    "bg-red-300": state === "error" && variant === "muted",
                    "bg-emerald-300": state === "open" && variant === "muted",
                  }
                )}
              />
            </div>
            {/* Eye of Horus tear mark - only show in vibrant mode */}
            {variant === "vibrant" && (
              <div
                className={clsx(
                  "absolute right-0 -bottom-1 h-2 w-2 rounded-bl-full transition-colors duration-300",
                  {
                    "bg-amber-800": state === "empty",
                    "bg-red-900": state === "error",
                    "bg-emerald-900": state === "open",
                  }
                )}
              />
            )}
            {/* Eye of Horus eyebrow - only show in vibrant mode */}
            {variant === "vibrant" && (
              <div
                className={clsx(
                  "absolute -top-1 left-1 h-1 w-4 rounded-full transition-colors duration-300",
                  {
                    "bg-amber-800": state === "empty",
                    "bg-red-900": state === "error",
                    "bg-emerald-900": state === "open",
                  }
                )}
              />
            )}
          </div>
        </div>

        {/* Hieroglyphic decorative corners - only show in vibrant mode */}
        {variant === "vibrant" && (
          <>
            <div className="absolute top-1 left-1 text-xs text-amber-700/40">
              𓈖
            </div>
            <div className="absolute top-1 right-1 text-xs text-amber-700/40">
              𓊪
            </div>
            <div className="absolute bottom-1 left-1 text-xs text-amber-700/40">
              𓇯
            </div>
            <div className="absolute right-1 bottom-1 text-xs text-amber-700/40">
              𓊖
            </div>
          </>
        )}
      </button>
    </div>
  )
}
