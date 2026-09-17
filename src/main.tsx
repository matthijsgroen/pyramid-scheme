import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import "@/i18n"
import "@/app/state/registerCurrencies"
import "@/app/SiteMap/registerRewardHandlers"
import App from "@/App.tsx"
import { CrashBoundary } from "@/app/CrashBoundary"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CrashBoundary>
      <App />
    </CrashBoundary>
  </StrictMode>
)
