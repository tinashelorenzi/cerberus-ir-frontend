import React from 'react';
import incidentsAPI from '../../services/incidents';

const AlertDetailsModal = ({ alert, isOpen, onClose }) => {
  if (!isOpen || !alert) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            Alert Details
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
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Alert Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-400">Title</label>
                    <p className="text-white font-medium">{alert.title}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Description</label>
                    <p className="text-white">{alert.description || 'No description available'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">External Alert ID</label>
                    <p className="text-white">{alert.external_alert_id || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Source</label>
                    <p className="text-white">{alert.source || 'Unknown'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-4">Status & Classification</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-400">Status</label>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${
                      incidentsAPI.getStatusColor(alert.status)
                    }`}>
                      {alert.status?.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Severity</label>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      incidentsAPI.getSeverityColor(alert.severity)
                    }`}>
                      {alert.severity?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Assigned Analyst</label>
                    <p className="text-white">{alert.assigned_analyst_id ? `Analyst #${alert.assigned_analyst_id}` : 'Unassigned'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Category</label>
                    <p className="text-white">{alert.category || 'Uncategorized'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Timeline</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-gray-400">Detected</label>
                  <p className="text-white">{incidentsAPI.formatTimestamp(alert.detected_at || alert.received_at)}</p>
                </div>
                {alert.created_at && (
                  <div>
                    <label className="text-sm text-gray-400">Created</label>
                    <p className="text-white">{incidentsAPI.formatTimestamp(alert.created_at)}</p>
                  </div>
                )}
                {alert.updated_at && (
                  <div>
                    <label className="text-sm text-gray-400">Last Updated</label>
                    <p className="text-white">{incidentsAPI.formatTimestamp(alert.updated_at)}</p>
                  </div>
                )}
                {alert.assigned_at && (
                  <div>
                    <label className="text-sm text-gray-400">Assigned</label>
                    <p className="text-white">{incidentsAPI.formatTimestamp(alert.assigned_at)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Details */}
            {alert.details && Object.keys(alert.details).length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Additional Details</h3>
                <div className="bg-gray-750 rounded-lg p-4">
                  <pre className="text-white text-sm whitespace-pre-wrap">
                    {JSON.stringify(alert.details, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Tags */}
            {alert.tags && alert.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {alert.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-cerberus-red text-white"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Related Incidents */}
            {alert.incident_ids && alert.incident_ids.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Related Incidents ({alert.incident_ids.length})</h3>
                <div className="bg-gray-750 rounded-lg p-4">
                  <div className="space-y-2">
                    {alert.incident_ids.map((incidentId, index) => (
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
          </div>
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
