import { Children } from "react"
import type { FC, PropsWithChildren } from "react"

// The started structures under one heading; with no rows nothing is shown at all.
export const StructuresPanel: FC<PropsWithChildren<{ title: string }>> = ({ title, children }) => {
  if (Children.count(children) === 0) return null
  return (
    <section className="mb-8">
      <h2 className="mb-4 font-pyramid text-xl font-semibold text-amber-900">{title}</h2>
      <ul className="flex flex-col gap-2">{children}</ul>
    </section>
  )
}
