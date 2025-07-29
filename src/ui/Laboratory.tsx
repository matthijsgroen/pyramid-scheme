import type { FC, ReactNode } from "react"

export const Laboratory: FC<{ map: ReactNode }> = ({ map }) => {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-between overflow-y-auto ">
      <div className="grid w-full flex-1 grid-flow-dense auto-rows-min grid-cols-1 px-4 sm:grid-cols-6 md:px-8 lg:px-16">
        <div className="col-span-1 row-span-1 flex w-full flex-row justify-between border bg-gray-100 p-4 sm:col-span-6">
          <p>Settings</p>
          <h1 className="mb-4 text-2xl font-bold">Laboratory</h1>
          <p>Shop</p>
        </div>
        <div className="col-span-1 row-span-1 flex flex-row flex-wrap justify-between border bg-gray-100 p-4 sm:col-span-6">
          <p>Parts: 3/15</p>
          <p>Coins: 123</p>
          <p>Prestige level: 2</p>
        </div>
      </div>
      <div className="grid w-full flex-1 grid-flow-dense auto-rows-min grid-cols-1 px-4 sm:grid-cols-6 md:px-8 lg:px-16">
        <div className="col-span-1 row-span-1 h-full min-h-24 border bg-gray-100  p-4 sm:col-span-3">
          <h1>Trophy case</h1>
        </div>
        <div className="col-span-1 row-span-1 h-full min-h-24 border bg-gray-100 p-4  sm:col-span-3">
          <h1>Trophy case</h1>
        </div>
      </div>
      <div className="grid w-full flex-1 grid-flow-dense auto-rows-min grid-cols-1 px-4 sm:grid-cols-6 md:px-8 lg:px-16">
        <div className="col-span-1 row-span-2 min-h-48 border bg-gray-100 p-4 sm:col-span-4 ">
          {map}
        </div>
        <div className="col-span-1 row-span-2 h-[30vh] min-h-48 border bg-gray-100 p-4 sm:col-span-2">
          Character
        </div>
        <div className="col-span-1 row-span-1 min-h-32 border bg-gray-100 p-4 sm:col-span-6">
          Workbench
        </div>
      </div>
    </div>
  )
}
