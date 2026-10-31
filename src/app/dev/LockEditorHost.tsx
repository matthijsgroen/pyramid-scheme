import { useSyncExternalStore, type FC } from "react"
import { LockEditor } from "./LockEditor"
import { RoomEditor } from "./RoomEditor"
import { ROOM_HASH_PREFIX } from "./roomEditorUrl"
import { LOCK_HASH_PREFIX, WEB_HASH_PREFIX } from "./lockEditorUrl"

const subscribe = (notify: () => void) => {
  window.addEventListener("hashchange", notify)
  return () => window.removeEventListener("hashchange", notify)
}
const isRoomLink = () => window.location.hash.startsWith(ROOM_HASH_PREFIX)
const isEditorLink = () =>
  window.location.hash.startsWith(LOCK_HASH_PREFIX) || window.location.hash.startsWith(WEB_HASH_PREFIX) || isRoomLink()

/** The editor over the whole app while the URL is a lock, web or room link; only mounted in develop mode. */
export const LockEditorHost: FC = () => {
  const open = useSyncExternalStore(subscribe, isEditorLink)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-neutral-900">
      {isRoomLink() ? (
        <RoomEditor onClose={() => (window.location.hash = "")} />
      ) : (
        <LockEditor onClose={() => (window.location.hash = "")} />
      )}
    </div>
  )
}
