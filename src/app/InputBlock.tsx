import type { FC } from "react";
import { Block } from "./Block";

export const InputBlock: FC = () => {
  return (
    <Block className="bg-blue-100 text-blue-800">
      <input
        type="text"
        className="w-full h-full text-center bg-transparent outline-none"
        placeholder="..."
      />
    </Block>
  );
};
