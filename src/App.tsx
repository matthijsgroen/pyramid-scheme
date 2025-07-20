import { Level } from "./app/Level";
import { generateLevel } from "./game/generateLevel";
import { mulberry32 } from "./game/random";
import type { PyramidLevelSettings } from "./game/types";

const random = mulberry32(12345);

function App() {
  const settings: PyramidLevelSettings = {
    floorCount: 13,
    operation: "addition",
    openBlockCount: 70,
    lowestFloorNumberRange: [1, 4],
    allowNegativeNumbers: false,
  };

  const levelContent = generateLevel(settings, random);
  return <Level content={levelContent} />;
}

export default App;
