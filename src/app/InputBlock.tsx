import type { FC } from "react";
import { useState } from "react";
import { Block } from "./Block";

export const InputBlock: FC = () => {
  const [value, setValue] = useState("");
  const hasValue = value.trim() !== "";
  return (
    <Block
      className={
        hasValue ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
      }
    >
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full h-full text-center bg-transparent outline-none"
        placeholder="..."
      />
    </Block>
  );
};
