import type { FC } from "react";
import type { PyramidLevel } from "../game/types";
import { PyramidDisplay } from "./PyramidDisplay";

export const Level: FC<{ content: PyramidLevel }> = ({ content }) => {
  // Placeholder for Level component logic
  return (
    <div className="level-container">
      <h1 className="text-2xl font-bold">Pyramid Level</h1>
      {/* render the pyramid and answers */}
      <PyramidDisplay pyramid={content.pyramid} />
    </div>
  );
};
