import React from 'react'
import { ThemeProvider } from './theme-provider'

type Props = {
    children: React.ReactNode
}

const GlobalProvider = ({ children }: Props) => {
  return (
    <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
    >
        {children}
    </ThemeProvider>
  )
}

export default GlobalProvider