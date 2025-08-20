import React, { useState, useEffect } from 'react';
import incidentsAPI from '../../services/incidents';
import { useAuth } from '../../contexts/AuthContext';

const IncidentDetailsModal = ({ incident, isOpen, onClose, onViewAlert }) => {
  const { user } = useAuth();
  const [incidentDetails, setIncidentDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && incident) {
      fetchIncidentDetails();
    }
  }, [isOpen, incident]);

  const fetchIncidentDetails = async () => {
    // Fix: Use incident_id instead of id
    if (!incident?.incident_id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fix: Use the correct incident ID field
      const details = await incidentsAPI.getIncident(incident.incident_id);
      setIncidentDetails(details);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            Incident Details
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
              <span className="ml-3 text-white">Loading incident details...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-400 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchIncidentDetails}
                className="bg-cerberus-red hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
              >
                Retry
              </button>
            </div>
          ) : incidentDetails ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-400">Incident ID</label>
                      <p className="text-white font-medium">{incidentDetails.incident_id}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Title</label>
                      <p className="text-white font-medium">{incidentDetails.title}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Description</label>
                      <p className="text-white">{incidentDetails.description || 'No description available'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Status</label>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${
                        incidentsAPI.getStatusColor(incidentDetails.status)
                      }`}>
                        {incidentDetails.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Severity</label>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        incidentsAPI.getSeverityColor(incidentDetails.severity)
                      }`}>
                        {incidentDetails.severity?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Priority</label>
                      <p className="text-white">{incidentDetails.priority || 'Not set'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Assignment & Timeline</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-400">Owner</label>
                      <p className="text-white">{incidentDetails.owner_id ? `User #${incidentDetails.owner_id}` : 'Unassigned'}</p>
                    </div>
                                         <div>
                       <label className="text-sm text-gray-400">Assigned Analyst</label>
                       <p className="text-white">
                         {incidentDetails.assigned_analyst_id 
                           ? `Analyst #${incidentDetails.assigned_analyst_id}` 
                           : user?.full_name || user?.username || 'Current User'
                         }
                       </p>
                     </div>
                    <div>
                      <label className="text-sm text-gray-400">Created</label>
                      <p className="text-white">{incidentsAPI.formatTimestamp(incidentDetails.created_at)}</p>
                    </div>
                    {incidentDetails.updated_at && (
                      <div>
                        <label className="text-sm text-gray-400">Last Updated</label>
                        <p className="text-white">{incidentsAPI.formatTimestamp(incidentDetails.updated_at)}</p>
                      </div>
                    )}
                    {incidentDetails.resolved_at && (
                      <div>
                        <label className="text-sm text-gray-400">Resolved</label>
                        <p className="text-white">{incidentsAPI.formatTimestamp(incidentDetails.resolved_at)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SLA Information */}
              {incidentDetails.resolution_sla_deadline && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">SLA Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm text-gray-400">Resolution SLA Deadline</label>
                      <p className={`text-white ${
                        incidentsAPI.isIncidentOverdue(incidentDetails) ? 'text-red-400' : 'text-white'
                      }`}>
                        {incidentsAPI.formatTimestamp(incidentDetails.resolution_sla_deadline)}
                        {incidentsAPI.isIncidentOverdue(incidentDetails) && (
                          <span className="ml-2 text-red-400">⚠️ Overdue</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Associated Alerts */}
              {incidentDetails.alert_ids && incidentDetails.alert_ids.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Associated Alerts ({incidentDetails.alert_ids.length})</h3>
                  <div className="bg-gray-750 rounded-lg p-4">
                    <div className="space-y-2">
                      {incidentDetails.alert_ids.map((alertId, index) => (
                        <div key={alertId} className="flex items-center justify-between p-3 bg-gray-800 rounded border border-gray-700">
                          <div>
                            <span className="text-white font-medium">Alert #{alertId}</span>
                            <span className="text-gray-400 ml-2">(ID: {alertId})</span>
                          </div>
                          <button 
                            onClick={() => onViewAlert && onViewAlert(alertId)}
                            className="text-cerberus-red hover:text-red-400 text-sm transition-colors"
                          >
                            View Alert
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {incidentDetails.notes && incidentDetails.notes.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Notes ({incidentDetails.notes.length})</h3>
                  <div className="space-y-3">
                    {incidentDetails.notes.map((note, index) => (
                      <div key={index} className="bg-gray-750 rounded-lg p-4 border border-gray-700">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm text-gray-400">
                            {note.created_by} • {incidentsAPI.formatTimestamp(note.created_at)}
                          </span>
                        </div>
                        <p className="text-white">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Data */}
              {incidentDetails.raw_data && Object.keys(incidentDetails.raw_data).length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Additional Data</h3>
                  <div className="bg-gray-750 rounded-lg p-4">
                    <pre className="text-white text-sm whitespace-pre-wrap">
                      {JSON.stringify(incidentDetails.raw_data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400">No incident details available.</div>
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

export default IncidentDetailsModal;