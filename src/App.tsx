import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { ProtectedRoute } from './components/ProtectedRoute'

import LoginPage         from './pages/LoginPage'
import RegisterPage      from './pages/RegisterPage'
import SetupProfilePage  from './pages/SetupProfilePage'

// Trainee pages
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

// Coach pages
import CoachPage         from './pages/coach/CoachPage'
import MenteesPage       from './pages/coach/MenteesPage'
import MenteeDetailPage  from './pages/coach/MenteeDetailPage'
import CoachMessagesPage  from './pages/coach/CoachMessagesPage'
import CoachChatPage      from './pages/coach/CoachChatPage'
import CoachSettingsPage  from './pages/coach/CoachSettingsPage'

function RoleHome() {
  const { profile } = useAuthStore()
  return <Navigate to={profile!.role === 'coach' ? '/coach' : '/map'} replace />
}

function AppRoutes() {
  const { init } = useAuthStore()
  useEffect(() => { return init() }, [init])

  const T = (role?: 'trainee' | 'coach') =>
    (el: React.ReactElement) =>
      <ProtectedRoute requireRole={role}>{el}</ProtectedRoute>

  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/setup"    element={<SetupProfilePage />} />

      {/* Trainee */}
      <Route path="/map"           element={T('trainee')(<TraineePage />)} />
      <Route path="/exercise"      element={T('trainee')(<ExercisePage />)} />
      <Route path="/train"         element={T('trainee')(<TrainingPage />)} />
      <Route path="/summary"       element={T('trainee')(<SummaryPage />)} />
      <Route path="/buddies"       element={T('trainee')(<BuddiesPage />)} />
      <Route path="/buddy/:id"     element={T('trainee')(<BuddyProfilePage />)} />
      <Route path="/cheer-preview" element={T('trainee')(<CheerPreviewPage />)} />
      <Route path="/emoji-preview" element={T('trainee')(<EmojiPreviewPage />)} />
      <Route path="/friends"       element={T('trainee')(<FriendsPage />)} />
      <Route path="/profile"       element={T('trainee')(<ProfilePage />)} />

      {/* Coach */}
      <Route path="/coach"              element={T('coach')(<CoachPage />)} />
      <Route path="/mentees"            element={T('coach')(<MenteesPage />)} />
      <Route path="/mentee/:id"         element={T('coach')(<MenteeDetailPage />)} />
      <Route path="/coach/messages"     element={T('coach')(<CoachMessagesPage />)} />
      <Route path="/coach/chat/:id"     element={T('coach')(<CoachChatPage />)} />
      <Route path="/coach/settings"     element={T('coach')(<CoachSettingsPage />)} />

      {/* Root → role home */}
      <Route path="/" element={<ProtectedRoute><RoleHome /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
