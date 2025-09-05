import { useRegisterSW } from "virtual:pwa-register/react"

function PWABadge() {
  // periodic sync is disabled, change the value to enable it, the period is in milliseconds
  // You can remove onRegisteredSW callback and registerPeriodicSync function
  const period = 0

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (period <= 0) return
      if (r?.active?.state === "activated") {
        registerPeriodicSync(period, swUrl, r)
      } else if (r?.installing) {
        r.installing.addEventListener("statechange", e => {
          const sw = e.target as ServiceWorker
          if (sw.state === "activated") registerPeriodicSync(period, swUrl, r)
        })
      }
    },
  })

  function close() {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <div role="alert" aria-labelledby="toast-message">
      {(offlineReady || needRefresh) && (
        <div
          className={
            "fixed right-0 bottom-0 z-10 m-4 animate-slide-in-up rounded-xl border border-black bg-white/60 p-4 text-left drop-shadow-lg backdrop-blur-sm [animation-duration:0.3s]"
          }
        >
          <div className={"mb-2 text-black"}>
            {offlineReady ? (
              <span id="toast-message">App ready to work offline</span>
            ) : (
              <span id="toast-message">New content available, click on reload button to update.</span>
            )}
          </div>
          <div className="flex flex-row gap-4">
            {needRefresh && (
              <button
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                onClick={() => updateServiceWorker(true)}
              >
                Reload
              </button>
            )}
            <button
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1 text-sm font-bold text-white transition-colors hover:bg-blue-700"
              onClick={() => close()}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PWABadge

/**
 * This function will register a periodic sync check every hour, you can modify the interval as needed.
 */
function registerPeriodicSync(period: number, swUrl: string, r: ServiceWorkerRegistration) {
  if (period <= 0) return

  setInterval(async () => {
    if ("onLine" in navigator && !navigator.onLine) return

    const resp = await fetch(swUrl, {
      cache: "no-store",
      headers: {
        cache: "no-store",
        "cache-control": "no-cache",
      },
    })

    if (resp?.status === 200) await r.update()
  }, period)
}
