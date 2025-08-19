import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Incidents = () => {
  const { user } = useAuth();
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Mock data for demonstration
  const incidents = [
    {
      id: 'INC-2024-001',
      title: 'Suspicious Network Activity Detected',
      severity: 'High',
      status: 'Open',
      assignee: 'John Doe',
      source: 'SIEM Alert',
      timestamp: '2024-01-15T10:30:00Z',
      description: 'Multiple failed login attempts detected from external IP addresses.'
    },
    {
      id: 'INC-2024-002',
      title: 'Malware Detection Alert',
      severity: 'Critical',
      status: 'In Progress',
      assignee: 'Jane Smith',
      source: 'EDR System',
      timestamp: '2024-01-15T09:15:00Z',
      description: 'Suspicious file execution detected on endpoint workstation.'
    },
    {
      id: 'INC-2024-003',
      title: 'Data Exfiltration Attempt',
      severity: 'Critical',
      status: 'Open',
      assignee: 'Mike Johnson',
      source: 'DLP System',
      timestamp: '2024-01-15T08:45:00Z',
      description: 'Large data transfer detected to external server.'
    },
    {
      id: 'INC-2024-004',
      title: 'Phishing Email Campaign',
      severity: 'Medium',
      status: 'Resolved',
      assignee: 'Sarah Lee',
      source: 'Email Security',
      timestamp: '2024-01-14T16:20:00Z',
      description: 'Phishing emails targeting company employees detected.'
    },
    {
      id: 'INC-2024-005',
      title: 'Unauthorized Access Attempt',
      severity: 'Low',
      status: 'Closed',
      assignee: 'David Chen',
      source: 'Access Control',
      timestamp: '2024-01-14T14:10:00Z',
      description: 'Failed authentication attempts on admin portal.'
    }
  ];

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'medium': return 'bg-yellow-600 text-white';
      case 'low': return 'bg-blue-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'open': return 'bg-red-100 text-red-800 border-red-200';
      case 'in progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredIncidents = incidents.filter(incident => {
    const severityMatch = selectedSeverity === 'all' || incident.severity.toLowerCase() === selectedSeverity;
    const statusMatch = selectedStatus === 'all' || incident.status.toLowerCase() === selectedStatus;
    return severityMatch && statusMatch;
  });

  return (
    <div className="min-h-screen bg-cerberus-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-white mb-2">
            Security Incidents
          </h1>
          <p className="text-gray-400">
            Monitor and manage security incidents across your organization.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card-glass">
            <div className="flex items-center">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Incidents</p>
                <p className="text-2xl font-bold text-white">{incidents.length}</p>
              </div>
            </div>
          </div>

          <div className="card-glass">
            <div className="flex items-center">
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Open Incidents</p>
                <p className="text-2xl font-bold text-white">
                  {incidents.filter(i => i.status === 'Open').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card-glass">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-white">
                  {incidents.filter(i => i.status === 'In Progress').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card-glass">
            <div className="flex items-center">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Resolved Today</p>
                <p className="text-2xl font-bold text-white">
                  {incidents.filter(i => i.status === 'Resolved').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="card-glass mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="input-field"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="input-field"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <button className="btn-primary">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Incident
            </button>
          </div>
        </div>

        {/* Incidents Table */}
        <div className="card-glass">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Incident ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Title</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Severity</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Assignee</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Source</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Timestamp</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredIncidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-gray-700/30 transition-colors duration-200">
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm text-cerberus-green">{incident.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-white">{incident.title}</div>
                        <div className="text-sm text-gray-400">{incident.description}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(incident.severity)}`}>
                        {incident.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(incident.status)}`}>
                        {incident.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {incident.assignee}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {incident.source}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {formatTimestamp(incident.timestamp)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button className="text-blue-400 hover:text-blue-300 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button className="text-yellow-400 hover:text-yellow-300 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button className="text-green-400 hover:text-green-300 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredIncidents.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No incidents found</h3>
              <p className="text-gray-400 mb-4">No incidents match your current filters.</p>
              <button 
                onClick={() => {
                  setSelectedSeverity('all');
                  setSelectedStatus('all');
                }}
                className="btn-secondary"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Incidents;
