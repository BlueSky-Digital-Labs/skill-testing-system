import { Routes, Route } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '@store/index'
import { LoginPage, RegisterPage, SignIn, ForgotPassword, ResetPassword } from '@pages/auth'
import { DashboardPage } from '@pages/dashboard'
import { BrandingPage } from '@pages/admin/branding'
import { GradingList, GradingDetail } from '@pages/grading'
import { ProtectedRoute } from '@components/organisms/ProtectedRoute'
import { AdminRoute } from '@components/organisms/AdminRoute'

function App() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)

  return (
    <Routes>
      {/* Default route - Login page */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

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
    </Routes>
  )
}

export default App
