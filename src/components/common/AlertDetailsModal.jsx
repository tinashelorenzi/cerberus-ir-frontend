import React, { useState, useEffect } from 'react';
import incidentsAPI from '../../services/incidents';

const AlertDetailsModal = ({ alert, isOpen, onClose }) => {
  const [fullAlertDetails, setFullAlertDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && alert) {
      fetchFullAlertDetails();
    }
  }, [isOpen, alert]);

  const fetchFullAlertDetails = async () => {
    if (!alert?.id) {
      setFullAlertDetails(alert); // Use the passed alert if no ID to fetch
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Use the new JWT-authenticated endpoint in the incidents route
      const response = await fetch(`${incidentsAPI.baseURL}/api/v1/incidents/alerts/${alert.id}`, {
        headers: incidentsAPI.getAuthHeaders()
      });
      
      if (response.ok) {
        const details = await response.json();
        setFullAlertDetails(details);
      } else if (response.status === 404) {
        // Alert not found, use the passed alert data
        setFullAlertDetails(alert);
        setError(`Alert ${alert.id} not found in database`);
      } else {
        // Other error, but still show what we have
        setFullAlertDetails(alert);
        setError(`Failed to load full alert details (${response.status})`);
      }
    } catch (err) {
      console.error('Error fetching alert details:', err);
      // Fallback to the passed alert data
      setFullAlertDetails(alert);
      setError('Network error loading alert details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !alert) return null;

  const alertData = fullAlertDetails || alert;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            Alert Details
            {error && (
              <span className="ml-2 text-xs text-yellow-400 font-normal">
                (Limited data available)
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cerberus-red"></div>
              <span className="ml-3 text-white">Loading full alert details...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Error notice if there was an issue loading full details */}
              {error && (
                <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-yellow-400 text-sm">{error}</span>
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Alert Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-400">Alert ID</label>
                      <p className="text-white font-medium">{alertData.id}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Title</label>
                      <p className="text-white font-medium">{alertData.title}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Description</label>
                      <p className="text-white">{alertData.description || 'No description available'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">External Alert ID</label>
                      <p className="text-white">{alertData.external_alert_id || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Source</label>
                      <p className="text-white">{alertData.source || 'Unknown'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Threat Type</label>
                      <p className="text-white">{alertData.threat_type || 'Unknown'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Confidence Score</label>
                      <p className="text-white">{alertData.confidence_score ? `${(alertData.confidence_score * 100).toFixed(1)}%` : 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Status & Classification</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-400">Status</label>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${
                        incidentsAPI.getStatusColor(alertData.status)
                      }`}>
                        {alertData.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Severity</label>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        incidentsAPI.getSeverityColor(alertData.severity)
                      }`}>
                        {alertData.severity?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Assigned Analyst</label>
                      <p className="text-white">{alertData.assigned_analyst_id ? `Analyst #${alertData.assigned_analyst_id}` : 'Unassigned'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Category</label>
                      <p className="text-white">{alertData.category || 'Uncategorized'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Is False Positive</label>
                      <p className="text-white">{alertData.is_false_positive ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Reported</label>
                      <p className="text-white">{alertData.reported ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Network Information */}
              {(alertData.source_ip || alertData.destination_ip || alertData.protocol) && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Network Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      {alertData.source_ip && (
                        <div>
                          <label className="text-sm text-gray-400">Source IP</label>
                          <p className="text-white font-mono">{alertData.source_ip}</p>
                        </div>
                      )}
                      {alertData.source_port && (
                        <div>
                          <label className="text-sm text-gray-400">Source Port</label>
                          <p className="text-white font-mono">{alertData.source_port}</p>
                        </div>
                      )}
                      {alertData.protocol && (
                        <div>
                          <label className="text-sm text-gray-400">Protocol</label>
                          <p className="text-white">{alertData.protocol.toUpperCase()}</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      {alertData.destination_ip && (
                        <div>
                          <label className="text-sm text-gray-400">Destination IP</label>
                          <p className="text-white font-mono">{alertData.destination_ip}</p>
                        </div>
                      )}
                      {alertData.destination_port && (
                        <div>
                          <label className="text-sm text-gray-400">Destination Port</label>
                          <p className="text-white font-mono">{alertData.destination_port}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Asset Information */}
              {(alertData.affected_hostname || alertData.affected_user || alertData.asset_criticality) && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Asset Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {alertData.affected_hostname && (
                      <div>
                        <label className="text-sm text-gray-400">Affected Hostname</label>
                        <p className="text-white font-mono">{alertData.affected_hostname}</p>
                      </div>
                    )}
                    {alertData.affected_user && (
                      <div>
                        <label className="text-sm text-gray-400">Affected User</label>
                        <p className="text-white">{alertData.affected_user}</p>
                      </div>
                    )}
                    {alertData.asset_criticality && (
                      <div>
                        <label className="text-sm text-gray-400">Asset Criticality</label>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          alertData.asset_criticality === 'critical' ? 'bg-red-500 text-white' :
                          alertData.asset_criticality === 'high' ? 'bg-orange-500 text-white' :
                          alertData.asset_criticality === 'medium' ? 'bg-yellow-500 text-black' :
                          'bg-green-500 text-white'
                        }`}>
                          {alertData.asset_criticality?.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Timeline</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    {alertData.detected_at && (
                      <div>
                        <label className="text-sm text-gray-400">Detected</label>
                        <p className="text-white">{incidentsAPI.formatTimestamp(alertData.detected_at)}</p>
                      </div>
                    )}
                    {alertData.received_at && (
                      <div>
                        <label className="text-sm text-gray-400">Received</label>
                        <p className="text-white">{incidentsAPI.formatTimestamp(alertData.received_at)}</p>
                      </div>
                    )}
                    {alertData.first_response_at && (
                      <div>
                        <label className="text-sm text-gray-400">First Response</label>
                        <p className="text-white">{incidentsAPI.formatTimestamp(alertData.first_response_at)}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {alertData.containment_at && (
                      <div>
                        <label className="text-sm text-gray-400">Contained</label>
                        <p className="text-white">{incidentsAPI.formatTimestamp(alertData.containment_at)}</p>
                      </div>
                    )}
                    {alertData.resolution_at && (
                      <div>
                        <label className="text-sm text-gray-400">Resolved</label>
                        <p className="text-white">{incidentsAPI.formatTimestamp(alertData.resolution_at)}</p>
                      </div>
                    )}
                    {alertData.closed_at && (
                      <div>
                        <label className="text-sm text-gray-400">Closed</label>
                        <p className="text-white">{incidentsAPI.formatTimestamp(alertData.closed_at)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              {(alertData.time_to_first_response || alertData.time_to_resolution) && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Performance Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {alertData.time_to_first_response && (
                      <div>
                        <label className="text-sm text-gray-400">Time to First Response</label>
                        <p className="text-white">{Math.round(alertData.time_to_first_response)} minutes</p>
                      </div>
                    )}
                    {alertData.time_to_resolution && (
                      <div>
                        <label className="text-sm text-gray-400">Time to Resolution</label>
                        <p className="text-white">{Math.round(alertData.time_to_resolution)} minutes</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Related Incidents */}
              {alertData.incident_ids && alertData.incident_ids.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Related Incidents ({alertData.incident_ids.length})</h3>
                  <div className="bg-gray-750 rounded-lg p-4">
                    <div className="space-y-2">
                      {alertData.incident_ids.map((incidentId, index) => (
                        <div key={incidentId} className="flex items-center justify-between p-3 bg-gray-800 rounded border border-gray-700">
                          <div>
                            <span className="text-white font-medium">Incident #{incidentId}</span>
                            <span className="text-gray-400 ml-2">(ID: {incidentId})</span>
                          </div>
                          <button className="text-cerberus-red hover:text-red-400 text-sm transition-colors">
                            View Incident
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Raw Alert Data */}
              {alertData.raw_alert_data && Object.keys(alertData.raw_alert_data).length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Raw Alert Data</h3>
                  <div className="bg-gray-750 rounded-lg p-4">
                    <pre className="text-white text-sm whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(alertData.raw_alert_data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertDetailsModal;