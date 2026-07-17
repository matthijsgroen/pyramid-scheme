import type { FC, FormEvent } from "react"
import clsx from "clsx"
import { NumberLock } from "@/ui/atoms/NumberLock"
import { difficultyMaterialFlat } from "@/ui/tokens/difficultyColors"
import type { Difficulty } from "@/data/difficultyLevels"
import type { ChestState } from "@/ui/atoms/Chest"

export const TombLockPanel: FC<{
  difficulty: Difficulty
  lockState: ChestState
  value: string
  onChange: (value: string) => void
  onSubmit: (e?: FormEvent) => void
  disabled?: boolean
  placeholder?: string
}> = ({ difficulty, lockState, value, onChange, onSubmit, disabled, placeholder }) => (
  <div className="order-2 mb-6 animate-slide-down">
    <form
      onSubmit={onSubmit}
      className={clsx(
        "flex flex-col items-center rounded-b-lg p-4",
        difficultyMaterialFlat[difficulty],
        lockState === "error" && "animate-shake"
      )}
    >
      <NumberLock
        state={lockState}
        variant="muted"
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={4}
      />
    </form>
  </div>
)
