import { ThemeToggle } from '@/components/global/mode-toggle'
import React from 'react'

type Props = {
    children: React.ReactNode
}

const AuthLayout = ({ children }: Props) => {
  return (
    <div className="h-screen w-screen bg-background">
        <ThemeToggle />
      {children}
    </div>
  )
}

export default AuthLayout