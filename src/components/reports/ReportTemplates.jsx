import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import ReportTemplateList from './ReportTemplateList';
import ReportTemplateEditor from './ReportTemplateEditor';
import ReportTemplateAPI from '../../services/templateManagement.js';

const ReportTemplates = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('list');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    loadTemplates();
  }, [pagination.page, searchQuery, filterStatus]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort_by: 'updated_at',
        sort_order: 'desc'
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (filterStatus) {
        params.status = filterStatus;
      }

      // Use the ReportTemplateAPI service
      const data = await ReportTemplateAPI.getTemplates(params);

      setTemplates(data.templates || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
        pages: data.pages || 0
      }));
      
    } catch (error) {
      console.error('Error loading templates:', error);
      setError(error.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setActiveTab('editor');
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setActiveTab('editor');
  };

  const handleTemplateSaved = async () => {
    await loadTemplates();
    setActiveTab('list');
    setSelectedTemplate(null);
  };

  const handleBack = () => {
    setActiveTab('list');
    setSelectedTemplate(null);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      await ReportTemplateAPI.deleteTemplate(templateId);
      
      // Refresh the templates list
      await loadTemplates();
      
    } catch (error) {
      console.error('Error deleting template:', error);
      setError(`Failed to delete template: ${error.message}`);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (status) => {
    setFilterStatus(status);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleRefresh = () => {
    loadTemplates();
  };

  if (loading && activeTab === 'list') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        {activeTab === 'list' && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Report Templates</h1>
                <p className="text-gray-400 mt-2">
                  Manage and create report templates with HTML/CSS content and Jinja2 placeholders
                </p>
              </div>
              <button
                onClick={handleCreateNew}
                className="bg-cerberus-red hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create Template</span>
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-300">{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {activeTab === 'list' && (
          <ReportTemplateList
            templates={templates}
            onEdit={handleEditTemplate}
            onDelete={handleDeleteTemplate}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            filterStatus={filterStatus}
            onFilterChange={handleFilterChange}
            pagination={pagination}
            onPageChange={handlePageChange}
            loading={loading}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'editor' && (
          <ReportTemplateEditor
            template={selectedTemplate}
            onSave={handleTemplateSaved}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
};

export default ReportTemplates;