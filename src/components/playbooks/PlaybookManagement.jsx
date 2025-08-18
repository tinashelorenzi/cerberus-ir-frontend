import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import PlaybookAPI from '../../services/PlaybookAPI'; // Import the API service
import LoadingSpinner from '../common/LoadingSpinner';
import PlaybookList from './PlaybookList';
import PlaybookBuilder from './PlaybookBuilder';
import PlaybookEditor from './PlaybookEditor';

const PlaybookManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('list');
  const [selectedPlaybook, setSelectedPlaybook] = useState(null);
  const [playbooks, setPlaybooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    size: 20,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    loadPlaybooks();
  }, [pagination.page, searchQuery, filterStatus]);

  const loadPlaybooks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Prepare API parameters
      const params = {
        page: pagination.page,
        size: pagination.size
      };
      
      // Add search and filter params
      if (searchQuery) params.search = searchQuery;
      if (filterStatus !== 'all') params.status = filterStatus;
      
      // Use PlaybookAPI service instead of direct fetch
      const data = await PlaybookAPI.getPlaybooks(params);
      
      setPlaybooks(data.items || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
        pages: data.pages || 0
      }));
    } catch (error) {
      console.error('Error loading playbooks:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedPlaybook(null);
    setActiveTab('builder');
  };

  const handleEditPlaybook = (playbook) => {
    setSelectedPlaybook(playbook);
    setActiveTab('editor');
  };

  const handlePlaybookSaved = async () => {
    await loadPlaybooks();
    setActiveTab('list');
    setSelectedPlaybook(null);
  };

  const handleBack = () => {
    setActiveTab('list');
    setSelectedPlaybook(null);
  };

  const handleDeletePlaybook = async (playbookId) => {
    if (!confirm('Are you sure you want to delete this playbook?')) {
      return;
    }

    try {
      await PlaybookAPI.deletePlaybook(playbookId);
      await loadPlaybooks(); // Reload the list
    } catch (error) {
      console.error('Error deleting playbook:', error);
      alert(`Failed to delete playbook: ${error.message}`);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when searching
  };

  const handleFilterChange = (status) => {
    setFilterStatus(status);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filtering
  };

  const filteredPlaybooks = playbooks.filter(playbook => {
    const matchesSearch = playbook.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         playbook.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || playbook.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading && activeTab === 'list') {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-cerberus-dark p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                IR Playbook Management
              </h1>
              <p className="text-gray-400">
                Create, manage, and execute incident response playbooks
              </p>
            </div>
            
            {activeTab === 'list' && (
              <button
                onClick={handleCreateNew}
                className="px-6 py-3 bg-cerberus-green text-white rounded-lg hover:bg-cerberus-green/80 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Playbook
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Main Content */}
        {activeTab === 'list' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="card-glass p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Search Playbooks
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-cerberus-green focus:ring-1 focus:ring-cerberus-green"
                    placeholder="Search by name or description..."
                  />
                </div>
                <div className="w-full md:w-48">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Filter by Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-cerberus-green focus:ring-1 focus:ring-cerberus-green"
                  >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="deprecated">Deprecated</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Playbooks List */}
            <PlaybookList
              playbooks={filteredPlaybooks}
              onEdit={handleEditPlaybook}
              onDelete={handleDeletePlaybook}
              loading={loading}
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          </div>
        )}

        {activeTab === 'builder' && (
          <PlaybookBuilder
            onSave={handlePlaybookSaved}
            onCancel={handleBack}
          />
        )}

        {activeTab === 'editor' && selectedPlaybook && (
          <PlaybookEditor
            playbook={selectedPlaybook}
            onSave={handlePlaybookSaved}
            onCancel={handleBack}
          />
        )}
      </div>
    </div>
  );
};

export default PlaybookManagement;