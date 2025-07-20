import type { PyramidLevelSettings } from "./types";

export const generateLevelSettings = (
  levelNr: number
): PyramidLevelSettings => {
  const floorCount = Math.ceil(Math.sqrt(levelNr * 2));
  const openBlockCount = Math.floor(floorCount / 2);
  const lowestFloorNumberRange: [number, number] = [1, 10];

  return {
    floorCount,
    openBlockCount,
    lowestFloorNumberRange,
    allowNegativeNumbers: false,
  };
};
