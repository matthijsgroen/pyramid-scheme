import { createContext, useState, type Dispatch, type FC, type PropsWithChildren, type SetStateAction } from "react"

// eslint-disable-next-line react-refresh/only-export-components
export const DevelopContext = createContext<{
  isDevelopMode: boolean
  setDevelopMode: Dispatch<SetStateAction<boolean>>
}>({
  isDevelopMode: false,
  setDevelopMode: () => {},
})

export const DevelopModeProvider: FC<PropsWithChildren> = ({ children }) => {
  const [isDevelopMode, setDevelopMode] = useState(false)

  return <DevelopContext.Provider value={{ isDevelopMode, setDevelopMode }}>{children}</DevelopContext.Provider>
}
