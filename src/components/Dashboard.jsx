import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import PlaybookManagement from './playbooks/PlaybookManagement'

function Dashboard({ currentView, setCurrentView }) {
  const { user } = useAuth()
  const [incidents] = useState([
    { id: 1, title: 'Suspicious Network Activity', severity: 'High', status: 'Active', time: '2 hours ago', assignee: 'John Smith' },
    { id: 2, title: 'Unauthorized Access Attempt', severity: 'Medium', status: 'Investigating', time: '4 hours ago', assignee: 'Sarah Johnson' },
    { id: 3, title: 'Malware Detection Alert', severity: 'Critical', status: 'Contained', time: '6 hours ago', assignee: 'Mike Davis' },
    { id: 4, title: 'Data Exfiltration Attempt', severity: 'High', status: 'Resolved', time: '1 day ago', assignee: 'Lisa Chen' },
  ])

  const [stats] = useState({
    totalIncidents: 24,
    activeIncidents: 3,
    resolvedToday: 8,
    avgResponseTime: '2.3h'
  })

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return 'text-red-400 bg-red-900/20 border-red-500/30'
      case 'High': return 'text-orange-400 bg-orange-900/20 border-orange-500/30'
      case 'Medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30'
      case 'Low': return 'text-green-400 bg-green-900/20 border-green-500/30'
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'text-red-400 bg-red-900/20 border-red-500/30'
      case 'Investigating': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30'
      case 'Contained': return 'text-blue-400 bg-blue-900/20 border-blue-500/30'
      case 'Resolved': return 'text-green-400 bg-green-900/20 border-green-500/30'
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30'
    }
  }

  const StatCard = ({ title, value, icon, trend, color = "cerberus-green" }) => (
    <div className="card-glass animate-fade-in hover:bg-gray-800/30 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {trend && (
            <p className="text-sm text-cerberus-green mt-1 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {trend}
            </p>
          )}
        </div>
        <div className={`p-4 bg-${color}/20 rounded-xl`}>
          {icon}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-cerberus-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section - Only show for dashboard view */}
        {currentView === 'dashboard' && (
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user?.full_name?.split(' ')[0]} 👋
            </h1>
            <p className="text-gray-400">
              Here's what's happening with your security operations today.
            </p>
          </div>
        )}

        {/* Dashboard Content */}
        {currentView === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Incidents"
                value={stats.totalIncidents}
                trend="+12% from last month"
                icon={
                  <svg className="w-8 h-8 text-cerberus-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
              />

              <StatCard
                title="Active Incidents"
                value={stats.activeIncidents}
                trend="-2 from yesterday"
                icon={
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                }
                color="red-500"
              />

              <StatCard
                title="Resolved Today"
                value={stats.resolvedToday}
                trend="+3 from yesterday"
                icon={
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                color="green-500"
              />

              <StatCard
                title="Avg Response Time"
                value={stats.avgResponseTime}
                trend="-15% improvement"
                icon={
                  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                color="purple-500"
              />
            </div>

            {/* Recent Incidents */}
            <div className="card-glass animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Recent Incidents</h2>
                <button className="btn-primary">View All</button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Incident</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Severity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Assignee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {incidents.map((incident) => (
                      <tr key={incident.id} className="hover:bg-gray-700/30 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{incident.title}</div>
                          <div className="text-sm text-gray-400">ID: #{incident.id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(incident.severity)}`}>
                            {incident.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(incident.status)}`}>
                            {incident.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {incident.assignee}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {incident.time}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-cerberus-green hover:text-cerberus-green-light mr-3 transition-colors">
                            View
                          </button>
                          <button className="text-gray-400 hover:text-gray-300 transition-colors">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions & System Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card-glass">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button className="w-full btn-primary flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create New Incident
                  </button>
                  <button className="w-full btn-secondary flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Generate Report
                  </button>
                  <button className="w-full btn-ghost flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search Incidents
                  </button>
                </div>
              </div>

              <div className="card-glass">
                <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Network Monitoring</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                      <span className="text-green-400 text-sm font-medium">Online</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Threat Detection</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                      <span className="text-green-400 text-sm font-medium">Active</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Backup Systems</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                      <span className="text-green-400 text-sm font-medium">Healthy</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Database Connection</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                      <span className="text-green-400 text-sm font-medium">Connected</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Playbooks Management */}
        {currentView === 'playbooks' && (
          <PlaybookManagement />
        )}

        {/* Other tabs placeholder */}
        {!['dashboard', 'playbooks'].includes(currentView) && (
          <div className="card-glass animate-fade-in">
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🚧</div>
              <h2 className="text-2xl font-semibold text-white mb-4">
                {currentView.charAt(0).toUpperCase() + currentView.slice(1)} Module
              </h2>
              <p className="text-gray-400 mb-6">
                This feature is currently under development and will be available soon.
              </p>
              <button 
                onClick={() => setCurrentView('dashboard')}
                className="btn-primary"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard