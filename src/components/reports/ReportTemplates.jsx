import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import ReportTemplateList from './ReportTemplateList';
import ReportTemplateBuilder from './ReportTemplateBuilder';
import ReportTemplateEditor from './ReportTemplateEditor';

const ReportTemplates = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('list');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    size: 20,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    loadTemplates();
  }, [pagination.page, searchQuery, filterCategory]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data for now - replace with actual API call
      const mockTemplates = [
        {
          id: 1,
          name: 'Incident Summary Report',
          description: 'Standard template for incident summary reports',
          category: 'incident',
          status: 'active',
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-20T14:45:00Z',
          created_by: 'admin@company.com'
        },
        {
          id: 2,
          name: 'Weekly Security Report',
          description: 'Comprehensive weekly security status report',
          category: 'weekly',
          status: 'active',
          created_at: '2024-01-10T09:15:00Z',
          updated_at: '2024-01-18T16:20:00Z',
          created_by: 'admin@company.com'
        },
        {
          id: 3,
          name: 'Threat Intelligence Report',
          description: 'Template for threat intelligence analysis reports',
          category: 'threat',
          status: 'draft',
          created_at: '2024-01-12T11:00:00Z',
          updated_at: '2024-01-12T11:00:00Z',
          created_by: 'analyst@company.com'
        }
      ];
      
      // Filter templates based on search and category
      let filteredTemplates = mockTemplates;
      
      if (searchQuery) {
        filteredTemplates = filteredTemplates.filter(template =>
          template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      if (filterCategory !== 'all') {
        filteredTemplates = filteredTemplates.filter(template =>
          template.category === filterCategory
        );
      }
      
      setTemplates(filteredTemplates);
      setPagination(prev => ({
        ...prev,
        total: filteredTemplates.length,
        pages: Math.ceil(filteredTemplates.length / pagination.size)
      }));
    } catch (error) {
      console.error('Error loading templates:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setActiveTab('builder');
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
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      // Mock delete - replace with actual API call
      setTemplates(prev => prev.filter(template => template.id !== templateId));
      console.log('Template deleted:', templateId);
    } catch (error) {
      console.error('Error deleting template:', error);
      alert(`Failed to delete template: ${error.message}`);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (category) => {
    setFilterCategory(category);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  if (loading && activeTab === 'list') {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Report Templates</h1>
              <p className="text-gray-400 mt-2">
                Manage and create report templates for various security reports
              </p>
            </div>
            {activeTab === 'list' && (
              <button
                onClick={handleCreateNew}
                className="bg-cerberus-red hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create Template</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-300">{error}</span>
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
            filterCategory={filterCategory}
            onFilterChange={handleFilterChange}
            pagination={pagination}
            onPageChange={handlePageChange}
            loading={loading}
          />
        )}

        {activeTab === 'builder' && (
          <ReportTemplateBuilder
            onSave={handleTemplateSaved}
            onBack={handleBack}
          />
        )}

        {activeTab === 'editor' && selectedTemplate && (
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
