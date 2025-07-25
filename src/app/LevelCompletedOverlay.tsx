import { useMemo } from "react"

export const LevelCompletedOverlay = () => {
  // Random rotation between -20deg and +20deg
  const rotation = useMemo(() => {
    const deg = Math.random() * 40 - 20
    return `rotate(${deg}deg)`
  }, [])
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none delay-0 animate-fade-in opacity-0">
      <span
        className="text-green-400 text-[6vw] font-extrabold text-shadow-lg text-shadow-black select-none font-pyramid"
        style={{ transform: rotation }}
      >
        Level Completed!
      </span>
    </div>
  )
}
