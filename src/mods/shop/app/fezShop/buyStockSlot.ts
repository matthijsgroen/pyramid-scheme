// One stock slot bought from Fez. A slot that is sold out (bought already, or skipped because there is
// nothing to grant or nowhere to keep it) or that the balance cannot pay is refused before anything is
// written. The reward is applied before the money is taken: the two land in different saves, and a failed
// money write after it gives the piece away, where the other order could take the money for nothing.
export type StockSlotPurchase = {
  price: number
  balance: number
  soldOut: boolean
  apply: () => void
  spend: () => boolean
  claim: () => void
}

export const buyStockSlot = ({ price, balance, soldOut, apply, spend, claim }: StockSlotPurchase): boolean => {
  if (soldOut || balance < price) return false
  apply()
  spend()
  claim()
  return true
}
