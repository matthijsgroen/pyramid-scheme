import { usePiecesToPlace } from "./useMosaicProgress"
import { useMosaicReminder } from "./useMosaicReminder"

// Coming back to the camp is where a return is counted, with the window open or not.
export const useMosaicHomeReminder = () => {
  const { toPlace, loaded } = usePiecesToPlace()
  useMosaicReminder({ unplaced: toPlace, ready: loaded })
}
