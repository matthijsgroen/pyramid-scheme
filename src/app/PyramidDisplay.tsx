import { useRef, useState, type FC } from "react";
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

export const PyramidDisplay: FC<{
  pyramid: Pyramid;
  values: Record<string, number | undefined>;
  onAnswer: (blockId: string, value: number | undefined) => void;
}> = ({ pyramid, values, onAnswer }) => {
  const { blocks } = pyramid;

  // Render the pyramid blocks
  const floorCount = pyramid.floorCount;
  const floorStartIndices = createFloorStartIndices(floorCount);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number>(0);
  const [focusInput, setFocusInput] = useState(false);

  // Helper to find floor and index on floor for a blockIndex
  const getFloorAndIndex = (blockIndex: number) => {
    for (let floor = 0; floor < floorStartIndices.length; floor++) {
      const start = floorStartIndices[floor];
      const end = start + floor + 1;
      if (blockIndex >= start && blockIndex < end) {
        return { floor, index: blockIndex - start };
      }
    }
    return { floor: 0, index: 0 };
  };

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const { floor, index } = getFloorAndIndex(selectedBlockIndex);
    if (e.key === "ArrowLeft" && index > 0) {
      setSelectedBlockIndex(selectedBlockIndex - 1);
      setFocusInput(false);
      e.preventDefault();
    } else if (e.key === "ArrowRight" && index < floor) {
      setSelectedBlockIndex(selectedBlockIndex + 1);
      setFocusInput(false);
      e.preventDefault();
    } else if (e.key === "ArrowUp" && floor > 0) {
      const aboveStart = floorStartIndices[floor - 1];
      const aboveIndex = aboveStart + Math.min(index, floor - 1);
      setSelectedBlockIndex(aboveIndex);
      setFocusInput(false);
      e.preventDefault();
    } else if (e.key === "ArrowDown" && floor < floorCount - 1) {
      const belowStart = floorStartIndices[floor + 1];
      const belowIndex = belowStart + Math.min(index, floor + 1);
      setSelectedBlockIndex(belowIndex);
      setFocusInput(false);
      e.preventDefault();
    } else if (e.key === "Enter") {
      setFocusInput(true);
      e.preventDefault();
    } else if (/^\d$/.test(e.key) && !focusInput) {
      const value = parseInt(e.key, 10);
      onAnswer(blocks[selectedBlockIndex].id, value);
      setFocusInput(true);
      e.preventDefault();
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center focus:outline-none"
      tabIndex={0}
      autoFocus
      onKeyDown={handleKeyDown}
    >
      {floorStartIndices.map((startIndex, floor) => (
        <div key={floor} className="flex justify-center -mb-[1px]">
          {Array.from({ length: floor + 1 }, (_, index) => {
            const blockIndex = startIndex + index;
            const block = blocks[blockIndex];
            return block.isOpen ? (
              <InputBlock
                key={block.id}
                value={values[block.id]}
                selected={selectedBlockIndex === startIndex + index}
                shouldFocus={
                  selectedBlockIndex === startIndex + index && focusInput
                }
                onSelect={() => setSelectedBlockIndex(startIndex + index)}
                onBlur={() => {
                  setFocusInput(false);
                  containerRef.current?.focus();
                }}
                onChange={(value) => onAnswer(block.id, value)}
              />
            ) : (
              <Block
                key={block.id}
                selected={selectedBlockIndex === startIndex + index}
                className="bg-yellow-200 border-yellow-600"
              >
                {block.value !== undefined ? block.value : ""}
              </Block>
            );
          })}
        </div>
      ))}
    </div>
  );
};
