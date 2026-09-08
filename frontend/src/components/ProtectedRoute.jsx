import { Navigate } from 'react-router-dom'
import { useAuth } from '../api/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="container section-tight text-center muted">Loading...</div>
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  return children
}
