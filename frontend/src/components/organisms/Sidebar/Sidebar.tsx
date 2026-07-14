import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { useAdminAccess } from '@hooks/useAdminAccess'
import { useCoordinatorAccess } from '@hooks/useCoordinatorAccess'
import { useSystemAdminAccess } from '@hooks/useSystemAdminAccess'
import { useSidebarContent } from '@hooks/useContent'
import { Logo } from '@components/atoms/Logo'
import { 
  LayoutDashboard, 
  Briefcase, 
  Calendar, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  Palette,
  ClipboardCheck,
  ScrollText,
  Shield,
  UserCog,
  UsersRound,
} from 'lucide-react'
import './Sidebar.css'

// Menu items are now defined inside the component to use content hook

export const Sidebar = () => {
  const location = useLocation()
  const { logout } = useAuth()
  const { isAdmin } = useAdminAccess()
  const { isCoordinator } = useCoordinatorAccess()
  const { isSystemAdmin } = useSystemAdminAccess()
  const sidebarContent = useSidebarContent()

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: sidebarContent.menuItems.dashboard,
      path: '/dashboard',
      active: true
    },
    {
      icon: Briefcase,
      label: sidebarContent.menuItems.jobs,
      path: '/jobs'
    },
    {
      icon: Calendar,
      label: sidebarContent.menuItems.calendar,
      path: '/calendar'
    },
    {
      icon: Users,
      label: sidebarContent.menuItems.clients,
      path: '/clients'
    },
    {
      icon: Users,
      label: sidebarContent.menuItems.employees,
      path: '/employees'
    },
    {
      icon: BarChart3,
      label: sidebarContent.menuItems.invoicing,
      path: '/invoicing'
    },
    {
      icon: Settings,
      label: sidebarContent.menuItems.settings,
      path: '/settings'
    },
    ...(isCoordinator
      ? [
          {
            icon: UsersRound,
            label: 'Candidate groups',
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
            label: 'Grading',
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
            label: 'Users',
            path: '/admin/users',
          },
          {
            icon: Shield,
            label: 'Roles',
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
          const isActive = location.pathname === item.path
          
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
