import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import type { ReactElement } from 'react'

const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default ProtectedRoute