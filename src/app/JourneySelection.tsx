import type { FC } from "react"

type JourneySelectionProps = {
  onStart: () => void
  onCancel: () => void
}

export const JourneySelection: FC<JourneySelectionProps> = ({
  onStart,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="rounded bg-white p-4 shadow-lg">
        <h2 className="mb-4 text-xl font-bold">Start Journey</h2>
        <p>Are you ready to start your journey?</p>
        <div className="mt-4 flex gap-2">
          <button
            className="rounded bg-blue-500 px-4 py-2 text-white"
            onClick={onStart}
          >
            Start
          </button>
          <button
            className="rounded bg-gray-500 px-4 py-2 text-white"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
