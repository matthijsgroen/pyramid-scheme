import { useEffect, useState, type FC } from "react";
import type { PyramidLevel } from "../game/types";
import { PyramidDisplay } from "./PyramidDisplay";
import { isValid } from "../game/state";
import { LevelCompletedOverlay } from "./LevelCompletedOverlay";

export const Level: FC<{ content: PyramidLevel; onComplete?: () => void }> = ({
  content,
  onComplete,
}) => {
  const [answers, setAnswers] = useState<Record<string, number | undefined>>(
    {},
  );

  const completed = isValid({ pyramid: content.pyramid, values: answers });
  // Placeholder for Level component logic
  useEffect(() => {
    if (completed) {
      onComplete?.();
    }
  }, [completed, onComplete]);

  return (
    <div className="relative level-container flex flex-col h-screen w-full">
      <div className="flex-1 flex items-center justify-center">
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
