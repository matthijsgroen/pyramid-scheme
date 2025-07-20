import { useState } from "react";
import { Level } from "./app/Level";
import { generateLevel } from "./game/generateLevel";
import type { PyramidLevelSettings } from "./game/types";
import { generateNewSeed, mulberry32 } from "./game/random";

const gameSeed = 12345;

function App() {
  const [levelNr, setLevelNr] = useState(1);

  const levelSeed = generateNewSeed(gameSeed, levelNr);
  const random = mulberry32(levelSeed);

  const settings: PyramidLevelSettings = {
    floorCount: 3,
    openBlockCount: 3,
    lowestFloorNumberRange: [1, 1],
    allowNegativeNumbers: false,
  };

  const levelContent = generateLevel(settings, random);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-blue-200 to-blue-100">
      <div
        className="flex-1 flex-col flex items-center justify-center"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, transparent 40%, #fef3c7 50%, #fbbf24 100%)",
        }}
      >
        <h1 className="text-2xl font-bold flex-none">
          Pyramid Level {levelNr}
        </h1>
        <div className="flex-1 w-full">
          <Level
            content={levelContent}
            onComplete={() => {
              console.log("Level completed!");
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
