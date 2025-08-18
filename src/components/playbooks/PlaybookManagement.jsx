import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import config from '../../config/env';
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

  useEffect(() => {
    loadPlaybooks();
  }, []);

  const loadPlaybooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem(config.STORAGE_KEYS.ACCESS_TOKEN);
      const response = await fetch(`${config.API_BASE_URL}/playbooks/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlaybooks(data.items || []);
      } else {
        throw new Error('Failed to load playbooks');
      }
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
            {activeTab !== 'list' && (
              <button
                onClick={handleBack}
                className="btn-secondary flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to List</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-400">{error}</span>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('list')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'list'
                  ? 'border-cerberus-green text-cerberus-green'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Playbook Library
            </button>
            {activeTab === 'builder' && (
              <button className="py-2 px-1 border-b-2 border-cerberus-green text-cerberus-green font-medium text-sm">
                Playbook Builder
              </button>
            )}
            {activeTab === 'editor' && selectedPlaybook && (
              <button className="py-2 px-1 border-b-2 border-cerberus-green text-cerberus-green font-medium text-sm">
                Edit: {selectedPlaybook.name}
              </button>
            )}
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'list' && (
          <PlaybookList
            playbooks={filteredPlaybooks}
            onCreateNew={handleCreateNew}
            onEditPlaybook={handleEditPlaybook}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            onRefresh={loadPlaybooks}
            loading={loading}
          />
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