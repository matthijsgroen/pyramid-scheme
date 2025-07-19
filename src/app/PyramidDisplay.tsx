import type { FC } from "react";
import type { Pyramid } from "../game/types";
import { Block } from "./Block";
import { InputBlock } from "./InputBlock";

const createFloorStartIndices = (floorCount: number): number[] => {
  const indices: number[] = [];
  let index = 0;
  for (let i = 1; i <= floorCount; i++) {
    indices.push(index);
    index += i;
  }
  return indices;
};

export const PyramidDisplay: FC<{ pyramid: Pyramid }> = ({ pyramid }) => {
  const { blocks } = pyramid;

  // Render the pyramid blocks
  const floorCount = pyramid.floorCount;
  const floorStartIndices = createFloorStartIndices(floorCount);

  return (
    <div className="flex flex-col items-center">
      {floorStartIndices.map((startIndex, floor) => (
        <div key={floor} className="flex justify-center -mb-[1px]">
          {Array.from({ length: floor + 1 }, (_, index) => {
            const blockIndex = startIndex + index;
            const block = blocks[blockIndex];
            return block.isOpen ? (
              <InputBlock key={block.id} />
            ) : (
              <Block key={block.id}>
                {block.value !== undefined ? block.value : ""}
              </Block>
            );
          })}
        </div>
      ))}
    </div>
  );
};
