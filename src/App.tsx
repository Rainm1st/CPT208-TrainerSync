import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { ProtectedRoute } from './components/ProtectedRoute'

import LoginPage         from './pages/LoginPage'
import RegisterPage      from './pages/RegisterPage'
import SetupProfilePage  from './pages/SetupProfilePage'

import TraineePage       from './pages/trainee/TraineePage'
import ExercisePage      from './pages/trainee/ExercisePage'
import TrainingPage      from './pages/trainee/TrainingPage'
import SummaryPage       from './pages/trainee/SummaryPage'
import BuddiesPage       from './pages/trainee/BuddiesPage'
import BuddyProfilePage  from './pages/trainee/BuddyProfilePage'
import CheerPreviewPage  from './pages/trainee/CheerPreviewPage'
import EmojiPreviewPage  from './pages/trainee/EmojiPreviewPage'
import FriendsPage       from './pages/trainee/FriendsPage'
import ProfilePage       from './pages/trainee/ProfilePage'

function AppRoutes() {
  const { init } = useAuthStore()
  useEffect(() => { return init() }, [init])

  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/setup"    element={<SetupProfilePage />} />

      {/* Trainee */}
      <Route path="/map"           element={<ProtectedRoute><TraineePage /></ProtectedRoute>} />
      <Route path="/exercise"      element={<ProtectedRoute><ExercisePage /></ProtectedRoute>} />
      <Route path="/train"         element={<ProtectedRoute><TrainingPage /></ProtectedRoute>} />
      <Route path="/summary"       element={<ProtectedRoute><SummaryPage /></ProtectedRoute>} />
      <Route path="/buddies"       element={<ProtectedRoute><BuddiesPage /></ProtectedRoute>} />
      <Route path="/buddy/:id"     element={<ProtectedRoute><BuddyProfilePage /></ProtectedRoute>} />
      <Route path="/cheer-preview" element={<ProtectedRoute><CheerPreviewPage /></ProtectedRoute>} />
      <Route path="/emoji-preview" element={<ProtectedRoute><EmojiPreviewPage /></ProtectedRoute>} />
      <Route path="/friends"       element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
      <Route path="/profile"       element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

      {/* Root → map */}
      <Route path="/" element={<ProtectedRoute><Navigate to="/map" replace /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppRoutes />
    </BrowserRouter>
  )
}
