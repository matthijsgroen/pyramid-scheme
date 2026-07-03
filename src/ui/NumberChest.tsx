import type { FC } from "react"
import clsx from "clsx"
import { Chest, type ChestState, type ChestVariant } from "./Chest"
import { NumberLock } from "./NumberLock"

type NumberLockProps = {
  state?: ChestState
  variant?: ChestVariant
  value?: string
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  className?: string
}

export const NumberChest: FC<NumberLockProps> = ({
  state = "empty",
  variant = "vibrant",
  value = "",
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Enter code",
  maxLength = 4,
  className,
}) => {
  const isDisabled = disabled || state === "open"

  const handleLockClick = () => {
    if (value && !isDisabled) {
      onSubmit?.(value)
    }
  }

  return (
    <div className={clsx("flex flex-col items-center gap-6", className)}>
      <Chest
        onClick={handleLockClick}
        state={state}
        variant={variant}
        label="Submit Code"
        allowInteraction={!!value && !disabled}
      />
      <NumberLock
        state={state}
        variant={variant}
        value={value}
        onChange={onChange}
        onSubmit={handleLockClick}
        disabled={isDisabled}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </div>
  )
}
