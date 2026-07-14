import { Link, useLocation } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { useAdminAccess } from '@hooks/useAdminAccess'
import { useCoordinatorAccess } from '@hooks/useCoordinatorAccess'
import { useExaminerAccess } from '@hooks/useExaminerAccess'
import { useSidebarContent } from '@hooks/useContent'
import './Reports.css'

interface ReportsLayoutProps {
  title: string
  description: string
  children: React.ReactNode
}

const ANALYTICS_PATHS = new Set([
  '/reports/test',
  '/reports/question',
  '/reports/group',
])

export function ReportsLayout({
  title,
  description,
  children,
}: ReportsLayoutProps) {
  const location = useLocation()
  const sidebarContent = useSidebarContent()
  const { isAdmin } = useAdminAccess()
  const { isCoordinator } = useCoordinatorAccess()
  const { isExaminer } = useExaminerAccess()
  const canViewAnalytics = isAdmin || isCoordinator || isExaminer

  const navItems = [
    {
      label: sidebarContent.menuItems.individualReport,
      path: '/reports/individual',
    },
    ...(canViewAnalytics
      ? [
          {
            label: sidebarContent.menuItems.testReport,
            path: '/reports/test',
          },
          {
            label: sidebarContent.menuItems.questionReport,
            path: '/reports/question',
          },
          {
            label: sidebarContent.menuItems.groupReport,
            path: '/reports/group',
          },
        ]
      : []),
  ]

  const showAccessNotice = ANALYTICS_PATHS.has(location.pathname) && !canViewAnalytics

  return (
    <DashboardLayout>
      <div className="reports-page">
        <header className="reports-page__header">
          <div>
            <h1>{title}</h1>
            <p className="reports-page__description">{description}</p>
          </div>
        </header>

        <nav className="reports-subnav" aria-label="Report sections">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(`${item.path}/`)

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`reports-subnav__link ${isActive ? 'is-active' : ''}`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {showAccessNotice ? (
          <div className="reports-alert reports-alert--error" role="alert">
            You do not have permission to view analytics reports.
          </div>
        ) : (
          children
        )}
      </div>
    </DashboardLayout>
  )
}
