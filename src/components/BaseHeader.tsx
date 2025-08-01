export const BaseHeader = () => {
  return (
    <>
      <div className="flex w-full flex-row justify-between border bg-gray-100 p-4 sm:col-span-6">
        <p>Settings</p>
        <h1 className="mb-4 font-pyramid text-2xl font-bold">Pyramid Scheme</h1>
        <p>Shop</p>
      </div>
      <div className="flex flex-row flex-wrap justify-between border bg-gray-100 p-4 sm:col-span-6">
        <p>Parts: 3/15</p>
        <p>Coins: 123</p>
        <p>Prestige level: 2</p>
      </div>
    </>
  )
}
