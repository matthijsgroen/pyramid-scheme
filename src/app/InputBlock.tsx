import type { FC } from "react";
import { Block } from "./Block";

export const InputBlock: FC<{
  value?: number;
  onChange: (value: number) => void;
}> = ({ value = "", onChange }) => {
  return (
    <Block
      className={
        value !== undefined
          ? "bg-green-100 text-green-800"
          : "bg-blue-100 text-blue-800"
      }
    >
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-full text-center bg-transparent outline-none"
        placeholder="..."
      />
    </Block>
  );
};
