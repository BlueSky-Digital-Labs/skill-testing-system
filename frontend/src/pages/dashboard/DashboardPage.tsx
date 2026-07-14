import { Link } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { useDashboardContent } from '@hooks/useContent'
import { useAdminAccess } from '@hooks/useAdminAccess'
import { useCoordinatorAccess } from '@hooks/useCoordinatorAccess'
import { useExaminerAccess } from '@hooks/useExaminerAccess'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { DashboardCard } from '@components/molecules/DashboardCard'
import { useSearchParams } from 'react-router-dom'
import {
  BookOpen,
  ClipboardCheck,
  Users,
  CalendarClock,
} from 'lucide-react'
import { useDashboardStats } from './useDashboardStats'
import './DashboardPage.css'

function formatDateTime(value: string | null): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function shortTestId(testId: string): string {
  return testId.length > 8 ? `${testId.slice(0, 8)}…` : testId
}

const DashboardPage = () => {
  const { user } = useAuth()
  const dashboardContent = useDashboardContent()
  const { isAdmin } = useAdminAccess()
  const { isCoordinator } = useCoordinatorAccess()
  const { isExaminer } = useExaminerAccess()
  const [searchParams] = useSearchParams()
  const showAccessDenied = searchParams.get('access') === 'denied'
  const { stats } = useDashboardStats({ isAdmin, isCoordinator, isExaminer })

  const quickLinks = [
    ...(isExaminer
      ? [{ label: 'Question bank', path: '/questions' }]
      : []),
    ...(isCoordinator
      ? [
          { label: 'Test assignments', path: '/assignments' },
          { label: 'Candidate groups', path: '/coordinator/groups' },
        ]
      : []),
    ...(isAdmin
      ? [
          { label: 'Grading queue', path: '/grading' },
          { label: 'Audit log', path: '/admin/audit' },
        ]
      : []),
  ]

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        {showAccessDenied && (
          <div className="dashboard-access-denied" role="alert">
            Access denied. You do not have permission to view that page.
          </div>
        )}

        {stats.error && (
          <div className="dashboard-access-denied" role="alert">
            {stats.error}
          </div>
        )}

        <div className="dashboard-header">
          <div className="welcome-section">
            <h1>
              {dashboardContent.welcome.title}, {user?.email?.split('@')[0] || 'User'}!
            </h1>
            <p>{dashboardContent.welcome.subtitle}</p>
          </div>
          <div className="user-avatar">
            <div className="avatar-circle">
              <span>{user?.email?.[0]?.toUpperCase() || 'U'}</span>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          {stats.questionCount != null && (
            <DashboardCard
              title={dashboardContent.cards.questions.title}
              value={stats.isLoading ? '…' : stats.questionCount}
              subtitle={dashboardContent.cards.questions.description}
              icon={<BookOpen size={24} />}
              className="questions"
            />
          )}

          {stats.assignmentCount != null && (
            <DashboardCard
              title={dashboardContent.cards.assignments.title}
              value={stats.isLoading ? '…' : stats.assignmentCount}
              subtitle={dashboardContent.cards.assignments.description}
              icon={<CalendarClock size={24} />}
              className="assignments"
            />
          )}

          {stats.groupCount != null && (
            <DashboardCard
              title={dashboardContent.cards.groups.title}
              value={stats.isLoading ? '…' : stats.groupCount}
              subtitle={dashboardContent.cards.groups.description}
              icon={<Users size={24} />}
              className="groups"
            />
          )}

          {stats.gradingQueueCount != null && (
            <DashboardCard
              title={dashboardContent.cards.gradingQueue.title}
              value={stats.isLoading ? '…' : stats.gradingQueueCount}
              subtitle={dashboardContent.cards.gradingQueue.description}
              icon={<ClipboardCheck size={24} />}
              className="grading"
            />
          )}
        </div>

        {quickLinks.length > 0 && (
          <section className="dashboard-quick-links">
            <div className="section-header">
              <h2>Quick links</h2>
              <p>Jump to the features available for your role.</p>
            </div>
            <div className="dashboard-quick-links__grid">
              {quickLinks.map((link) => (
                <Link key={link.path} to={link.path} className="dashboard-quick-link">
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        )}

        {isCoordinator && (
          <div className="recent-activity-section">
            <div className="section-header">
              <h2>{dashboardContent.recentActivity.title}</h2>
              <p>Latest scheduled test assignments</p>
            </div>

            {stats.isLoading ? (
              <p>{dashboardContent.recentActivity.loading}</p>
            ) : stats.recentAssignments.length === 0 ? (
              <p>{dashboardContent.recentActivity.noActivity}</p>
            ) : (
              <div className="activity-table">
                <div className="table-header">
                  <div className="table-cell">Test</div>
                  <div className="table-cell">Opens</div>
                  <div className="table-cell">Due</div>
                  <div className="table-cell">State</div>
                  <div className="table-cell">Status</div>
                </div>

                {stats.recentAssignments.map((assignment) => (
                  <div key={assignment.id} className="table-row">
                    <div className="table-cell">
                      <Link to={`/tests/${assignment.test_id}`} title={assignment.test_id}>
                        {shortTestId(assignment.test_id)}
                      </Link>
                    </div>
                    <div className="table-cell">{formatDateTime(assignment.opens_at)}</div>
                    <div className="table-cell">{formatDateTime(assignment.due_at)}</div>
                    <div className="table-cell">
                      <span className={`status-badge ${assignment.state}`}>
                        {assignment.state}
                      </span>
                    </div>
                    <div className="table-cell">
                      <span className={`status-badge ${assignment.status}`}>
                        {assignment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default DashboardPage
