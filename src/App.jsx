import { useState } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Header from './components/layout/Header'
import Dashboard from './components/Dashboard'
import './index.css'

function App() {
  const [currentView, setCurrentView] = useState('dashboard')

  return (
    <AuthProvider>
      <div className="min-h-screen bg-cerberus-dark">
        <ProtectedRoute>
          <Header currentView={currentView} setCurrentView={setCurrentView} />
          <Dashboard currentView={currentView} setCurrentView={setCurrentView} />
        </ProtectedRoute>
      </div>
    </AuthProvider>
  )
}

export default App