import { useMemo } from "react";

export const LevelCompletedOverlay = () => {
  // Random rotation between -20deg and +20deg
  const rotation = useMemo(() => {
    const deg = Math.random() * 40 - 20;
    return `rotate(${deg}deg)`;
  }, []);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{
        background: "rgba(255,255,255,0.1)",
      }}
    >
      <span
        className="text-green-600 text-[6vw] font-extrabold drop-shadow-lg select-none"
        style={{ transform: rotation }}
      >
        Level Completed!
      </span>
    </div>
  );
};
