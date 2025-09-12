import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import "./icons.css"
import "@/i18n"
import App from "@/App.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

const vh = window.innerHeight * 0.01
// Then we set the value in the --vh custom property to the root of the document
document.documentElement.style.setProperty("--vh", `${vh}px`)

window.addEventListener("resize", () => {
  // We execute the same script as before
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty("--vh", `${vh}px`)
})
