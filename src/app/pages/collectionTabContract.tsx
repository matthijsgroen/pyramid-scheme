import { expect } from "vitest"
import type { FC } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import type { CollectionSectionProps, CollectionTab } from "./collectionSectionRegistry"

const MARK = "made-up-new-mark"

// What a section marks NEW against what its tab says the player holds, once the tab has read its saves.
// Drawn with every item new, the section must mark as many items as the tab has ids; drawn with one id
// new, exactly one. Together: the marked items are the tab's ids, so a count the tab reports is a badge
// the player can find.
export const markedItemCounts = async (
  useTab: () => CollectionTab,
  Section: FC<CollectionSectionProps>
): Promise<{ ids: readonly string[]; allNew: number; eachNew: Record<string, number> }> => {
  let tab: CollectionTab | undefined
  const Probe: FC<{ isNew: (id: string) => boolean }> = ({ isNew }) => {
    tab = useTab()
    return <Section selectedItem={null} onSelect={() => {}} isNew={isNew} newLabel={MARK} />
  }
  const view = render(<Probe isNew={() => true} />)
  await waitFor(() => expect(tab?.loaded).toBe(true))
  const marks = (isNew: (id: string) => boolean) => {
    view.rerender(<Probe isNew={isNew} />)
    return screen.queryAllByText(MARK).length
  }
  const allNew = marks(() => true)
  const ids = tab?.ids ?? []
  return { ids, allNew, eachNew: Object.fromEntries(ids.map(id => [id, marks(candidate => candidate === id)])) }
}
