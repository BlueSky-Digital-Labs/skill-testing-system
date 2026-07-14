import { Routes, Route } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '@store/index'
import { LoginPage, SignIn, ForgotPassword, ResetPassword } from '@pages/auth'
import { SelfRegister, AcceptInvite } from '@pages/candidates'
import { DashboardPage } from '@pages/dashboard'
import { BrandingPage } from '@pages/admin/branding'
import { AuditPage } from '@pages/admin/audit'
import { UsersPage, RolesPage } from '@pages/admin'
import { GradingList, GradingDetail } from '@pages/grading'
import { TestAssignPage } from '@pages/tests/assign'
import { AssignmentsListPage } from '@pages/tests/AssignmentsListPage'
import { GroupsList, GroupDetail } from '@pages/coordinator'
import { QuestionsList, QuestionEditPage, ImportPage } from '@pages/questions'
import { TestDetailPage } from '@pages/tests/TestDetailPage'
import { ReleaseControl, CandidateResult } from '@pages/results'
import { AttemptCompletionPage } from '@pages/attempts'
import AttemptRunnerPage from '@pages/attempts/[attemptId]'
import TestStartPage from '@pages/tests/[id]/start'
import { ProtectedRoute } from '@components/organisms/ProtectedRoute'
import { AdminRoute } from '@components/organisms/AdminRoute'
import { SystemAdminRoute } from '@components/organisms/SystemAdminRoute'
import { withCoordinatorGuard, withExaminerGuard } from '@/auth/guards'

const CoordinatorGroupsList = withCoordinatorGuard(GroupsList)
const CoordinatorGroupDetail = withCoordinatorGuard(GroupDetail)
const CoordinatorAssignmentsList = withCoordinatorGuard(AssignmentsListPage)
const ExaminerQuestionsList = withExaminerGuard(QuestionsList)
const ExaminerQuestionEditPage = withExaminerGuard(QuestionEditPage)
const ExaminerImportPage = withExaminerGuard(ImportPage)

function App() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)

  return (
    <Routes>
      {/* Default route - Login page */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<SelfRegister />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/accept-invitation" element={<AcceptInvite />} />

      {/* New auth flow */}
      <Route path="/auth/sign-in" element={<SignIn />} />
      <Route path="/auth/forgot" element={<ForgotPassword />} />
      <Route path="/auth/reset" element={<ResetPassword />} />
      
      {/* Dashboard routes (has its own layout) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin/branding"
        element={
          <AdminRoute isAuthenticated={isAuthenticated}>
            <BrandingPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/audit"
        element={
          <AdminRoute isAuthenticated={isAuthenticated}>
            <AuditPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <SystemAdminRoute isAuthenticated={isAuthenticated}>
            <UsersPage />
          </SystemAdminRoute>
        }
      />

      <Route
        path="/admin/roles"
        element={
          <SystemAdminRoute isAuthenticated={isAuthenticated}>
            <RolesPage />
          </SystemAdminRoute>
        }
      />

      <Route
        path="/grading"
        element={
          <AdminRoute isAuthenticated={isAuthenticated}>
            <GradingList />
          </AdminRoute>
        }
      />
      <Route
        path="/grading/:queueItemId"
        element={
          <AdminRoute isAuthenticated={isAuthenticated}>
            <GradingDetail />
          </AdminRoute>
        }
      />

      <Route path="/assignments" element={<CoordinatorAssignmentsList />} />

      <Route
        path="/tests/:testId/assign"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <TestAssignPage />
          </ProtectedRoute>
        }
      />

      <Route path="/coordinator/groups" element={<CoordinatorGroupsList />} />
      <Route path="/coordinator/groups/:id" element={<CoordinatorGroupDetail />} />

      <Route path="/questions" element={<ExaminerQuestionsList />} />
      <Route path="/questions/import" element={<ExaminerImportPage />} />
      <Route path="/questions/new" element={<ExaminerQuestionEditPage />} />
      <Route path="/questions/:id/edit" element={<ExaminerQuestionEditPage />} />

      <Route
        path="/tests/:testId"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <TestDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/results/release/:attemptId"
        element={
          <AdminRoute isAuthenticated={isAuthenticated}>
            <ReleaseControl />
          </AdminRoute>
        }
      />

      <Route
        path="/results/:attemptId"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <CandidateResult />
          </ProtectedRoute>
        }
      />

      <Route
        path="/attempts/:attemptId"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <AttemptRunnerPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tests/:id/start"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <TestStartPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/attempts/:attemptId/complete"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <AttemptCompletionPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
