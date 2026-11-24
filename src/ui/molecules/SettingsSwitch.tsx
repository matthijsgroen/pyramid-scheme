import type { FC } from "react"

type SettingsSwitchProps = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/** A settings row with a checkbox: checked means on. */
export const SettingsSwitch: FC<SettingsSwitchProps> = ({ label, checked, onChange }) => (
  <label className="-mx-3 flex items-center gap-3 rounded-lg px-3 py-2">
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      className="size-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    />
    <span className="text-sm font-medium text-gray-700">{label}</span>
  </label>
)
