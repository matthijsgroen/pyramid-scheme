import type { FC } from "react"
import { useRef, useEffect } from "react"
import { Block } from "./Block"

export const InputBlock: FC<{
  value?: number
  selected?: boolean
  shouldFocus?: boolean
  disabled?: boolean
  onSelect?: () => void
  onBlur?: () => void
  onChange: (value: number | undefined) => void
}> = ({
  value,
  selected,
  disabled,
  shouldFocus,
  onChange,
  onSelect,
  onBlur,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!selected && inputRef.current) {
      inputRef.current.blur()
    }
  }, [selected])
  useEffect(() => {
    if (shouldFocus && selected && inputRef.current) {
      inputRef.current.focus()
    }
  }, [shouldFocus, selected])

  return (
    <Block
      selected={selected}
      className={`bg-blue-100 text-blue-800 focus-within:bg-orange-300 focus-within:text-orange-800 ${
        value !== undefined ? "bg-orange-200 text-orange-800" : ""
      }`}
    >
      <input
        ref={inputRef}
        type="number"
        disabled={disabled}
        value={value ?? ""}
        pattern="[0-9]*"
        onBlur={(e) => {
          onBlur?.()
          if (e.target.value === "") {
            onChange(undefined)
          }
        }}
        onClick={() => {
          inputRef.current?.focus()
        }}
        onFocus={onSelect}
        onChange={(e) =>
          e.target.value === ""
            ? onChange(undefined)
            : onChange(Number(e.target.value))
        }
        onKeyDown={(e) => {
          if (e.key === "Escape" || e.key === "Enter") {
            ;(e.target as HTMLInputElement).blur()
          }
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault()
          }
        }}
        className="w-full h-full text-center bg-transparent outline-none peer"
        placeholder="..."
      />
    </Block>
  )
}
