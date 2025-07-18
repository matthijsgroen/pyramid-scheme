import { getAnswers } from "./state";
import type { Pyramid, PyramidLevel, PyramidLevelSettings } from "./types";

const createBasePyramid = (
  settings: Pick<
    PyramidLevelSettings,
    "floorCount" | "operation" | "lowestFloorNumberRange"
  >,
  random = Math.random
): Pyramid => {
  const { floorCount, operation, lowestFloorNumberRange } = settings;

  const totalBlocks = (floorCount * (floorCount + 1)) / 2;
  const bottomFloorIndex = ((floorCount - 1) * floorCount) / 2;

  const blocks: Pyramid["blocks"] = [];
  for (let i = 0; i < totalBlocks; i++) {
    let value: number | undefined = undefined;
    if (i >= bottomFloorIndex) {
      // Generate values for the bottom floor blocks
      const min = lowestFloorNumberRange[0];
      const max = lowestFloorNumberRange[1];
      value = Math.floor(random() * (max - min + 1)) + min;
    }
    blocks.push({
      id: (i + 1).toString(),
      value,
      isOpen: value === undefined,
    });
  }
  return {
    floorCount,
    operation,
    blocks,
  };
};

export const createPyramid = (
  settings: PyramidLevelSettings,
  random = Math.random
): Pyramid => {
  const pyramid = createBasePyramid(settings, random);
  const values = getAnswers(pyramid);

  return {
    ...pyramid,
    blocks: pyramid.blocks.map((block) => {
      const value =
        values?.find((v) => v.id === block.id)?.value ?? block.value;
      return {
        ...block,
        value,
        isOpen: value === undefined,
      };
    }),
  };
};

export const generateLevel = (
  settings: PyramidLevelSettings,
  random = Math.random
): PyramidLevel => {
  const pyramid = createPyramid(settings, random);
  return {
    pyramid,
    values: [],
  };
};
