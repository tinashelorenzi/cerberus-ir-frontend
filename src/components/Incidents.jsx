import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import incidentsAPI from '../services/incidents';
import PlaybookAPI from '../services/PlaybookAPI';
import PlaybookFlow from './playbooks/PlaybookFlow';

const Incidents = () => {
  const { user } = useAuth();
  
  // State management
  const [ownedIncidents, setOwnedIncidents] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [takingOwnership, setTakingOwnership] = useState(new Set());
  
  // Filters
  const [alertFilters, setAlertFilters] = useState({
    severity: 'all',
    status: 'all',
    search: ''
  });

  // Playbook modal state
  const [showPlaybookModal, setShowPlaybookModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [playbooks, setPlaybooks] = useState([]);
  const [playbooksLoading, setPlaybooksLoading] = useState(false);
  const [playbookSearch, setPlaybookSearch] = useState('');
  
  // PlaybookFlow modal state
  const [showPlaybookFlow, setShowPlaybookFlow] = useState(false);
  const [selectedPlaybook, setSelectedPlaybook] = useState(null);
  const [showResolvedIncidents, setShowResolvedIncidents] = useState(false);
  
  // Add new state for closure details modal
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [selectedClosedIncident, setSelectedClosedIncident] = useState(null);
  const [closureDetails, setClosureDetails] = useState(null);
  const [loadingClosureDetails, setLoadingClosureDetails] = useState(false);
  
  // Initialize WebSocket connection and event listeners
  useEffect(() => {
    const initializeConnection = () => {
      setIsLoading(true);
      setError(null);

      // Set up event listeners
      incidentsAPI.on('initialDataReceived', handleInitialData);
      incidentsAPI.on('recentAlertsReceived', handleRecentAlerts);
      incidentsAPI.on('ownedIncidentsReceived', handleOwnedIncidents);
      incidentsAPI.on('alertReceived', handleNewAlert);
      incidentsAPI.on('alertUpdated', handleAlertUpdate);
      incidentsAPI.on('incidentCreated', handleIncidentCreated);
      incidentsAPI.on('incidentUpdated', handleIncidentUpdated);
      incidentsAPI.on('ownershipTaken', handleOwnershipTaken);
      incidentsAPI.on('websocketError', handleWebSocketError);
      incidentsAPI.on('connectionFailed', handleConnectionFailed);

      // Connect WebSocket
      incidentsAPI.connectWebSocket();
      setIsConnected(true);
      setIsLoading(false);
    };

    initializeConnection();

    // Cleanup on unmount
    return () => {
      incidentsAPI.off('initialDataReceived', handleInitialData);
      incidentsAPI.off('recentAlertsReceived', handleRecentAlerts);
      incidentsAPI.off('ownedIncidentsReceived', handleOwnedIncidents);
      incidentsAPI.off('alertReceived', handleNewAlert);
      incidentsAPI.off('alertUpdated', handleAlertUpdate);
      incidentsAPI.off('incidentCreated', handleIncidentCreated);
      incidentsAPI.off('incidentUpdated', handleIncidentUpdated);
      incidentsAPI.off('ownershipTaken', handleOwnershipTaken);
      incidentsAPI.off('websocketError', handleWebSocketError);
      incidentsAPI.off('connectionFailed', handleConnectionFailed);
      
      incidentsAPI.disconnectWebSocket();
    };
  }, []);

  // Event handlers
  const handleInitialData = useCallback((data) => {
    if (data.owned_incidents) {
      setOwnedIncidents(data.owned_incidents);
    }
    setIsLoading(false);
  }, []);

  const handleRecentAlerts = useCallback((data) => {
    setRecentAlerts(data.alerts || []);
  }, []);

  const handleOwnedIncidents = useCallback((data) => {
    setOwnedIncidents(data.incidents || []);
  }, []);

  const handleNewAlert = useCallback((alert) => {
    setRecentAlerts(prev => [alert, ...prev].slice(0, 50)); // Keep latest 50
  }, []);

  const handleAlertUpdate = useCallback((alert) => {
    setRecentAlerts(prev => 
      prev.map(a => a.id === alert.id ? alert : a)
    );
  }, []);

  const handleIncidentCreated = useCallback((incident) => {
    setOwnedIncidents(prev => [incident, ...prev]);
  }, []);

  const handleIncidentUpdated = useCallback((incident) => {
    setOwnedIncidents(prev => 
      prev.map(i => i.id === incident.id ? incident : i)
    );
  }, []);

  const handleOwnershipTaken = useCallback((data) => {
    if (data.success && data.incident) {
      setOwnedIncidents(prev => [data.incident, ...prev]);
      // Remove alert from recent alerts if it exists
      setRecentAlerts(prev => 
        prev.filter(alert => !data.incident.alert_ids?.includes(alert.id))
      );
    }
    setTakingOwnership(prev => {
      const newSet = new Set(prev);
      newSet.delete(data.alert_id);
      return newSet;
    });
  }, []);

  const handleWebSocketError = useCallback((error) => {
    console.error('WebSocket error:', error);
    setError(error.message);
  }, []);

  const handleConnectionFailed = useCallback((error) => {
    setIsConnected(false);
    setError('Connection to server failed. Some features may not work properly.');
  }, []);

  // Take ownership of an alert
  const handleTakeOwnership = async (alert) => {
    try {
      setTakingOwnership(prev => new Set(prev).add(alert.id));
      setError(null);
      
      // This should now automatically update alert status to "investigating"
      await incidentsAPI.takeOwnership(alert.id);
      
    } catch (error) {
      console.error('Failed to take ownership:', error);
      setError(`Failed to take ownership: ${error.message}`);
    } finally {
      setTakingOwnership(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }
  };

  // Trigger playbook for incident
  const handleTriggerPlaybook = async (incident) => {
    try {
      setSelectedIncident(incident);
      setPlaybooksLoading(true);
      setPlaybookSearch('');
      
      // Load active playbooks
      const data = await PlaybookAPI.getPlaybooks({ 
        status: 'active',
        size: 100 // Get more playbooks for selection
      });
      setSelectedIncident(incident);
      
      setPlaybooks(data.items || []);
      setShowPlaybookModal(true);
    } catch (error) {
      console.error('Failed to load playbooks:', error);
      setError(`Failed to load playbooks: ${error.message}`);
    } finally {
      setPlaybooksLoading(false);
    }
  };

  // Select and trigger a playbook
  const handleSelectPlaybook = async (playbook) => {
    try {
      // Close the playbook selection modal
      setShowPlaybookModal(false);
      
      // Set the selected playbook and open the PlaybookFlow modal
      setSelectedPlaybook(playbook);
      setShowPlaybookFlow(true);
      
      console.log('Opening playbook flow for:', playbook.name, 'incident:', selectedIncident.incident_id);
    } catch (error) {
      console.error('Failed to open playbook flow:', error);
      setError(`Failed to open playbook flow: ${error.message}`);
    }
  };

  // Function to determine if incident is closed/resolved
  const isIncidentClosed = (incident) => {
    const closedStatuses = ['resolved', 'closed', 'false_positive'];
    return closedStatuses.includes(incident.status?.toLowerCase());
  };

  // Function to handle viewing closure details
  const handleViewClosureDetails = async (incident) => {
    try {
      setSelectedClosedIncident(incident);
      setLoadingClosureDetails(true);
      setShowClosureModal(true);
      
      // Fetch the closure details from the completed flow
      const closureData = await incidentsAPI.getIncidentClosureDetails(incident.incident_id);
      setClosureDetails(closureData);
    } catch (error) {
      console.error('Failed to load closure details:', error);
      setError(`Failed to load closure details: ${error.message}`);
    } finally {
      setLoadingClosureDetails(false);
    }
  };

  // Updated function to render action buttons
  const renderIncidentActions = (incident) => {
    if (isIncidentClosed(incident)) {
      return (
        <button
          onClick={() => handleViewClosureDetails(incident)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
          title="View closure details"
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          View Details
        </button>
      );
    } else {
      return (
        <button
          onClick={() => handleTriggerPlaybook(incident)}
          className="bg-cerberus-red hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
          title="Trigger incident response playbook"
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Trigger Playbook
        </button>
      );
    }
  };

  // Filter playbooks based on search
  const filteredPlaybooks = playbooks.filter(playbook => {
    if (!playbookSearch) return true;
    return playbook.name?.toLowerCase().includes(playbookSearch.toLowerCase()) ||
           playbook.description?.toLowerCase().includes(playbookSearch.toLowerCase()) ||
           playbook.tags?.some(tag => tag.toLowerCase().includes(playbookSearch.toLowerCase()));
  });

  // UPDATE THE INCIDENT FILTERING (around line 200-250):
  const filteredOwnedIncidents = ownedIncidents.filter(incident => {
    // Status filter - only show open incidents unless toggle is enabled
    if (!showResolvedIncidents) {
      const openStatuses = ['new', 'investigating', 'in_progress', 'contained', 'active'];
      const isOpen = openStatuses.includes(incident.status?.toLowerCase());
      if (!isOpen) return false;
    }
    
    // Apply other existing filters...
    return true;
  });

  // Filter alerts based on current filters
  const filteredAlerts = recentAlerts.filter(alert => {
    const severityMatch = alertFilters.severity === 'all' || 
                         alert.severity?.toLowerCase() === alertFilters.severity;
    const statusMatch = alertFilters.status === 'all' || 
                       alert.status?.toLowerCase() === alertFilters.status;
    const searchMatch = !alertFilters.search || 
                       alert.title?.toLowerCase().includes(alertFilters.search.toLowerCase()) ||
                       alert.description?.toLowerCase().includes(alertFilters.search.toLowerCase());
    
    return severityMatch && statusMatch && searchMatch;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cerberus-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cerberus-red mx-auto mb-4"></div>
          <p className="text-white text-lg">Connecting to incident management system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cerberus-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Incident Management
              </h1>
              <p className="text-gray-400">
                Monitor alerts and manage your security incidents in real-time.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-400">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {/* NEW: Toggle for resolved incidents */}
              <div className="flex items-center space-x-2">
    <label className="text-sm text-gray-400">Show resolved:</label>
    <button
      onClick={() => setShowResolvedIncidents(!showResolvedIncidents)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:ring-offset-2 ${
        showResolvedIncidents ? 'bg-cerberus-red' : 'bg-gray-600'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          showResolvedIncidents ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-300"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Owned Incidents Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            {showResolvedIncidents ? 'Your Incidents' : 'Your Active Incidents'}
          </h2>
          
          {filteredOwnedIncidents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredOwnedIncidents.map(incident => (
                <div key={incident.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {incident.incident_id}
                      </h3>
                      <p className="text-gray-300 text-sm line-clamp-2">
                        {incident.title}
                      </p>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        incidentsAPI.getSeverityColor(incident.severity)
                      }`}>
                        {incident.severity?.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        incidentsAPI.getPriorityColor(incident.priority)
                      }`}>
                        {incident.priority?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${
                      incidentsAPI.getStatusColor(incident.status)
                    }`}>
                      {incident.status?.replace('_', ' ').toUpperCase()}
                    </span>
                    {incidentsAPI.isIncidentOverdue(incident) && (
                      <span className="ml-2 inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-600 text-white">
                        OVERDUE
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-gray-400 mb-4">
                    <p>Created: {incidentsAPI.formatTimestamp(incident.created_at)}</p>
                    <p>Alerts: {incident.alert_count || incident.alert_ids?.length || 0}</p>
                  </div>

                  <div className="flex space-x-2">
                    {renderIncidentActions(incident)}
                    <button className="px-3 py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 rounded-md text-sm transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                {showResolvedIncidents ? 'No Incidents Found' : 'No Active Incidents'}
              </h3>
              <p className="text-gray-400">
                {showResolvedIncidents 
                  ? 'You don\'t have any incidents matching the current filter.'
                  : 'You don\'t have any active incidents. Take ownership of alerts below to create incidents.'
                }
              </p>
            </div>
          )}
        </div>

        {/* Recent Alerts Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Alerts</h2>
            <div className="flex space-x-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search alerts..."
                  value={alertFilters.search}
                  onChange={(e) => setAlertFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                />
                <svg className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Severity Filter */}
              <select
                value={alertFilters.severity}
                onChange={(e) => setAlertFilters(prev => ({ ...prev, severity: e.target.value }))}
                className="bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cerberus-red"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              {/* Status Filter */}
              <select
                value={alertFilters.status}
                onChange={(e) => setAlertFilters(prev => ({ ...prev, status: e.target.value }))}
                className="bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cerberus-red"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="triaged">Triaged</option>
                <option value="investigating">Investigating</option>
              </select>
            </div>
          </div>

          {/* Alerts Table */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-750">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Alert
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Detected
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {filteredAlerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-gray-750 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {alert.title}
                          </div>
                          <div className="text-sm text-gray-400 line-clamp-2">
                            {alert.description}
                          </div>
                          {alert.external_alert_id && (
                            <div className="text-xs text-gray-500 mt-1">
                              ID: {alert.external_alert_id}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          incidentsAPI.getSeverityColor(alert.severity)
                        }`}>
                          {alert.severity?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${
                          incidentsAPI.getStatusColor(alert.status)
                        }`}>
                          {alert.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {alert.source || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {incidentsAPI.formatTimestamp(alert.detected_at || alert.received_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {alert.assigned_analyst_id ? (
                          <span className="text-gray-500">Assigned</span>
                        ) : (
                          <button
                            onClick={() => handleTakeOwnership(alert)}
                            disabled={takingOwnership.has(alert.id)}
                            className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white transition-colors ${
                              takingOwnership.has(alert.id)
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-cerberus-red hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cerberus-red'
                            }`}
                          >
                            {takingOwnership.has(alert.id) ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Taking...
                              </>
                            ) : (
                              'Take Ownership'
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredAlerts.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No alerts found</h3>
                <p className="text-gray-400 mb-4">
                  {alertFilters.search || alertFilters.severity !== 'all' || alertFilters.status !== 'all'
                    ? 'No alerts match your current filters.'
                    : 'No recent alerts available.'}
                </p>
                {(alertFilters.search || alertFilters.severity !== 'all' || alertFilters.status !== 'all') && (
                  <button 
                    onClick={() => setAlertFilters({ severity: 'all', status: 'all', search: '' })}
                    className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cerberus-red transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Live Updates Indicator */}
          {isConnected && recentAlerts.length > 0 && (
            <div className="mt-4 flex items-center justify-center text-sm text-gray-400">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                Live updates enabled - New alerts will appear automatically
              </div>
            </div>
          )}
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-cerberus-red rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">
                  {showResolvedIncidents ? 'Total Incidents' : 'Active Incidents'}
                </p>
                <p className="text-2xl font-semibold text-white">{filteredOwnedIncidents.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Unassigned Alerts</p>
                <p className="text-2xl font-semibold text-white">
                  {recentAlerts.filter(alert => !alert.assigned_analyst_id).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Critical Alerts</p>
                <p className="text-2xl font-semibold text-white">
                  {recentAlerts.filter(alert => alert.severity?.toLowerCase() === 'critical').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isConnected ? 'bg-green-600' : 'bg-red-600'
                }`}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Connection Status</p>
                <p className="text-2xl font-semibold text-white">
                  {isConnected ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </div>
                 </div>
       </div>

       {/* Playbook Selection Modal */}
       {showPlaybookModal && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
           <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
             <div className="p-6">
               <div className="flex items-center justify-between mb-6">
                 <div>
                   <h2 className="text-xl font-bold text-white">Select Playbook</h2>
                   <p className="text-gray-400 text-sm mt-1">
                     Choose a playbook to trigger for incident {selectedIncident?.incident_id}
                   </p>
                 </div>
                 <button
                   onClick={() => {
                     setShowPlaybookModal(false);
                     setSelectedIncident(null);
                     setPlaybooks([]);
                   }}
                   className="text-gray-400 hover:text-white"
                 >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>

               {/* Search */}
               <div className="mb-6">
                 <div className="relative">
                   <input
                     type="text"
                     placeholder="Search playbooks..."
                     value={playbookSearch}
                     onChange={(e) => setPlaybookSearch(e.target.value)}
                     className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                   />
                   <svg className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                   </svg>
                 </div>
               </div>

               {/* Playbooks Grid */}
               {playbooksLoading ? (
                 <div className="flex items-center justify-center py-12">
                   <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cerberus-red"></div>
                   <span className="ml-3 text-white">Loading playbooks...</span>
                 </div>
               ) : filteredPlaybooks.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {filteredPlaybooks.map((playbook) => (
                     <div
                       key={playbook.id}
                       className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-cerberus-red transition-colors cursor-pointer"
                       onClick={() => handleSelectPlaybook(playbook)}
                     >
                       <div className="flex justify-between items-start mb-3">
                         <h3 className="text-lg font-semibold text-white line-clamp-2">
                           {playbook.name}
                         </h3>
                         <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                           playbook.status === 'active' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                         }`}>
                           {playbook.status?.toUpperCase()}
                         </span>
                       </div>
                       
                       <p className="text-gray-300 text-sm mb-3 line-clamp-3">
                         {playbook.description}
                       </p>
                       
                       <div className="flex flex-wrap gap-1 mb-3">
                         {playbook.tags?.slice(0, 3).map((tag, index) => (
                           <span
                             key={index}
                             className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded-full"
                           >
                             {tag}
                           </span>
                         ))}
                         {playbook.tags?.length > 3 && (
                           <span className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded-full">
                             +{playbook.tags.length - 3}
                           </span>
                         )}
                       </div>
                       
                       <div className="flex justify-between items-center text-xs text-gray-400">
                       <span>Steps: {(() => {
  let totalSteps = 0;
  if (playbook.playbook_definition?.phases) {
    playbook.playbook_definition.phases.forEach(phase => {
      if (phase.steps) {
        totalSteps += phase.steps.length;
      }
    });
  }
  return totalSteps;
})()}</span>
                         <span>Created: {new Date(playbook.created_at).toLocaleDateString()}</span>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center py-12">
                   <div className="text-gray-400 mb-4">
                     <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                     </svg>
                   </div>
                   <h3 className="text-lg font-medium text-white mb-2">
                     {playbookSearch ? 'No playbooks found' : 'No active playbooks available'}
                   </h3>
                   <p className="text-gray-400 mb-4">
                     {playbookSearch 
                       ? 'No playbooks match your search criteria.'
                       : 'There are no active playbooks available for selection.'
                     }
                   </p>
                   {playbookSearch && (
                     <button 
                       onClick={() => setPlaybookSearch('')}
                       className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cerberus-red transition-colors"
                     >
                       Clear Search
                     </button>
                   )}
                 </div>
               )}
             </div>
           </div>
         </div>
       )}

               {/* PlaybookFlow Modal */}
        {showPlaybookFlow && selectedPlaybook && selectedIncident && (
          <PlaybookFlow
            playbook={selectedPlaybook}
            incident={selectedIncident}
            onClose={() => {
              setShowPlaybookFlow(false);
              setSelectedPlaybook(null);
              setSelectedIncident(null);
              setPlaybooks([]);
            }}
          />
        )}

        {/* Closure Details Modal */}
        {showClosureModal && selectedClosedIncident && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden mx-4">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white">Incident Closure Details</h2>
                  <p className="text-gray-400 text-sm">
                    {selectedClosedIncident.title} - {selectedClosedIncident.incident_id}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowClosureModal(false);
                    setSelectedClosedIncident(null);
                    setClosureDetails(null);
                  }}
                  className="text-gray-400 hover:text-white p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {loadingClosureDetails ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cerberus-red"></div>
                    <span className="ml-3 text-gray-400">Loading closure details...</span>
                  </div>
                ) : closureDetails ? (
                  <div className="space-y-6">
                    {/* Incident Summary */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="font-semibold text-white mb-3">Incident Summary</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Status:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                            selectedClosedIncident.status === 'resolved' 
                              ? 'bg-green-900 text-green-300'
                              : selectedClosedIncident.status === 'false_positive'
                              ? 'bg-yellow-900 text-yellow-300'
                              : 'bg-gray-900 text-gray-300'
                          }`}>
                            {selectedClosedIncident.status?.toUpperCase() || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Severity:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                            selectedClosedIncident.severity === 'critical' 
                              ? 'bg-red-900 text-red-300'
                              : selectedClosedIncident.severity === 'high'
                              ? 'bg-orange-900 text-orange-300'
                              : 'bg-gray-900 text-gray-300'
                          }`}>
                            {selectedClosedIncident.severity?.toUpperCase() || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Assigned to:</span>
                          <span className="ml-2 text-white">{closureDetails.assigned_analyst || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Closed at:</span>
                          <span className="ml-2 text-white">
                            {closureDetails.completed_at ? new Date(closureDetails.completed_at).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Playbook Information */}
                    {closureDetails.playbook_name && (
                      <div className="bg-gray-700 rounded-lg p-4">
                        <h3 className="font-semibold text-white mb-3">Playbook Used</h3>
                        <div className="text-sm">
                          <div className="text-white font-medium">{closureDetails.playbook_name}</div>
                          {closureDetails.playbook_description && (
                            <div className="text-gray-400 mt-1">{closureDetails.playbook_description}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Investigation Steps */}
                    {closureDetails.steps && closureDetails.steps.length > 0 && (
                      <div className="bg-gray-700 rounded-lg p-4">
                        <h3 className="font-semibold text-white mb-3">Investigation Steps</h3>
                        <div className="space-y-3">
                          {closureDetails.steps.map((step, index) => (
                            <div key={index} className="border-l-2 border-gray-600 pl-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-white">{step.step_name}</h4>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  step.status === 'completed' 
                                    ? 'bg-green-900 text-green-300'
                                    : step.status === 'failed'
                                    ? 'bg-red-900 text-red-300'
                                    : 'bg-gray-900 text-gray-300'
                                }`}>
                                  {step.status?.toUpperCase()}
                                </span>
                              </div>
                              {step.description && (
                                <p className="text-gray-400 text-sm mt-1">{step.description}</p>
                              )}
                              {step.output_summary && (
                                <div className="mt-2 p-2 bg-gray-800 rounded text-sm">
                                  <span className="text-gray-400">Output: </span>
                                  <span className="text-white">{step.output_summary}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* User Inputs */}
                    {closureDetails.user_inputs && closureDetails.user_inputs.length > 0 && (
                      <div className="bg-gray-700 rounded-lg p-4">
                        <h3 className="font-semibold text-white mb-3">Analyst Inputs</h3>
                        <div className="space-y-3">
                          {closureDetails.user_inputs.map((input, index) => (
                            <div key={index} className="bg-gray-800 rounded p-3">
                              <div className="font-medium text-white">{input.field_name}</div>
                              <div className="text-gray-400 text-sm mt-1">{input.value}</div>
                              {input.created_at && (
                                <div className="text-xs text-gray-500 mt-2">
                                  {new Date(input.created_at).toLocaleString()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Final Report */}
                    {closureDetails.final_report && (
                      <div className="bg-gray-700 rounded-lg p-4">
                        <h3 className="font-semibold text-white mb-3">Final Report</h3>
                        <div className="text-gray-300 whitespace-pre-wrap">
                          {closureDetails.final_report}
                        </div>
                      </div>
                    )}

                    {/* Response Metrics */}
                    {(closureDetails.time_to_containment || closureDetails.time_to_resolution) && (
                      <div className="bg-gray-700 rounded-lg p-4">
                        <h3 className="font-semibold text-white mb-3">Response Metrics</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {closureDetails.time_to_containment && (
                            <div>
                              <span className="text-gray-400">Time to Containment:</span>
                              <span className="ml-2 text-white">{closureDetails.time_to_containment} minutes</span>
                            </div>
                          )}
                          {closureDetails.time_to_resolution && (
                            <div>
                              <span className="text-gray-400">Time to Resolution:</span>
                              <span className="ml-2 text-white">{closureDetails.time_to_resolution} minutes</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400">No closure details available for this incident.</div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-700 flex justify-end">
                <button
                  onClick={() => {
                    setShowClosureModal(false);
                    setSelectedClosedIncident(null);
                    setClosureDetails(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

export default Incidents;