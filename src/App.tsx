import { useState } from "react";
import { Level } from "./app/Level";
import { generateLevel } from "./game/generateLevel";
import { generateNewSeed, mulberry32 } from "./game/random";
import { generateLevelSettings } from "./game/generateLevelSettings";

const gameSeed = 12345;

function App() {
  const [levelNr, setLevelNr] = useState(1);

  const levelSeed = generateNewSeed(gameSeed, levelNr);
  const random = mulberry32(levelSeed);

  const settings = generateLevelSettings(levelNr);
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
            key={levelNr}
            content={levelContent}
            onComplete={() => {
              setTimeout(() => {
                setLevelNr((prev) => prev + 1);
              }, 1000);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
