import type { FC } from "react"

export type CreditEntry = {
  file: string
  title: string
  author: string
  authorUrl?: string
  source: string
  licence: string
  licenceUrl: string
}

const LINK = "text-blue-700 underline hover:text-blue-900"

// Who made what the game plays, with where it came from and the licence it is used under.
export const CreditsList: FC<{
  heading: string
  credits: CreditEntry[]
  empty: string
  sourceLabel: string
  licenceLabel: string
}> = ({ heading, credits, empty, sourceLabel, licenceLabel }) => (
  <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
    <h3 className="font-semibold text-gray-900">{heading}</h3>
    {credits.length === 0 ? (
      <p>{empty}</p>
    ) : (
      <ul className="space-y-2">
        {credits.map(credit => (
          <li key={credit.file}>
            <p className="font-medium text-gray-900">{credit.title}</p>
            <p>{credit.author}</p>
            <p className="flex flex-wrap gap-x-3">
              <a href={credit.source} target="_blank" rel="noopener noreferrer" className={LINK}>
                {sourceLabel}
              </a>
              <a href={credit.licenceUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
                {licenceLabel}: {credit.licence}
              </a>
            </p>
          </li>
        ))}
      </ul>
    )}
  </div>
)
