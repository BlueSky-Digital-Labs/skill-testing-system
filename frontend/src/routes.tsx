import { Navigate, Route } from 'react-router-dom'
import { ProtectedRoute } from '@components/organisms/ProtectedRoute'
import {
  GroupReport,
  IndividualReport,
  QuestionReport,
  TestReport,
} from '@pages/reports'

interface ReportRouteOptions {
  isAuthenticated: boolean
}

export function ReportRoutes({ isAuthenticated }: ReportRouteOptions) {
  return (
    <>
      <Route
        path="/reports"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <Navigate to="/reports/individual" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/individual"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <IndividualReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/test"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <TestReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/question"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <QuestionReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/group"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <GroupReport />
          </ProtectedRoute>
        }
      />
    </>
  )
}
