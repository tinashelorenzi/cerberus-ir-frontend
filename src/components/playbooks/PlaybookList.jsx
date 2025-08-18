import { useState } from 'react';

const PlaybookList = ({
  playbooks,
  onCreateNew,
  onEditPlaybook,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  onRefresh,
  loading
}) => {
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const getStatusColor = (status) => {
    const colors = {
      'active': 'bg-green-900/20 text-green-400 border-green-500/50',
      'draft': 'bg-yellow-900/20 text-yellow-400 border-yellow-500/50',
      'deprecated': 'bg-red-900/20 text-red-400 border-red-500/50',
      'archived': 'bg-gray-900/20 text-gray-400 border-gray-500/50'
    };
    return colors[status] || 'bg-gray-900/20 text-gray-400 border-gray-500/50';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const sortedPlaybooks = [...playbooks].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    if (sortBy === 'updated_at' || sortBy === 'created_at') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search playbooks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-cerberus-green focus:ring-1 focus:ring-cerberus-green"
            />
          </div>

          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-cerberus-green focus:ring-1 focus:ring-cerberus-green"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="deprecated">Deprecated</option>
            <option value="archived">Archived</option>
          </select>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-cerberus-green focus:ring-1 focus:ring-cerberus-green"
          >
            <option value="updated_at-desc">Latest Updated</option>
            <option value="updated_at-asc">Oldest Updated</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="created_at-desc">Newest Created</option>
            <option value="created_at-asc">Oldest Created</option>
          </select>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="btn-secondary flex items-center space-x-2"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
          <button
            onClick={onCreateNew}
            className="btn-primary flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Playbook</span>
          </button>
        </div>
      </div>

      {/* Playbook Grid */}
      {sortedPlaybooks.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-xl font-medium text-white mb-2">No playbooks found</h3>
          <p className="text-gray-400 mb-4">Get started by creating your first IR playbook</p>
          <button onClick={onCreateNew} className="btn-primary">
            Create Your First Playbook
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPlaybooks.map((playbook) => (
            <div key={playbook.id} className="card-glass hover:scale-105 transition-transform duration-200">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1 line-clamp-2">
                      {playbook.name}
                    </h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(playbook.status)}`}>
                      {playbook.status.charAt(0).toUpperCase() + playbook.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => onEditPlaybook(playbook)}
                      className="p-2 text-gray-400 hover:text-cerberus-green hover:bg-gray-700/50 rounded-lg transition-colors"
                      title="Edit Playbook"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Description */}
                {playbook.description && (
                  <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                    {playbook.description}
                  </p>
                )}

                {/* Tags */}
                {playbook.tags && playbook.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {playbook.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-cerberus-green/20 text-cerberus-green text-xs rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                    {playbook.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-700/50 text-gray-400 text-xs rounded-md">
                        +{playbook.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Metadata */}
                <div className="space-y-2 text-xs text-gray-400">
                  <div className="flex items-center justify-between">
                    <span>Duration:</span>
                    <span>{playbook.estimated_duration_minutes || 60} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Version:</span>
                    <span>{playbook.version || '1.0'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Updated:</span>
                    <span>{formatDate(playbook.updated_at || playbook.created_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {playbook.playbook_definition?.phases?.length || 0} phases
                  </div>
                  <button
                    onClick={() => onEditPlaybook(playbook)}
                    className="text-cerberus-green hover:text-cerberus-green/80 text-sm font-medium"
                  >
                    Edit Playbook →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-center space-x-8 text-sm text-gray-400 pt-4 border-t border-gray-700">
        <span>Total: {playbooks.length} playbooks</span>
        <span>Active: {playbooks.filter(p => p.status === 'active').length}</span>
        <span>Drafts: {playbooks.filter(p => p.status === 'draft').length}</span>
      </div>
    </div>
  );
};

export default PlaybookList;