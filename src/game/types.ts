export type PyramidLevelSettings = {
  floorCount: number;
  operation: "addition" | "subtraction";
  openBlockCount: number;
  lowestFloorNumberRange: [min: number, max: number];
  allowNegativeNumbers: boolean;
};

export type PyramidLevel = {
  pyramid: Pyramid;
  values: Record<string, number | undefined>;
};

export type Pyramid = {
  floorCount: number;
  operation: "addition" | "subtraction";
  blocks: { id: string; value?: number; isOpen: boolean }[];
};
