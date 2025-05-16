import AuthLayout from '@/modules/auth/layout/auth-layout'
import React from 'react'

type Props = {
    children: React.ReactNode
}

const Layout = ({ children }: Props) => {
  return (
    <AuthLayout>
        { children }
    </AuthLayout>
  )
}

export default Layout;