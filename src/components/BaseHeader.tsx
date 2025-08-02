import { isBeta } from "../config/constants"

export const BaseHeader = () => {
  return (
    <>
      <div className="flex w-full flex-row justify-between border bg-gray-100 px-4 py-2 sm:col-span-6">
        <p>Shop</p>
        <h1 className="text-center font-pyramid text-2xl font-bold">
          Pyramid Scheme
        </h1>
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
