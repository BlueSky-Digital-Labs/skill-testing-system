import { useSelector, useDispatch } from 'react-redux'
import { useEffect } from 'react'
import { RootState, AppDispatch } from '@store/index'
import { getCurrentUser, logout } from '@store/slices/authSlice'

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user, token, isAuthenticated, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  )

  useEffect(() => {
    if (token && !user) {
      dispatch(getCurrentUser())
    }
  }, [dispatch, token, user])

  const handleLogout = () => {
    dispatch(logout())
  }

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    logout: handleLogout,
  }
}
