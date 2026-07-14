import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { useAdminAccess } from '@hooks/useAdminAccess'
import { useCoordinatorAccess } from '@hooks/useCoordinatorAccess'
import { useExaminerAccess } from '@hooks/useExaminerAccess'
import { useSystemAdminAccess } from '@hooks/useSystemAdminAccess'
import { useSidebarContent } from '@hooks/useContent'
import { Logo } from '@components/atoms/Logo'
import {
  LayoutDashboard,
  LogOut,
  Palette,
  ClipboardCheck,
  ScrollText,
  Shield,
  UserCog,
  UsersRound,
  BookOpen,
  CalendarClock,
} from 'lucide-react'
import './Sidebar.css'

function isPathActive(pathname: string, path: string): boolean {
  if (path === '/dashboard') {
    return pathname === '/dashboard'
  }

  return pathname === path || pathname.startsWith(`${path}/`)
}

export const Sidebar = () => {
  const location = useLocation()
  const { logout } = useAuth()
  const { isAdmin } = useAdminAccess()
  const { isCoordinator } = useCoordinatorAccess()
  const { isExaminer } = useExaminerAccess()
  const { isSystemAdmin } = useSystemAdminAccess()
  const sidebarContent = useSidebarContent()

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: sidebarContent.menuItems.dashboard,
      path: '/dashboard',
    },
    ...(isExaminer
      ? [
          {
            icon: BookOpen,
            label: sidebarContent.menuItems.questionBank,
            path: '/questions',
          },
        ]
      : []),
    ...(isCoordinator
      ? [
          {
            icon: CalendarClock,
            label: sidebarContent.menuItems.assignments,
            path: '/assignments',
          },
          {
            icon: UsersRound,
            label: sidebarContent.menuItems.candidateGroups,
            path: '/coordinator/groups',
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            icon: Palette,
            label: sidebarContent.menuItems.branding,
            path: '/admin/branding',
          },
          {
            icon: ClipboardCheck,
            label: sidebarContent.menuItems.grading,
            path: '/grading',
          },
          {
            icon: ScrollText,
            label: sidebarContent.menuItems.auditLog,
            path: '/admin/audit',
          },
        ]
      : []),
    ...(isSystemAdmin
      ? [
          {
            icon: UserCog,
            label: sidebarContent.menuItems.users,
            path: '/admin/users',
          },
          {
            icon: Shield,
            label: sidebarContent.menuItems.roles,
            path: '/admin/roles',
          },
        ]
      : []),
  ]

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Logo size="lg" className="logo--light" />
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = isPathActive(location.pathname, item.path)

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={20} />
          <span>{sidebarContent.user.logout}</span>
        </button>
      </div>
    </div>
  )
}
