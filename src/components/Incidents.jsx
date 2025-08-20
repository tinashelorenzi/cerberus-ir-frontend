import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import incidentsAPI from '../services/incidents';
import PlaybookAPI from '../services/PlaybookAPI';
import PlaybookFlow from './playbooks/PlaybookFlow';
import FloatingToolbox from './common/FloatingToolbox';
import IncidentDetailsModal from './common/IncidentDetailsModal';
import AlertDetailsModal from './common/AlertDetailsModal';

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
  
  // Modal states for incident and alert details
  const [showIncidentDetailsModal, setShowIncidentDetailsModal] = useState(false);
  const [selectedIncidentForDetails, setSelectedIncidentForDetails] = useState(null);
  const [showAlertDetailsModal, setShowAlertDetailsModal] = useState(false);
  const [selectedAlertForDetails, setSelectedAlertForDetails] = useState(null);
  

  
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

  // Setup WebSocket refresh functionality
  useEffect(() => {
    // Make the refresh function available globally for the PlaybookFlow to call
    window.refreshIncidentsFromWebSocket = () => {
      // Refresh owned incidents
      if (incidentsAPI && incidentsAPI.getOwnedIncidents) {
        incidentsAPI.getOwnedIncidents(showResolvedIncidents).then(incidents => {
          if (Array.isArray(incidents)) {
            setOwnedIncidents(incidents);
          }
        }).catch(err => {
          console.error('Failed to refresh incidents:', err);
        });
      }
      
      // Refresh alerts if needed
      if (incidentsAPI && incidentsAPI.getRecentAlerts) {
        incidentsAPI.getRecentAlerts().then(alerts => {
          if (Array.isArray(alerts)) {
            setRecentAlerts(alerts);
          }
        }).catch(err => {
          console.error('Failed to refresh alerts:', err);
        });
      }
      
      console.log('Incidents refreshed via websocket trigger');
    };

    // Show success notification function
    window.showSuccessNotification = (message) => {
      setError(null); // Clear any existing errors
      
      // Remove any existing success notifications
      const existingNotifications = document.querySelectorAll('.success-notification');
      existingNotifications.forEach(notification => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      });
      
      // Create new success notification
      const successElement = document.createElement('div');
      successElement.className = 'success-notification fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2 animate-fade-in';
      successElement.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>${message}</span>
      `;
      document.body.appendChild(successElement);
      
      // Remove after 4 seconds
      setTimeout(() => {
        if (document.body.contains(successElement)) {
          successElement.style.opacity = '0';
          successElement.style.transform = 'translateX(100%)';
          setTimeout(() => {
            if (document.body.contains(successElement)) {
              document.body.removeChild(successElement);
            }
          }, 300);
        }
      }, 4000);
    };
    
    // Cleanup on unmount
    return () => {
      delete window.refreshIncidentsFromWebSocket;
      delete window.showSuccessNotification;
    };
  }, [showResolvedIncidents]);

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

  // Handler for viewing incident details
  const handleViewIncidentDetails = (incident) => {
    setSelectedIncidentForDetails(incident);
    setShowIncidentDetailsModal(true);
  };

  // Handler for viewing alert details
  const handleViewAlertDetails = (alert) => {
    setSelectedAlertForDetails(alert);
    setShowAlertDetailsModal(true);
  };

  // Handler for viewing alert details from incident modal
  const handleViewAlertFromIncident = async (alertId) => {
    try {
      // Try to find the alert in recent alerts first
      const existingAlert = recentAlerts.find(alert => alert.id === alertId);
      if (existingAlert) {
        setSelectedAlertForDetails(existingAlert);
        setShowAlertDetailsModal(true);
        return;
      }

      // If not found in recent alerts, fetch it from the API
      const alertDetails = await incidentsAPI.getAlert(alertId);
      setSelectedAlertForDetails(alertDetails);
      setShowAlertDetailsModal(true);
    } catch (error) {
      console.error('Failed to fetch alert details:', error);
      setError(`Failed to load alert details: ${error.message}`);
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
               {filteredOwnedIncidents.map((incident, index) => (
                                   <div key={incident.incident_id || index} className="bg-gray-750 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-colors">
                    {/* Header with title and badges */}
                    <div className="flex flex-col space-y-3 mb-3">
                      <div className="flex items-start justify-between">
                        <h3 className="text-white font-medium text-lg flex-1 mr-3">
                          {incident.title || `Incident #${incident.incident_id}`}
                        </h3>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            incidentsAPI.getSeverityColor(incident.severity)
                          }`}>
                            {incident.severity?.toUpperCase()}
                          </span>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${
                            incidentsAPI.getStatusColor(incident.status)
                          }`}>
                            {incident.status?.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {!isIncidentClosed(incident) && (
                            <>
                              <button
                                onClick={() => handleViewIncidentDetails(incident)}
                                className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-700"
                                title="View Details"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span className="text-sm">View Details</span>
                              </button>
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {!isIncidentClosed(incident) && (
                            <button
                              onClick={() => handleTriggerPlaybook(incident)}
                              className="bg-cerberus-red hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm transition-colors flex items-center space-x-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              <span>Run Playbook</span>
                            </button>
                          )}
                          
                          {isIncidentClosed(incident) && (
                            <button
                              onClick={() => handleViewClosureDetails(incident)}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm transition-colors flex items-center space-x-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>View Closure</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400 mb-3">
                      <span className="bg-gray-800 px-2 py-1 rounded">ID: {incident.incident_id}</span>
                      <span className="bg-gray-800 px-2 py-1 rounded">Created: {incidentsAPI.formatTimestamp(incident.created_at)}</span>
                      {incident.alert_count && (
                        <span className="bg-gray-800 px-2 py-1 rounded">{incident.alert_count} alert{incident.alert_count !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    
                    {/* Description */}
                    {incident.description && (
                      <p className="text-gray-300 text-sm line-clamp-2 bg-gray-800 p-3 rounded">{incident.description}</p>
                    )}
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

           {/* Enhanced Alerts Display */}
           <div className="bg-gray-800 rounded-lg shadow-md p-6">
             <div className="space-y-3">
               {filteredAlerts.map((alert, index) => (
                 <div
                   key={alert.id || index}
                   className="flex items-center justify-between p-4 bg-gray-750 rounded-lg border border-gray-700 hover:bg-gray-700 hover:border-gray-600 transition-all duration-200 cursor-pointer group"
                   onClick={() => handleViewAlertDetails(alert)}
                 >
                   <div className="flex items-center space-x-4 flex-1">
                     <div className={`w-2 h-2 rounded-full ${incidentsAPI.getSeverityColor(alert.severity).split(' ')[0]}`}></div>
                     
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center space-x-2">
                         <h3 className="text-white font-medium truncate group-hover:text-gray-100 transition-colors">
                           {alert.title}
                         </h3>
                         <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                           incidentsAPI.getSeverityColor(alert.severity)
                         }`}>
                           {alert.severity?.toUpperCase()}
                         </span>
                         <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${
                           incidentsAPI.getStatusColor(alert.status)
                         }`}>
                           {alert.status?.replace('_', ' ').toUpperCase()}
                         </span>
                       </div>
                       
                       <div className="flex items-center space-x-4 mt-1 text-sm text-gray-400">
                         <span>Source: {alert.source || 'Unknown'}</span>
                         <span>•</span>
                         <span>{incidentsAPI.formatTimestamp(alert.received_at || alert.detected_at)}</span>
                         {alert.assigned_analyst_id && (
                           <>
                             <span>•</span>
                             <span>Analyst: {alert.assigned_analyst_id}</span>
                           </>
                         )}
                       </div>
                     </div>
                   </div>

                   <div className="flex items-center space-x-2 ml-4">
                     {alert.status === 'new' && (
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           handleTakeOwnership(alert);
                         }}
                         disabled={takingOwnership.has(alert.id)}
                         className="bg-cerberus-red hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-sm transition-colors"
                       >
                         {takingOwnership.has(alert.id) ? (
                           <div className="flex items-center space-x-1">
                             <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                             <span>Taking...</span>
                           </div>
                         ) : (
                           'Take Ownership'
                         )}
                       </button>
                     )}
                     
                     <button
                       onClick={(e) => {
                         e.stopPropagation();
                         handleViewAlertDetails(alert);
                       }}
                       className="text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                     >
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                       </svg>
                     </button>
                   </div>
                 </div>
               ))}
             </div>

             {filteredAlerts.length === 0 && (
               <div className="text-center py-8">
                 <div className="text-gray-400 mb-2">
                   <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m0 0V9a2 2 0 012-2h2m0 0V6a2 2 0 012-2h2.09M9 9h1" />
                   </svg>
                 </div>
                 <p className="text-gray-400">No recent alerts to display</p>
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

        {/* Incident Details Modal */}
        <IncidentDetailsModal
          incident={selectedIncidentForDetails}
          isOpen={showIncidentDetailsModal}
          onClose={() => {
            setShowIncidentDetailsModal(false);
            setSelectedIncidentForDetails(null);
          }}
          onViewAlert={handleViewAlertFromIncident}
        />

        {/* Alert Details Modal */}
        <AlertDetailsModal
          alert={selectedAlertForDetails}
          isOpen={showAlertDetailsModal}
          onClose={() => {
            setShowAlertDetailsModal(false);
            setSelectedAlertForDetails(null);
          }}
        />

      <FloatingToolbox />
    </div>
  );
};

export default Incidents;