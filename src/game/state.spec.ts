import { getAnswers, getBlockChildIndices, isComplete, isValid } from "./state";
import { describe, it, expect } from "vitest";
import type { PyramidLevel } from "./types";
import { createPyramid } from "./test-utils/pyramidfactory";

describe(isComplete, () => {
  it("returns true when all open blocks have corresponding values", () => {
    const state: PyramidLevel = {
      pyramid: {
        floorCount: 2,
        operation: "addition",
        blocks: [
          { id: "1", isOpen: false },
          { id: "2", isOpen: true },
          { id: "3", isOpen: true },
        ],
      },
      values: [
        { id: "2", value: 5 },
        { id: "3", value: 10 },
      ],
    };
    expect(isComplete(state)).toBe(true);
  });

  it("returns false when not all open blocks have corresponding values", () => {
    const state: PyramidLevel = {
      pyramid: {
        floorCount: 2,
        operation: "subtraction",
        blocks: [
          { id: "1", isOpen: false },
          { id: "2", isOpen: true },
          { id: "3", isOpen: true },
        ],
      },
      values: [{ id: "2", value: 5 }],
    };
    expect(isComplete(state)).toBe(false);
  });
});

describe(getBlockChildIndices, () => {
  it.each([
    ["1", [1, 2]],
    ["2", [3, 4]],
    ["3", [4, 5]],
    ["4", [6, 7]],
    ["5", [7, 8]],
    ["6", [8, 9]],
  ])(
    "returns child IDs for a given block ID %s",
    (blockId, expectedChildIds) => {
      const pyramid: PyramidLevel["pyramid"] = {
        floorCount: 4,
        operation: "subtraction",
        blocks: [
          { id: "1", isOpen: false },

          { id: "2", isOpen: true },
          { id: "3", isOpen: true },

          { id: "4", isOpen: false },
          { id: "5", isOpen: true },
          { id: "6", isOpen: true },

          { id: "7", isOpen: false },
          { id: "8", isOpen: false },
          { id: "9", isOpen: false },
          { id: "10", isOpen: false },
        ],
      };
      expect(getBlockChildIndices(pyramid, blockId)).toEqual(expectedChildIds);
    }
  );

  it("returns an empty array if the block ID does not exist", () => {
    const pyramid: PyramidLevel["pyramid"] = {
      floorCount: 2,
      operation: "subtraction",
      blocks: [
        { id: "1", isOpen: false },
        { id: "2", isOpen: true },
      ],
    };
    expect(getBlockChildIndices(pyramid, "nonexistent")).toEqual([]);
  });
});

describe(isValid, () => {
  it("returns true for a valid addition pyramid", () => {
    const state: PyramidLevel = {
      // prettier-ignore
      pyramid: createPyramid("addition", [
        222,
        "", "",
        "", 49, "",
        "", "", 24, "",
        "", "", 9, 15, 17,
        15, 12, "", "", 10, "",
      ]),
      values: [
        { id: "2", value: 117 },
        { id: "3", value: 105 },

        { id: "4", value: 68 },
        { id: "6", value: 56 },

        { id: "7", value: 43 },
        { id: "8", value: 25 },
        { id: "10", value: 32 },

        { id: "11", value: 27 },
        { id: "12", value: 16 },

        { id: "18", value: 4 },
        { id: "19", value: 5 },
        { id: "21", value: 7 },
      ],
    };
    expect(state.pyramid.floorCount).toBe(6);
    expect(isValid(state)).toBe(true);
  });

  it("returns false for an invalid addition pyramid", () => {
    const state: PyramidLevel = {
      // prettier-ignore
      pyramid: createPyramid("addition", [
        222,
        "", "",
        "", 49, "",
        "", "", 24, "",
        "", "", 9, 15, 17,
        15, 12, "", "", 10, "",
      ]),
      values: [
        { id: "2", value: 117 },
        { id: "3", value: 105 },

        { id: "4", value: 68 },
        { id: "6", value: 56 },

        { id: "7", value: 43 },
        { id: "8", value: 23 },
        { id: "10", value: 32 },

        { id: "11", value: 27 },
        { id: "12", value: 15 },

        { id: "18", value: 4 },
        { id: "19", value: 5 },
        { id: "21", value: 7 },
      ],
    };
    expect(isValid(state)).toBe(false);
  });
});

describe(getAnswers, () => {
  it("returns answers for open blocks with values", () => {
    // prettier-ignore
    const pyramid = createPyramid("addition", [
      222,
      "", "",
      "", 49, "",
      "", "", 24, "",
      "", "", 9, 15, 17,
      15, 12, "", "", 10, "",
    ]);

    const result = getAnswers(pyramid);
    expect(result).toEqual([
      { id: "2", value: 117 },
      { id: "3", value: 105 },

      { id: "4", value: 68 },
      { id: "6", value: 56 },

      { id: "7", value: 43 },
      { id: "8", value: 25 },
      { id: "10", value: 32 },

      { id: "11", value: 27 },
      { id: "12", value: 16 },

      { id: "18", value: 4 },
      { id: "19", value: 5 },
      { id: "21", value: 7 },
    ]);
  });
});
