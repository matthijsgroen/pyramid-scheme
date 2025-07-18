export type PyramidLevelSettings = {
  floorCount: number;
  operation: "addition" | "subtraction";
  openBlockCount: number;
  lowestFloorNumberRange: [min: number, max: number];
  allowNegativeNumbers: boolean;
};

export type PyramidAnswer = {
  id: string;
  value: number;
};

export type PyramidLevel = {
  pyramid: Pyramid;
  values: PyramidAnswer[];
};

export type Pyramid = {
  floorCount: number;
  operation: "addition" | "subtraction";
  blocks: { id: string; value?: number; isOpen: boolean }[];
};
