import { useState, type FC } from "react";
import type { PyramidLevel } from "../game/types";
import { PyramidDisplay } from "./PyramidDisplay";
import { isValid } from "../game/state";
import { LevelCompletedOverlay } from "./LevelCompletedOverlay";

export const Level: FC<{ content: PyramidLevel }> = ({ content }) => {
  const [answers, setAnswers] = useState<Record<string, number | undefined>>(
    {}
  );

  const completed = isValid({ pyramid: content.pyramid, values: answers });
  // Placeholder for Level component logic
  return (
    <div className="level-container flex flex-col h-screen bg-gradient-to-b from-blue-200 to-blue-100">
      <h1 className="text-2xl font-bold flex-none">Pyramid Level</h1>
      <div
        className="flex-1 flex items-center justify-center"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, transparent 40%, #fef3c7 50%, #fbbf24 100%)",
        }}
      >
        <PyramidDisplay
          pyramid={content.pyramid}
          values={answers}
          onAnswer={(blockId: string, value: number | undefined) => {
            setAnswers((prev) => ({ ...prev, [blockId]: value }));
          }}
        />
      </div>
      {completed && <LevelCompletedOverlay />}
    </div>
  );
};
