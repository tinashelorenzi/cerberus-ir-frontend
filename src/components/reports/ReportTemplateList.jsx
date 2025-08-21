import { useState, useEffect } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import ReportTemplateAPI from '../../services/templateManagement.js';

// Simple time ago function to replace date-fns
const timeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
};

const ReportTemplateList = ({
  templates,
  onEdit,
  onDelete,
  searchQuery,
  onSearchChange,
  filterStatus,
  onFilterChange,
  pagination,
  onPageChange,
  loading,
  onRefresh
}) => {
  const [sortField, setSortField] = useState('updated_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedTemplates, setSelectedTemplates] = useState([]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTemplates(templates.map(t => t.id));
    } else {
      setSelectedTemplates([]);
    }
  };

  const handleSelectTemplate = (templateId) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleBulkOperation = async (operation) => {
    if (selectedTemplates.length === 0) return;

    const operationText = operation === 'delete' ? 'delete' : operation;
    const confirmMessage = `Are you sure you want to ${operationText} ${selectedTemplates.length} template${selectedTemplates.length !== 1 ? 's' : ''}?`;
    
    if (!confirm(confirmMessage)) return;

    try {
      await ReportTemplateAPI.bulkOperation(operation, selectedTemplates);
      setSelectedTemplates([]);
      onRefresh(); // Refresh the list
    } catch (error) {
      console.error(`Error performing bulk ${operation}:`, error);
      alert(`Failed to ${operationText} templates: ${error.message}`);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      active: 'bg-green-900/50 text-green-300 border-green-700',
      draft: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
      archived: 'bg-gray-900/50 text-gray-300 border-gray-700'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium border rounded-full ${statusStyles[status] || statusStyles.draft}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Draft'}
      </span>
    );
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-cerberus-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-cerberus-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search Templates
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by name, description, or author..."
                className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 pl-10 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => onFilterChange(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedTemplates.length > 0 && (
          <div className="mt-4 flex items-center justify-between bg-gray-700 rounded-lg p-3">
            <span className="text-sm text-gray-300">
              {selectedTemplates.length} template{selectedTemplates.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <button 
                onClick={() => handleBulkOperation('activate')}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
              >
                Activate
              </button>
              <button 
                onClick={() => handleBulkOperation('archive')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
              >
                Archive
              </button>
              <button 
                onClick={() => handleBulkOperation('delete')}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} templates
        </div>
        <button
          onClick={onRefresh}
          className="text-gray-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Templates Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {templates.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-400">No templates found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || filterStatus ? 'Try adjusting your search or filter criteria.' : 'Get started by creating your first template.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTemplates.length === templates.length && templates.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-600 bg-gray-700 text-cerberus-red focus:ring-cerberus-red focus:ring-offset-gray-800"
                    />
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Name</span>
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('author')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Author</span>
                      {getSortIcon('author')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Tags
                  </th>
                  <th
                    onClick={() => handleSort('usage_count')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Usage</span>
                      {getSortIcon('usage_count')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('updated_at')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Last Updated</span>
                      {getSortIcon('updated_at')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedTemplates.includes(template.id)}
                        onChange={() => handleSelectTemplate(template.id)}
                        className="rounded border-gray-600 bg-gray-700 text-cerberus-red focus:ring-cerberus-red focus:ring-offset-gray-800"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-white flex items-center">
                          {template.name}
                          {template.is_default && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-700">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-400 truncate max-w-xs">
                          {template.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {template.author}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(template.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {template.tag_list?.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300"
                          >
                            {tag}
                          </span>
                        ))}
                        {template.tag_list?.length > 3 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-600 text-gray-400">
                            +{template.tag_list.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      <div className="flex items-center space-x-1">
                        <span>{template.usage_count || 0}</span>
                        <span className="text-gray-500">uses</span>
                      </div>
                      {template.last_used && (
                        <div className="text-xs text-gray-500">
                          Last: {timeAgo(template.last_used)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      <div>
                        {timeAgo(template.updated_at)}
                      </div>
                      {template.updated_by && (
                        <div className="text-xs text-gray-500">
                          by {template.updated_by.username}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onEdit(template)}
                          className="text-cerberus-red hover:text-red-400 transition-colors"
                          title="Edit Template"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDelete(template.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Delete Template"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-gray-750 px-4 py-3 border-t border-gray-700 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-400">
                  Page <span className="font-medium">{pagination.page}</span> of{' '}
                  <span className="font-medium">{pagination.pages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => onPageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-600 bg-gray-700 text-sm font-medium text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let pageNum;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === pagination.page
                            ? 'z-10 bg-cerberus-red border-cerberus-red text-white'
                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => onPageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-600 bg-gray-700 text-sm font-medium text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportTemplateList;