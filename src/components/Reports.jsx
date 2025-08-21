import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import reportsAPI from '../services/reports';
import LoadingSpinner from './common/LoadingSpinner';

// Import our report generation components
import ReportList from './reportGeneration/ReportList';
import ReportBuildWizard from './reportGeneration/ReportBuildWizard';
import ReportBuilder from './reportGeneration/ReportBuilder';
import ReportViewer from './reportGeneration/ReportViewer';

const Reports = () => {
  const { user } = useAuth();
  
  // Main UI state
  const [activeView, setActiveView] = useState('list'); // 'list', 'builder', 'viewer'
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showWizard, setShowWizard] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  
  // Statistics and data
  const [reportStats, setReportStats] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Generation tracking
  const [generatingReports, setGeneratingReports] = useState(new Set());
  const [generationProgress, setGenerationProgress] = useState({});

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load report statistics
      const stats = await reportsAPI.getReportStats();
      setReportStats(stats);
      
    } catch (err) {
      console.error('Failed to load reports data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
    loadInitialData();
  };

  // ============================================================================
  // REPORT WIZARD HANDLERS
  // ============================================================================

  const handleCreateReport = () => {
    setShowWizard(true);
  };

  const handleWizardClose = () => {
    setShowWizard(false);
  };

  const handleReportCreated = (newReport) => {
    setShowWizard(false);
    setSelectedReport(newReport);
    setActiveView('builder');
    setShowBuilder(true);
    refreshData();
  };

  // ============================================================================
  // REPORT BUILDER HANDLERS
  // ============================================================================

  const handleEditReport = (report) => {
    setSelectedReport(report);
    setActiveView('builder');
    setShowBuilder(true);
  };

  const handleBuilderSave = async (reportData) => {
    try {
      await reportsAPI.updateReport(selectedReport.id, reportData);
      refreshData();
    } catch (err) {
      throw new Error(`Failed to save report: ${err.message}`);
    }
  };

  const handleBuilderCancel = () => {
    setShowBuilder(false);
    setSelectedReport(null);
    setActiveView('list');
  };

  const handleBuilderGenerate = async (reportId) => {
    try {
      setGeneratingReports(prev => new Set([...prev, reportId]));
      setGenerationProgress(prev => ({
        ...prev,
        [reportId]: { status: 'starting', message: 'Starting report generation...' }
      }));

      await reportsAPI.generateReport(reportId, {
        export_formats: ['markdown', 'pdf', 'html'],
        force_regenerate: false
      });

      // Start polling for completion
      pollGenerationProgress(reportId);

    } catch (err) {
      setGeneratingReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });
      setGenerationProgress(prev => ({
        ...prev,
        [reportId]: { status: 'failed', message: err.message }
      }));
      throw err;
    }
  };

  const pollGenerationProgress = async (reportId) => {
    try {
      setGenerationProgress(prev => ({
        ...prev,
        [reportId]: { status: 'generating', message: 'Generating report...' }
      }));

      const completedReport = await reportsAPI.pollForCompletion(reportId, 30, 3000);
      
      setGeneratingReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });

      setGenerationProgress(prev => ({
        ...prev,
        [reportId]: { status: 'completed', message: 'Report generated successfully!' }
      }));

      // Update the selected report if it's the one we just generated
      if (selectedReport?.id === reportId) {
        setSelectedReport(completedReport);
      }

      // Auto-clear progress after 5 seconds
      setTimeout(() => {
        setGenerationProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[reportId];
          return newProgress;
        });
      }, 5000);

      refreshData();

    } catch (err) {
      setGeneratingReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });

      setGenerationProgress(prev => ({
        ...prev,
        [reportId]: { status: 'failed', message: err.message }
      }));
    }
  };

  // ============================================================================
  // REPORT VIEWER HANDLERS
  // ============================================================================

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowViewer(true);
  };

  const handleViewerClose = () => {
    setShowViewer(false);
    setSelectedReport(null);
  };

  const handleViewerEdit = (report) => {
    setShowViewer(false);
    handleEditReport(report);
  };

  const handleViewerGenerate = async (reportId) => {
    try {
      await handleBuilderGenerate(reportId);
    } catch (err) {
      console.error('Generation failed:', err);
      // Error handling is done in handleBuilderGenerate
    }
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const getStatColor = (statType) => {
    const colors = {
      total: 'bg-blue-500/20 text-blue-400',
      completed: 'bg-green-500/20 text-green-400',
      generating: 'bg-yellow-500/20 text-yellow-400',
      failed: 'bg-red-500/20 text-red-400',
      draft: 'bg-gray-500/20 text-gray-400'
    };
    return colors[statType] || 'bg-gray-500/20 text-gray-400';
  };

  const getStatIcon = (statType) => {
    const icons = {
      total: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      completed: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      generating: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      failed: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      draft: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    };
    return icons[statType] || icons.total;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Show builder when in builder mode
  if (showBuilder && selectedReport) {
    return (
      <ReportBuilder
        report={selectedReport}
        onSave={handleBuilderSave}
        onCancel={handleBuilderCancel}
        onGenerate={handleBuilderGenerate}
      />
    );
  }

  return (
    <div className="min-h-screen bg-cerberus-dark">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Incident Response Reports</h1>
                <p className="text-gray-400 mt-2">
                  Generate, manage, and share comprehensive incident response reports
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleCreateReport}
                  className="inline-flex items-center px-6 py-3 bg-cerberus-red hover:bg-red-600 text-white font-medium rounded-lg transition-colors duration-200 shadow-lg"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Create Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Generation Progress Notifications */}
        {Object.entries(generationProgress).map(([reportId, progress]) => (
          <div
            key={reportId}
            className={`mb-4 px-4 py-3 rounded-lg border ${
              progress.status === 'completed' ? 'bg-green-900/20 border-green-700 text-green-100' :
              progress.status === 'failed' ? 'bg-red-900/20 border-red-700 text-red-100' :
              'bg-blue-900/20 border-blue-700 text-blue-100'
            }`}
          >
            <div className="flex items-center space-x-3">
              {progress.status === 'generating' && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              <span className="text-sm font-medium">Report ID {reportId}:</span>
              <span className="text-sm">{progress.message}</span>
            </div>
          </div>
        ))}

        {/* Quick Stats */}
        {reportStats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50">
              <div className="flex items-center">
                <div className={`p-3 rounded-full ${getStatColor('total')}`}>
                  {getStatIcon('total')}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">Total Reports</p>
                  <p className="text-2xl font-semibold text-white">{reportStats.total_reports || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50">
              <div className="flex items-center">
                <div className={`p-3 rounded-full ${getStatColor('completed')}`}>
                  {getStatIcon('completed')}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">Completed</p>
                  <p className="text-2xl font-semibold text-white">
                    {reportStats.reports_by_status?.completed || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50">
              <div className="flex items-center">
                <div className={`p-3 rounded-full ${getStatColor('generating')}`}>
                  {getStatIcon('generating')}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">Generating</p>
                  <p className="text-2xl font-semibold text-white">
                    {reportStats.reports_by_status?.generating || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50">
              <div className="flex items-center">
                <div className={`p-3 rounded-full ${getStatColor('draft')}`}>
                  {getStatIcon('draft')}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">Drafts</p>
                  <p className="text-2xl font-semibold text-white">
                    {reportStats.reports_by_status?.draft || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50">
              <div className="flex items-center">
                <div className={`p-3 rounded-full ${getStatColor('failed')}`}>
                  {getStatIcon('failed')}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">Failed</p>
                  <p className="text-2xl font-semibold text-white">
                    {reportStats.reports_by_status?.failed || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {reportStats?.recent_activity && reportStats.recent_activity.length > 0 && (
          <div className="mb-8 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50">
            <div className="px-6 py-4 border-b border-gray-700/50">
              <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {reportStats.recent_activity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        activity.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                        activity.status === 'generating' ? 'bg-blue-600/20 text-blue-400' :
                        activity.status === 'failed' ? 'bg-red-600/20 text-red-400' :
                        'bg-gray-600/20 text-gray-400'
                      }`}>
                        {activity.status}
                      </span>
                      <span className="text-white font-medium">{activity.title}</span>
                      <span className="text-gray-400 text-sm">
                        by {activity.created_by || 'Unknown'}
                      </span>
                    </div>
                    <span className="text-gray-400 text-sm">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Reports List */}
        <ReportList
          onCreateReport={handleCreateReport}
          onEditReport={handleEditReport}
          onViewReport={handleViewReport}
          refreshTrigger={refreshTrigger}
        />

        {/* Most Used Templates */}
        {reportStats?.most_used_templates && reportStats.most_used_templates.length > 0 && (
          <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50">
            <div className="px-6 py-4 border-b border-gray-700/50">
              <h2 className="text-xl font-semibold text-white">Most Used Templates</h2>
              <p className="text-gray-400 mt-1">Popular report templates for quick generation</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportStats.most_used_templates.map((template, index) => (
                  <div key={index} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-medium">{template.template_name}</h3>
                      <span className="text-gray-400 text-sm">
                        {template.usage_count} uses
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ReportBuildWizard
        isOpen={showWizard}
        onClose={handleWizardClose}
        onReportCreated={handleReportCreated}
      />

      <ReportViewer
        report={selectedReport}
        isOpen={showViewer}
        onClose={handleViewerClose}
        onEdit={handleViewerEdit}
        onGenerate={handleViewerGenerate}
      />
    </div>
  );
};

export default Reports;