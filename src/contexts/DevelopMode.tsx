import { createContext, useState, type Dispatch, type FC, type PropsWithChildren, type SetStateAction } from "react"
import { DEV_TOOLS } from "@/app/dev/devToolsBuild"

// eslint-disable-next-line react-refresh/only-export-components
export const DevelopContext = createContext<{
  isDevelopMode: boolean
  setDevelopMode: Dispatch<SetStateAction<boolean>>
}>({
  isDevelopMode: false,
  setDevelopMode: () => {},
})

// A build without the developer tools never enters develop mode, whatever asks for it.
export const DevelopModeProvider: FC<PropsWithChildren> = ({ children }) => {
  const [isDevelopMode, setDevelopMode] = useState(false)

  return (
    <DevelopContext.Provider value={{ isDevelopMode: DEV_TOOLS && isDevelopMode, setDevelopMode }}>
      {children}
    </DevelopContext.Provider>
  )
}
