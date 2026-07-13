import { useAuth } from '@hooks/useAuth'
import { useDashboardContent } from '@hooks/useContent'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { DashboardCard } from '@components/molecules/DashboardCard'
import { 
  Users, 
  Briefcase, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  AlertCircle 
} from 'lucide-react'
import './DashboardPage.css'

const DashboardPage = () => {
  const { user } = useAuth()
  const dashboardContent = useDashboardContent()

  const dashboardData = {
    totalWorkers: 11,
    activeJobs: 8,
    completedJobs: 19,
    pendingTasks: 0,
    efficiencyRate: 28,
    issues: 0
  }

  const recentJobs = [
    {
      id: 1,
      title: 'Folded Angles',
      customer: 'Pro Ceiling & Walls',
      progress: 'COMPLETE',
      worker: 'Admin User',
      date: 'Jul 10, 2025'
    },
    {
      id: 2,
      title: 'RC Flashings',
      customer: 'Aceplus',
      progress: 'NOT STARTED',
      worker: 'Admin User',
      date: 'Jul 30, 2025'
    }
  ]

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1>{dashboardContent.welcome.title}, {user?.email?.split('@')[0] || 'User'}!</h1>
            <p>{dashboardContent.welcome.subtitle}</p>
          </div>
          <div className="user-avatar">
            <div className="avatar-circle">
              <span>{user?.email?.[0]?.toUpperCase() || 'U'}</span>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <DashboardCard
            title="Total Workers"
            value={dashboardData.totalWorkers}
            subtitle="Active workers"
            icon={<Users size={24} />}
            className="workers"
          />
          
          <DashboardCard
            title="Active Jobs"
            value={dashboardData.activeJobs}
            subtitle="In progress"
            icon={<Briefcase size={24} />}
            className="jobs"
          />
          
          <DashboardCard
            title="Completed Jobs"
            value={dashboardData.completedJobs}
            subtitle="Total completed"
            icon={<CheckCircle size={24} />}
            className="completed"
          />
          
          <DashboardCard
            title="Pending Tasks"
            value={dashboardData.pendingTasks}
            subtitle="Awaiting action"
            icon={<Clock size={24} />}
            className="pending"
          />
          
          <DashboardCard
            title="Efficiency Rate"
            value={`${dashboardData.efficiencyRate}%`}
            subtitle="Completion rate"
            icon={<TrendingUp size={24} />}
            className="efficiency"
          />
          
          <DashboardCard
            title="Issues"
            value={dashboardData.issues}
            subtitle="High priority"
            icon={<AlertCircle size={24} />}
            className="issues"
          />
        </div>

        <div className="recent-jobs-section">
          <div className="section-header">
            <h2>Recent Jobs</h2>
            <p>Overview of the latest jobs and their status</p>
          </div>
          
          <div className="jobs-table">
            <div className="table-header">
              <div className="table-cell">Job Title</div>
              <div className="table-cell">Customer</div>
              <div className="table-cell">Progress</div>
              <div className="table-cell">Worker</div>
              <div className="table-cell">Date</div>
            </div>
            
            {recentJobs.map((job) => (
              <div key={job.id} className="table-row">
                <div className="table-cell">{job.title}</div>
                <div className="table-cell">{job.customer}</div>
                <div className="table-cell">
                  <span className={`status-badge ${job.progress === 'COMPLETE' ? 'complete' : 'not-started'}`}>
                    {job.progress}
                  </span>
                </div>
                <div className="table-cell">{job.worker}</div>
                <div className="table-cell">{job.date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default DashboardPage
