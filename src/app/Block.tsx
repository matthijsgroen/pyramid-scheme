import clsx from "clsx";
import type { FC, PropsWithChildren } from "react";

export const Block: FC<
  PropsWithChildren<{ className?: string; selected?: boolean }>
> = ({ children, selected, className = "" }) => {
  return (
    <div
      className={clsx(
        "-ml-[1px] w-15 h-10 rounded text-center center flex items-center justify-center",
        {
          "border-2": selected,
          border: !selected,
        },
        className
      )}
    >
      {children}
    </div>
  );
};
