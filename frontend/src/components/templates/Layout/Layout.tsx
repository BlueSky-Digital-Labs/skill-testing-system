import { ReactNode } from 'react'
import { Header } from '@components/organisms/Header'
import './Layout.css'

interface LayoutProps {
  children: ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="layout">
      <Header />
      <main className="layout__main">
        {children}
      </main>
    </div>
  )
}
