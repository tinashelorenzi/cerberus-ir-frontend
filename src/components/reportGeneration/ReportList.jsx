import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import reportsAPI from '../../services/reports';
import LoadingSpinner from '../common/LoadingSpinner';

const ReportList = ({ 
  onCreateReport, 
  onEditReport, 
  onViewReport, 
  refreshTrigger = 0 
}) => {
  const { user } = useAuth();
  
  // State management
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReports, setSelectedReports] = useState(new Set());
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCreatedBy, setFilterCreatedBy] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    size: 20,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  });
  
  // Bulk operations
  const [bulkOperation, setBulkOperation] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Load reports when component mounts or filters change
  useEffect(() => {
    loadReports();
  }, [pagination.page, searchQuery, filterType, filterStatus, filterCreatedBy, sortBy, sortOrder, refreshTrigger]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: pagination.page,
        size: pagination.size,
        sort_by: sortBy,
        sort_order: sortOrder
      };
      
      // Add filters
      if (searchQuery) params.search = searchQuery;
      if (filterType !== 'all') params.report_type = filterType;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterCreatedBy !== 'all') params.created_by_id = filterCreatedBy;
      
      const data = await reportsAPI.getReports(params);
      
      setReports(data.reports || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
        total_pages: data.total_pages || 0,
        has_next: data.has_next || false,
        has_prev: data.has_prev || false
      }));
      
    } catch (err) {
      console.error('Error loading reports:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    loadReports();
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSelectReport = (reportId) => {
    const newSelected = new Set(selectedReports);
    if (newSelected.has(reportId)) {
      newSelected.delete(reportId);
    } else {
      newSelected.add(reportId);
    }
    setSelectedReports(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedReports.size === reports.length) {
      setSelectedReports(new Set());
    } else {
      setSelectedReports(new Set(reports.map(r => r.id)));
    }
  };

  const handleBulkOperation = async (operation) => {
    if (selectedReports.size === 0) return;
    
    setBulkOperation(operation);
    setShowBulkModal(true);
  };

  const confirmBulkOperation = async () => {
    try {
      setBulkLoading(true);
      
      const reportIds = Array.from(selectedReports);
      
      if (bulkOperation === 'delete') {
        await reportsAPI.deleteMultipleReports(reportIds);
      } else if (bulkOperation === 'archive') {
        await reportsAPI.archiveMultipleReports(reportIds);
      }
      
      setSelectedReports(new Set());
      setShowBulkModal(false);
      setBulkOperation(null);
      await loadReports();
      
    } catch (err) {
      console.error('Bulk operation failed:', err);
      setError(err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }
    
    try {
      await reportsAPI.deleteReport(reportId);
      await loadReports();
    } catch (err) {
      console.error('Delete failed:', err);
      setError(err.message);
    }
  };

  const handleDownloadReport = async (report, format) => {
    try {
      await reportsAPI.downloadAndSaveReport(report.id, format, `${report.title}.${format}`);
    } catch (err) {
      console.error('Download failed:', err);
      setError(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const config = reportsAPI.getStatusBadge(status);
    const colorClasses = {
      gray: 'bg-gray-600 text-gray-100',
      blue: 'bg-blue-600 text-blue-100',
      green: 'bg-green-600 text-green-100',
      red: 'bg-red-600 text-red-100',
      yellow: 'bg-yellow-600 text-yellow-100'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[config.color]}`}>
        {config.text}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const typeColors = {
      incident: 'bg-purple-600 text-purple-100',
      collective: 'bg-blue-600 text-blue-100'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[type]}`}>
        {reportsAPI.getTypeDisplay(type)}
      </span>
    );
  };

  if (loading && reports.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Reports</h2>
          <p className="text-gray-400 mt-1">Manage and view incident response reports</p>
        </div>
        <button
          onClick={onCreateReport}
          className="bg-cerberus-red hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Create Report
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-gray-800 rounded-lg p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
              />
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="incident">Incident</option>
                <option value="collective">Collective</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="generating">Generating</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Sort By
              </label>
              <select
                value={`${sortBy}_${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('_');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
              >
                <option value="created_at_desc">Newest First</option>
                <option value="created_at_asc">Oldest First</option>
                <option value="title_asc">Title A-Z</option>
                <option value="title_desc">Title Z-A</option>
                <option value="status_asc">Status A-Z</option>
                <option value="updated_at_desc">Recently Updated</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              type="submit"
              className="bg-cerberus-red hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors"
            >
              Search
            </button>
            
            {/* Bulk Actions */}
            {selectedReports.size > 0 && (
              <div className="flex space-x-2">
                <span className="text-gray-400 text-sm self-center">
                  {selectedReports.size} selected
                </span>
                <button
                  onClick={() => handleBulkOperation('archive')}
                  className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Archive
                </button>
                <button
                  onClick={() => handleBulkOperation('delete')}
                  className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className="float-right text-red-400 hover:text-red-200"
          >
            ×
          </button>
        </div>
      )}

      {/* Reports Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-750">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedReports.size === reports.length && reports.length > 0}
                    onChange={handleSelectAll}
                    className="rounded bg-gray-600 border-gray-500 text-cerberus-red focus:ring-cerberus-red"
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => handleSortChange('title')}
                >
                  Title
                  {sortBy === 'title' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => handleSortChange('status')}
                >
                  Status
                  {sortBy === 'status' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => handleSortChange('created_at')}
                >
                  Created
                  {sortBy === 'created_at' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Creator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-750 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedReports.has(report.id)}
                      onChange={() => handleSelectReport(report.id)}
                      className="rounded bg-gray-600 border-gray-500 text-cerberus-red focus:ring-cerberus-red"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div 
                        className="text-white font-medium cursor-pointer hover:text-cerberus-red transition-colors"
                        onClick={() => onViewReport(report)}
                      >
                        {report.title}
                      </div>
                      {report.description && (
                        <div className="text-gray-400 text-sm mt-1 truncate max-w-md">
                          {report.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTypeBadge(report.report_type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(report.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-sm">
                    {new Date(report.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-sm">
                    {report.created_by?.full_name || report.created_by?.username || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onViewReport(report)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        title="View Report"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      
                      {(report.created_by_id === user.id || ['manager', 'admin'].includes(user.role)) && (
                        <button
                          onClick={() => onEditReport(report)}
                          className="text-yellow-400 hover:text-yellow-300 transition-colors"
                          title="Edit Report"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      
                      {report.status === 'completed' && report.available_formats?.length > 0 && (
                        <div className="relative group">
                          <button className="text-green-400 hover:text-green-300 transition-colors" title="Download">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <div className="absolute right-0 mt-2 py-2 w-32 bg-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                            {report.available_formats.map(format => (
                              <button
                                key={format}
                                onClick={() => handleDownloadReport(report, format)}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
                              >
                                {format.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {(report.created_by_id === user.id || ['manager', 'admin'].includes(user.role)) && (
                        <button
                          onClick={() => handleDeleteReport(report.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Delete Report"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {!loading && reports.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-white">No reports found</h3>
            <p className="mt-1 text-sm text-gray-400">
              {searchQuery || filterType !== 'all' || filterStatus !== 'all' 
                ? 'Try adjusting your search criteria or filters.'
                : 'Get started by creating a new report.'
              }
            </p>
            {!searchQuery && filterType === 'all' && filterStatus === 'all' && (
              <div className="mt-6">
                <button
                  onClick={onCreateReport}
                  className="bg-cerberus-red hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Create Your First Report
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-700 sm:px-6 rounded-lg">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.has_prev}
              className="relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.has_next}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-400">
                Showing page <span className="font-medium">{pagination.page}</span> of{' '}
                <span className="font-medium">{pagination.total_pages}</span>
                {' '}({pagination.total} total reports)
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.has_prev}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-600 bg-gray-700 text-sm font-medium text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                  let pageNum;
                  if (pagination.total_pages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.total_pages - 2) {
                    pageNum = pagination.total_pages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
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
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.has_next}
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

      {/* Bulk Operation Confirmation Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-white mb-4">
              Confirm {bulkOperation === 'delete' ? 'Delete' : 'Archive'}
            </h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to {bulkOperation} {selectedReports.size} selected report{selectedReports.size > 1 ? 's' : ''}?
              {bulkOperation === 'delete' && ' This action cannot be undone.'}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkOperation(null);
                }}
                disabled={bulkLoading}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkOperation}
                disabled={bulkLoading}
                className={`px-4 py-2 rounded transition-colors disabled:opacity-50 ${
                  bulkOperation === 'delete'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-yellow-600 hover:bg-yellow-500 text-white'
                }`}
              >
                {bulkLoading ? 'Processing...' : `${bulkOperation === 'delete' ? 'Delete' : 'Archive'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportList;