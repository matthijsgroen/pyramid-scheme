import { isBeta } from "@/config/constants"

export const BaseHeader = () => {
  return (
    <>
      <div className="flex w-full flex-row justify-between border bg-gray-100 px-4 py-2 sm:col-span-6">
        <p>Shop</p>
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-center font-pyramid text-2xl font-bold">
            Pyramid Scheme
          </h1>
          <p className="text-sm text-gray-600">
            This is an early alpha version.{" "}
            <span className="font-bold">
              Expect bugs, missing features and losing progress!
            </span>
          </p>
        </div>
        <p>Settings</p>
      </div>
      {isBeta && (
        <div className="flex flex-row flex-wrap justify-between border bg-gray-100 p-4 sm:col-span-6">
          <p>Parts: 3/15</p>
          <p>Coins: 123</p>
          <p>Prestige level: 2</p>
        </div>
      )}
    </>
  )
}
