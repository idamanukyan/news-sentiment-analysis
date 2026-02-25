import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './contexts/authStore'
import { ErrorBoundary } from './components/ErrorBoundary'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import ElectionDashboard from './pages/ElectionDashboard'
import NarrativesPage from './pages/NarrativesPage'
import AlertsPage from './pages/AlertsPage'
import NewsPage from './pages/NewsPage'
import SourcesPage from './pages/SourcesPage'
import ReportsPage from './pages/ReportsPage'
import TopicsPage from './pages/TopicsPage'
import SettingsPage from './pages/SettingsPage'
import UserGuidePage from './pages/UserGuidePage'
import AlertRulesPage from './pages/AlertRulesPage'
import AdminPanelPage from './pages/AdminPanelPage'
import TeamSettingsPage from './pages/TeamSettingsPage'
import TeamPage from './pages/TeamPage'
import BookmarksPage from './pages/BookmarksPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  return (
    <ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1E293B',
            color: '#F8FAFC',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#22C55E',
              secondary: '#F8FAFC',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#F8FAFC',
            },
            duration: 5000,
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/election" replace />} />
          <Route path="election" element={<ElectionDashboard />} />
          <Route path="narratives" element={<NarrativesPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="alert-rules" element={<AlertRulesPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="bookmarks" element={<BookmarksPage />} />
          <Route path="sources" element={<SourcesPage />} />
          <Route path="telegram" element={<Navigate to="/news" replace />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="topics" element={<TopicsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="guide" element={<UserGuidePage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="team/settings" element={<TeamSettingsPage />} />
          <Route path="admin" element={<AdminPanelPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}

export default App
