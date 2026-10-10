import { useSyncExternalStore, type FC } from "react"
import { LockEditor } from "./LockEditor"
import { LOCK_HASH_PREFIX } from "./lockEditorUrl"

const subscribe = (notify: () => void) => {
  window.addEventListener("hashchange", notify)
  return () => window.removeEventListener("hashchange", notify)
}
const isLockLink = () => window.location.hash.startsWith(LOCK_HASH_PREFIX)

/** The editor over the whole app while the URL is a lock link; only mounted in develop mode. */
export const LockEditorHost: FC = () => {
  const open = useSyncExternalStore(subscribe, isLockLink)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-neutral-900">
      <LockEditor onClose={() => (window.location.hash = "")} />
    </div>
  )
}
