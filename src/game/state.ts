import type { Pyramid, PyramidAnswer, PyramidLevel } from "./types";

export const isComplete = (state: PyramidLevel): boolean => {
  const openBlocks = state.pyramid.blocks
    .filter((block) => block.isOpen)
    .map((block) => block.id);
  return openBlocks.every((blockId) =>
    state.values.some((value) => value.id === blockId)
  );
};

export const isValid = (state: PyramidLevel): boolean => {
  // check for addition if the value above matches the sum of the values below
  const { pyramid, values } = state;
  const blockValues = new Map(values.map((v) => [v.id, v.value]));
  for (const block of pyramid.blocks) {
    const value = block.value ?? blockValues.get(block.id);
    const childIndices = getBlockChildIndices(pyramid, block.id);
    if (childIndices.length === 0) continue; // no children, nothing to validate
    const childValues: number[] = childIndices.map(
      (index) =>
        pyramid.blocks[index].value ??
        blockValues.get(pyramid.blocks[index].id) ??
        0
    );
    if (state.pyramid.operation === "addition") {
      const expectedValue = childValues.reduce(
        (sum, val) => sum + (val ?? 0),
        0
      );
      if (value !== expectedValue) return false;
    }
  }

  return true;
};

export const getBlockChildIndices = (
  pyramid: PyramidLevel["pyramid"],
  blockId: string
): number[] => {
  // 1. get the floor number of the block
  const blockIndex = pyramid.blocks.findIndex((b) => b.id === blockId);
  // the pyramid grows in a triangular pattern, so the floor number can be calculated
  // the first block is the top of the pyramid, the second is the first block of the second floor, etc.
  const floorNumber = Math.floor((Math.sqrt(8 * blockIndex + 1) - 1) / 2);
  const indexOnFloor = blockIndex - (floorNumber * (floorNumber + 1)) / 2;

  // 2. calculate the 2 child IDs based on the floor number
  // the first child block on next floor with same index, the second child block is the next index
  const children: number[] = [];
  const nextFloorStartIndex = ((floorNumber + 1) * (floorNumber + 2)) / 2;
  const firstChildIndex = nextFloorStartIndex + indexOnFloor;
  const secondChildIndex = firstChildIndex + 1;
  if (firstChildIndex < pyramid.blocks.length) {
    children.push(firstChildIndex);
  }
  if (secondChildIndex < pyramid.blocks.length) {
    children.push(secondChildIndex);
  }

  return children;
};

export const getAnswers = (pyramid: Pyramid): PyramidAnswer[] | undefined => {
  const blockValues = new Map<string, number>();
  pyramid.blocks.forEach((block) => {
    if (block.value !== undefined) {
      blockValues.set(block.id, block.value);
    }
  });

  // Find blocks with missing value at themselves or their children
  const answersNeeded = pyramid.blocks.filter(
    (block) => block.value === undefined
  );
  if (answersNeeded.length === 0) return undefined;

  // Iteratively fill in missing values using the map
  let updated = true;
  while (updated) {
    updated = false;
    for (const block of pyramid.blocks) {
      const value = blockValues.get(block.id);
      const childIndices = getBlockChildIndices(pyramid, block.id);
      const childValues = childIndices.map((index) =>
        blockValues.get(pyramid.blocks[index].id)
      );

      if (pyramid.operation === "addition") {
        // If block value is missing and children are known
        if (
          value === undefined &&
          childValues.length > 0 &&
          childValues.every((v) => v !== undefined)
        ) {
          const sum = childValues.reduce((sum, v) => sum + (v ?? 0), 0);
          blockValues.set(block.id, sum);
          updated = true;
        }
        // If one child is missing and block value and other child are known
        if (
          value !== undefined &&
          childValues.length > 0 &&
          childValues.filter((v) => v === undefined).length === 1
        ) {
          const missingIdx = childValues.findIndex((v) => v === undefined);
          const knownSum = childValues.reduce(
            (sum: number, v) => sum + (v ?? 0),
            0
          );
          const missingValue = value - knownSum;
          blockValues.set(
            pyramid.blocks[childIndices[missingIdx]].id,
            missingValue
          );
          updated = true;
        }
      }
      // Other operations can be added here
    }
  }

  // Collect answers for blocks that were missing a value
  const answers = answersNeeded.map((block) => ({
    id: block.id,
    value: blockValues.get(block.id) ?? 0,
  }));
  return answers.length > 0 ? answers : undefined;
};
