import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface Props {
  children: ReactNode
  requireRole?: 'trainee' | 'coach'
}

export function ProtectedRoute({ children, requireRole }: Props) {
  const { session, profile, loading } = useAuthStore()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg)',
      }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/setup" replace />

  if (requireRole && profile.role !== requireRole) {
    return <Navigate to={profile.role === 'coach' ? '/coach' : '/map'} replace />
  }

  return <>{children}</>
}
