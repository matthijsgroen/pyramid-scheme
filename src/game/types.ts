export type PyramidLevelSettings = {
  floorCount: number;
  openBlockCount: number;
  lowestFloorNumberRange: [min: number, max: number];
};

export type PyramidLevel = {
  pyramid: Pyramid;
  values: Record<string, number | undefined>;
};

export type PyramidBlock = {
  id: string;
  value?: number;
  isOpen: boolean;
};

export type Pyramid = {
  floorCount: number;
  blocks: PyramidBlock[];
};
