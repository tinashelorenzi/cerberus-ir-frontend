import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import reportsAPI from '../../services/reports';
import LoadingSpinner from '../common/LoadingSpinner';

const ReportViewer = ({ report, isOpen, onClose, onEdit, onGenerate }) => {
  const { user } = useAuth();
  
  // State management
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFormat, setActiveFormat] = useState('preview');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(null);
  const [pollingGeneration, setPollingGeneration] = useState(false);
  
  // Download state
  const [downloading, setDownloading] = useState({});
  
  // Print and export state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printOptions, setPrintOptions] = useState({
    includeComments: false,
    includeMetadata: true,
    pageFormat: 'A4'
  });

  useEffect(() => {
    if (isOpen && report) {
      loadReportData();
      if (report.status === 'generating') {
        startGenerationPolling();
      }
    }
  }, [isOpen, report]);

  useEffect(() => {
    return () => {
      // Cleanup polling on unmount
      if (pollingGeneration) {
        setPollingGeneration(false);
      }
    };
  }, []);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [reportResponse, commentsResponse] = await Promise.all([
        reportsAPI.getReport(report.id),
        reportsAPI.getComments(report.id).catch(() => []) // Comments might not be available
      ]);
      
      setReportData(reportResponse);
      setComments(commentsResponse || []);
      
      // Set default format based on available formats
      if (reportResponse.available_formats?.length > 0) {
        if (reportResponse.generated_content) {
          setActiveFormat('preview');
        } else {
          setActiveFormat(reportResponse.available_formats[0]);
        }
      }
      
    } catch (err) {
      console.error('Failed to load report:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startGenerationPolling = async () => {
    setPollingGeneration(true);
    setGenerationProgress({ status: 'generating', message: 'Generating report...' });
    
    try {
      const completedReport = await reportsAPI.pollForCompletion(report.id, 30, 3000);
      setReportData(completedReport);
      setGenerationProgress({ status: 'completed', message: 'Report generated successfully!' });
      
      // Auto-hide progress after 3 seconds
      setTimeout(() => setGenerationProgress(null), 3000);
      
    } catch (err) {
      setGenerationProgress({ status: 'failed', message: err.message });
    } finally {
      setPollingGeneration(false);
    }
  };

  const handleDownload = async (format) => {
    try {
      setDownloading(prev => ({ ...prev, [format]: true }));
      
      await reportsAPI.downloadAndSaveReport(
        reportData.id, 
        format, 
        `${reportData.title.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`
      );
      
    } catch (err) {
      setError(`Download failed: ${err.message}`);
    } finally {
      setDownloading(prev => ({ ...prev, [format]: false }));
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      setAddingComment(true);
      
      const comment = await reportsAPI.addComment(reportData.id, {
        content: newComment.trim()
      });
      
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      
    } catch (err) {
      setError(`Failed to add comment: ${err.message}`);
    } finally {
      setAddingComment(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'text-gray-400',
      generating: 'text-blue-400',
      completed: 'text-green-400',
      failed: 'text-red-400',
      archived: 'text-yellow-400'
    };
    return colors[status] || 'text-gray-400';
  };

  const getStatusIcon = (status) => {
    const icons = {
      draft: '📝',
      generating: '⚙️',
      completed: '✅',
      failed: '❌',
      archived: '📦'
    };
    return icons[status] || '📄';
  };

  const formatContent = (content) => {
    if (!content) return 'No content available';
    
    // Basic markdown-like formatting for display
    return content
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mb-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-white mb-3">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium text-white mb-2">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-gray-300">$1</em>')
      .replace(/\n/g, '<br/>')
      .replace(/^- (.*$)/gim, '<li class="text-gray-300 mb-1">$1</li>');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-white">{reportData?.title || report?.title}</h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(reportData?.status || report?.status)}`}>
                {getStatusIcon(reportData?.status || report?.status)} {reportData?.status || report?.status}
              </span>
            </div>
            {reportData?.description && (
              <p className="text-gray-400 mt-1">{reportData.description}</p>
            )}
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
              <span>Type: {reportsAPI.getTypeDisplay(reportData?.report_type || report?.report_type)}</span>
              <span>Created: {new Date(reportData?.created_at || report?.created_at).toLocaleDateString()}</span>
              {reportData?.generated_at && (
                <span>Generated: {new Date(reportData.generated_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors ml-4"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Generation Progress */}
        {generationProgress && (
          <div className={`px-6 py-3 border-b border-gray-700 ${
            generationProgress.status === 'completed' ? 'bg-green-900/20' :
            generationProgress.status === 'failed' ? 'bg-red-900/20' :
            'bg-blue-900/20'
          }`}>
            <div className="flex items-center space-x-3">
              {generationProgress.status === 'generating' && (
                <svg className="animate-spin h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              <span className={`text-sm ${
                generationProgress.status === 'completed' ? 'text-green-400' :
                generationProgress.status === 'failed' ? 'text-red-400' :
                'text-blue-400'
              }`}>
                {generationProgress.message}
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-900 border-l-4 border-red-500 text-red-100 p-4 mx-6 mt-4 rounded">
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
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">×</button>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-gray-750 border-b border-gray-700 px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Format Tabs */}
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveFormat('preview')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFormat === 'preview'
                    ? 'bg-cerberus-red text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                Preview
              </button>
              
              {reportData?.available_formats?.map(format => (
                <button
                  key={format}
                  onClick={() => setActiveFormat(format)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeFormat === format
                      ? 'bg-cerberus-red text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {/* Comments Toggle */}
              <button
                onClick={() => setShowComments(!showComments)}
                className="px-3 py-2 text-gray-300 hover:text-white transition-colors border border-gray-600 rounded-md"
              >
                💬 Comments ({comments.length})
              </button>

              {/* Print */}
              <button
                onClick={handlePrint}
                className="px-3 py-2 text-gray-300 hover:text-white transition-colors border border-gray-600 rounded-md"
              >
                🖨️ Print
              </button>

              {/* Download Dropdown */}
              {reportData?.available_formats?.length > 0 && (
                <div className="relative group">
                  <button className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors">
                    📥 Download
                  </button>
                  <div className="absolute right-0 mt-2 py-2 w-32 bg-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    {reportData.available_formats.map(format => (
                      <button
                        key={format}
                        onClick={() => handleDownload(format)}
                        disabled={downloading[format]}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-colors disabled:opacity-50"
                      >
                        {downloading[format] ? 'Downloading...' : format.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Edit Button */}
              {onEdit && reportData && ['draft', 'failed'].includes(reportData.status) && (
                <button
                  onClick={() => onEdit(reportData)}
                  className="px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-md transition-colors"
                >
                  ✏️ Edit
                </button>
              )}

              {/* Generate Button */}
              {onGenerate && reportData && ['draft', 'failed'].includes(reportData.status) && (
                <button
                  onClick={() => onGenerate(reportData.id)}
                  disabled={pollingGeneration}
                  className="px-3 py-2 bg-cerberus-red hover:bg-red-600 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {pollingGeneration ? '⚙️ Generating...' : '🚀 Generate'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Report Content */}
          <div className={`flex-1 overflow-y-auto ${showComments ? 'border-r border-gray-700' : ''}`}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
              </div>
            ) : reportData ? (
              <div className="p-6">
                {activeFormat === 'preview' ? (
                  // Preview Mode
                  <div className="max-w-4xl mx-auto">
                    {reportData.status === 'completed' && reportData.generated_content ? (
                      <div className="prose prose-invert max-w-none">
                        <div 
                          className="text-gray-300 leading-relaxed"
                          dangerouslySetInnerHTML={{ 
                            __html: formatContent(reportData.generated_content) 
                          }}
                        />
                      </div>
                    ) : reportData.status === 'draft' ? (
                      <div className="text-center py-12">
                        <div className="text-gray-500 mb-4">
                          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-lg font-medium">Report Draft</p>
                          <p className="text-sm">This report is still in draft mode and needs to be generated.</p>
                        </div>
                        {onGenerate && (
                          <button
                            onClick={() => onGenerate(reportData.id)}
                            className="bg-cerberus-red hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
                          >
                            Generate Report
                          </button>
                        )}
                      </div>
                    ) : reportData.status === 'generating' ? (
                      <div className="text-center py-12">
                        <div className="text-blue-400 mb-4">
                          <svg className="animate-spin w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <p className="text-lg font-medium">Generating Report...</p>
                          <p className="text-sm">Please wait while the report is being generated.</p>
                        </div>
                      </div>
                    ) : reportData.status === 'failed' ? (
                      <div className="text-center py-12">
                        <div className="text-red-400 mb-4">
                          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-lg font-medium">Generation Failed</p>
                          <p className="text-sm">The report generation failed. Please try again or edit the report.</p>
                        </div>
                        <div className="flex justify-center space-x-3">
                          {onEdit && (
                            <button
                              onClick={() => onEdit(reportData)}
                              className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded transition-colors"
                            >
                              Edit Report
                            </button>
                          )}
                          {onGenerate && (
                            <button
                              onClick={() => onGenerate(reportData.id)}
                              className="bg-cerberus-red hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
                            >
                              Retry Generation
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-gray-400">No content available for preview.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Raw Format View
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-white font-medium">{activeFormat.toUpperCase()} Content</h3>
                      <button
                        onClick={() => handleDownload(activeFormat)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Download {activeFormat.toUpperCase()}
                      </button>
                    </div>
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono overflow-x-auto">
                      {reportData.generated_content || 'Content not available'}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">Report not found</p>
              </div>
            )}
          </div>

          {/* Comments Sidebar */}
          {showComments && (
            <div className="w-80 bg-gray-750 flex flex-col">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-medium text-white">Comments</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {comments.map(comment => (
                  <div key={comment.id} className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-sm font-medium">
                        {comment.created_by?.full_name || comment.created_by?.username || 'Unknown'}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm">{comment.content}</p>
                  </div>
                ))}
                
                {comments.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">No comments yet</p>
                  </div>
                )}
              </div>
              
              {/* Add Comment */}
              <div className="p-4 border-t border-gray-700">
                <div className="space-y-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent text-sm"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addingComment}
                    className="w-full bg-cerberus-red hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm transition-colors disabled:opacity-50"
                  >
                    {addingComment ? 'Adding...' : 'Add Comment'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-750 border-t border-gray-700 px-6 py-3">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center space-x-4">
              {reportData?.file_size_bytes && (
                <span>Size: {reportsAPI.formatFileSize(reportData.file_size_bytes)}</span>
              )}
              {reportData?.generation_time_seconds && (
                <span>Generated in: {reportData.generation_time_seconds.toFixed(1)}s</span>
              )}
              <span>Views: {reportData?.view_count || 0}</span>
              <span>Downloads: {reportData?.download_count || 0}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span>Report ID: {reportData?.id || report?.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportViewer;