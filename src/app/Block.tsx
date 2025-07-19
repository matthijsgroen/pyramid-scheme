import type { FC, PropsWithChildren } from "react";

export const Block: FC<PropsWithChildren<{ className?: string }>> = ({
  children,
  className = "",
}) => {
  return (
    <div
      className={`-ml-[1px] w-15 h-10 border rounded text-center center flex items-center justify-center ${className}`}
    >
      {children}
    </div>
  );
};
