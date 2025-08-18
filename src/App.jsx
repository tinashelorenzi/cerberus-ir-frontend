import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Header from './components/layout/Header'
import Dashboard from './components/Dashboard'
import './index.css'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-cerberus-dark">
        <ProtectedRoute>
          <Header />
          <Dashboard />
        </ProtectedRoute>
      </div>
    </AuthProvider>
  )
}

export default App