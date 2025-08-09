import type { FC } from "react"
import { useState, useEffect } from "react"
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
  const [internalValue, setInternalValue] = useState(value)

  useEffect(() => {
    setInternalValue(value)
  }, [value])

  const handleLockClick = () => {
    if (internalValue && !isDisabled) {
      onSubmit?.(internalValue)
    }
  }

  const handleInputChange = (newValue: string) => {
    setInternalValue(newValue)
    onChange?.(newValue)
  }

  const isDisabled = disabled || state === "open"

  return (
    <div className={clsx("flex flex-col items-center gap-6", className)}>
      <Chest
        onClick={handleLockClick}
        state={state}
        variant={variant}
        label="Submit Code"
        allowInteraction={!!internalValue && !disabled}
      />
      <NumberLock
        state={state}
        variant={variant}
        value={internalValue}
        onChange={handleInputChange}
        onSubmit={handleLockClick}
        disabled={isDisabled}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </div>
  )
}
