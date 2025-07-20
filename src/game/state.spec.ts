import { getAnswers, getBlockChildIndices, isComplete, isValid } from "./state";
import { describe, it, expect } from "vitest";
import type { PyramidLevel } from "./types";
import { createPyramid } from "./test-utils/pyramidfactory";

describe(isComplete, () => {
  it("returns true when all open blocks have corresponding values", () => {
    const state: PyramidLevel = {
      pyramid: {
        floorCount: 2,
        blocks: [
          { id: "1", isOpen: false },
          { id: "2", isOpen: true },
          { id: "3", isOpen: true },
        ],
      },
      values: {
        "2": 5,
        "3": 10,
      },
    };
    expect(isComplete(state)).toBe(true);
  });

  it("returns false when not all open blocks have corresponding values", () => {
    const state: PyramidLevel = {
      pyramid: {
        floorCount: 2,
        blocks: [
          { id: "1", isOpen: false },
          { id: "2", isOpen: true },
          { id: "3", isOpen: true },
        ],
      },
      values: { "2": 5 },
    };
    expect(isComplete(state)).toBe(false);
  });

  it("returns false when not values are undefined", () => {
    const state: PyramidLevel = {
      pyramid: {
        floorCount: 2,
        blocks: [
          { id: "1", isOpen: false },
          { id: "2", isOpen: true },
          { id: "3", isOpen: true },
        ],
      },
      values: { "2": 5, "3": undefined },
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
    },
  );

  it("returns an empty array if the block ID does not exist", () => {
    const pyramid: PyramidLevel["pyramid"] = {
      floorCount: 2,
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
      pyramid: createPyramid( [
        222,
        "", "",
        "", 49, "",
        "", "", 24, "",
        "", "", 9, 15, 17,
        15, 12, "", "", 10, "",
      ]),
      values: {
        "2": 117,
        "3": 105,

        "4": 68,
        "6": 56,

        "7": 43,
        "8": 25,
        "10": 32,

        "11": 27,
        "12": 16,

        "18": 4,
        "19": 5,
        "21": 7,
      },
    };
    expect(state.pyramid.floorCount).toBe(6);
    expect(isValid(state)).toBe(true);
  });

  it("returns false for an invalid addition pyramid", () => {
    const state: PyramidLevel = {
      // prettier-ignore
      pyramid: createPyramid( [
        222,
        "", "",
        "", 49, "",
        "", "", 24, "",
        "", "", 9, 15, 17,
        15, 12, "", "", 10, "",
      ]),
      values: {
        "2": 117,
        "3": 105,

        "4": 68,
        "6": 56,

        "7": 43,
        "8": 23,
        "10": 32,

        "11": 27,
        "12": 15,

        "18": 4,
        "19": 5,
        "21": 7,
      },
    };
    expect(isValid(state)).toBe(false);
  });
});

describe(getAnswers, () => {
  it("returns answers for open blocks with values", () => {
    // prettier-ignore
    const pyramid = createPyramid( [
      222,
      "", "",
      "", 49, "",
      "", "", 24, "",
      "", "", 9, 15, 17,
      15, 12, "", "", 10, "",
    ]);

    const result = getAnswers(pyramid);
    expect(result).toEqual({
      "2": 117,
      "3": 105,
      "4": 68,
      "6": 56,
      "7": 43,
      "8": 25,
      "10": 32,
      "11": 27,
      "12": 16,
      "18": 4,
      "19": 5,
      "21": 7,
    });
  });
});
