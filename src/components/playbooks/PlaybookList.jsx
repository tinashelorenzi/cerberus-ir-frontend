import { useState } from 'react';
import PlaybookAPI from '../../services/PlaybookAPI'; // Import the API service
import LoadingSpinner from '../common/LoadingSpinner';

const PlaybookList = ({ playbooks, onEdit, onDelete, loading, pagination, onPageChange }) => {
  const [deletingId, setDeletingId] = useState(null);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      active: 'bg-green-900/50 text-green-400 border-green-700',
      draft: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
      deprecated: 'bg-orange-900/50 text-orange-400 border-orange-700',
      archived: 'bg-gray-900/50 text-gray-400 border-gray-700'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full border ${statusStyles[status] || statusStyles.draft}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Draft'}
      </span>
    );
  };

  const handleDelete = async (playbook) => {
    if (!confirm(`Are you sure you want to delete "${playbook.name}"?`)) {
      return;
    }

    try {
      setDeletingId(playbook.id);
      await PlaybookAPI.deletePlaybook(playbook.id);
      onDelete(playbook.id);
    } catch (error) {
      console.error('Error deleting playbook:', error);
      alert(`Failed to delete playbook: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExecute = async (playbook) => {
    try {
      // This would typically open an execution dialog
      // For now, we'll just show a placeholder
      alert(`Execute playbook: ${playbook.name}`);
      
      // Future implementation would use:
      // await PlaybookAPI.startPlaybookExecution({
      //   playbook_id: playbook.id,
      //   incident_id: 'INC-2025-001', // Would come from context
      //   assigned_analyst_id: currentUser.id
      // });
    } catch (error) {
      console.error('Error starting execution:', error);
      alert(`Failed to start execution: ${error.message}`);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!playbooks || playbooks.length === 0) {
    return (
      <div className="card-glass p-8">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">No playbooks found</h3>
            <p>Create your first incident response playbook to get started</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Playbooks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {playbooks.map((playbook) => (
          <div key={playbook.id} className="card-glass p-6 hover:bg-gray-800/30 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {playbook.name}
                </h3>
                <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                  {playbook.description || 'No description provided'}
                </p>
              </div>
              {getStatusBadge(playbook.status)}
            </div>

            {/* Tags */}
            {playbook.tags && playbook.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {playbook.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-cerberus-green/20 text-cerberus-green rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
                {playbook.tags.length > 3 && (
                  <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                    +{playbook.tags.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Metadata */}
            <div className="space-y-2 mb-4 text-sm text-gray-400">
              <div className="flex items-center justify-between">
                <span>Estimated Duration:</span>
                <span className="text-white">
                  {playbook.estimated_duration_minutes || 'N/A'} min
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Phases:</span>
                <span className="text-white">
                  {playbook.playbook_definition?.phases?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Created:</span>
                <span className="text-white">
                  {formatDate(playbook.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Updated:</span>
                <span className="text-white">
                  {formatDate(playbook.updated_at)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-gray-700">
              {playbook.status === 'active' && (
                <button
                  onClick={() => handleExecute(playbook)}
                  className="flex-1 px-3 py-2 bg-cerberus-green text-white rounded-lg hover:bg-cerberus-green/80 text-sm font-medium"
                >
                  Execute
                </button>
              )}
              
              <button
                onClick={() => onEdit(playbook)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Edit
              </button>
              
              <button
                onClick={() => handleDelete(playbook)}
                disabled={deletingId === playbook.id}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {deletingId === playbook.id ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="card-glass p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {((pagination.page - 1) * pagination.size) + 1} to{' '}
              {Math.min(pagination.page * pagination.size, pagination.total)} of{' '}
              {pagination.total} playbooks
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  let pageNumber;
                  if (pagination.pages <= 5) {
                    pageNumber = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNumber = i + 1;
                  } else if (pagination.page >= pagination.pages - 2) {
                    pageNumber = pagination.pages - 4 + i;
                  } else {
                    pageNumber = pagination.page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => onPageChange(pageNumber)}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        pageNumber === pagination.page
                          ? 'bg-cerberus-green text-white'
                          : 'bg-gray-700 text-white hover:bg-gray-600'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaybookList;