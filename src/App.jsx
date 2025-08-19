import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Header from './components/layout/Header'
import Dashboard from './components/Dashboard'
import PlaybookManagement from './components/playbooks/PlaybookManagement'
import EndpointTokens from './components/EndpointTokens'
import './index.css'

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-cerberus-dark">
          <ProtectedRoute>
            <Header />
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/playbooks" element={<PlaybookManagement />} />
              <Route path="/endpoint-tokens" element={<EndpointTokens />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ProtectedRoute>
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App