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
      isOpen: value !== undefined,
    });
  }
  return {
    floorCount,
    operation,
    blocks,
  };
};

export const createCompletePyramid = (
  settings: Pick<
    PyramidLevelSettings,
    "floorCount" | "operation" | "lowestFloorNumberRange"
  >,
  random = Math.random
): Pyramid => {
  const pyramid = createBasePyramid(settings, random);
  const values = getAnswers(pyramid);

  return {
    ...pyramid,
    blocks: pyramid.blocks.map((block) => {
      const value = values?.[block.id] ?? block.value;
      return {
        ...block,
        value,
        isOpen: value === undefined,
      };
    }),
  };
};

const openBlocks = (
  pyramid: Pyramid,
  openCount: number,
  random = Math.random
): PyramidLevel => {
  const openIndices = new Set<number>();
  while (openIndices.size < openCount) {
    const index = Math.floor(random() * pyramid.blocks.length);
    openIndices.add(index);
  }
  const values: Record<string, number> = pyramid.blocks
    .filter((_block, index) => openIndices.has(index))
    .reduce<Record<string, number>>((acc, block) => {
      acc[block.id] = block.value ?? 0;
      return acc;
    }, {});

  const updatedPyramid: Pyramid = {
    ...pyramid,
    blocks: pyramid.blocks.map((block, index) => ({
      ...block,
      isOpen: openIndices.has(index),
      value: openIndices.has(index) ? undefined : block.value,
    })),
  };

  return {
    pyramid: updatedPyramid,
    values,
  };
};

export const generateLevel = (
  settings: PyramidLevelSettings,
  random = Math.random
): PyramidLevel => {
  const { openBlockCount } = settings;
  const fullPyramid = createCompletePyramid(settings, random);
  if (openBlockCount === 0) {
    return {
      pyramid: fullPyramid,
      values: {},
    };
  }
  let tryCount = 0;
  while (tryCount < 100) {
    const pyramidLevel = openBlocks(fullPyramid, openBlockCount, random);
    if (getAnswers(pyramidLevel.pyramid)) {
      return pyramidLevel;
    }
    tryCount++;
  }

  throw new Error("Unsolvable pyramid");
};
