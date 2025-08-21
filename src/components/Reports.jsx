import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './common/LoadingSpinner';

const Reports = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    // TODO: Fetch reports from API
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setReports([]);
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleGenerateReport = () => {
    // TODO: Implement report generation
    console.log('Generate report clicked');
  };

  const handleViewReport = (report) => {
    // TODO: Implement report viewing
    console.log('View report:', report);
  };

  const handleDownloadReport = (report) => {
    // TODO: Implement report download
    console.log('Download report:', report);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-cerberus-dark text-white">
      {/* Header Section */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Reports</h1>
              <p className="text-gray-400 mt-2">
                Generate and manage security incident reports
              </p>
            </div>
            <button
              onClick={handleGenerateReport}
              className="bg-cerberus-green hover:bg-cerberus-green/90 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Generate Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-500/20">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Reports</p>
                <p className="text-2xl font-semibold text-white">0</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-500/20">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Completed</p>
                <p className="text-2xl font-semibold text-white">0</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-500/20">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">In Progress</p>
                <p className="text-2xl font-semibold text-white">0</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-500/20">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Failed</p>
                <p className="text-2xl font-semibold text-white">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50">
          <div className="px-6 py-4 border-b border-gray-700/50">
            <h2 className="text-xl font-semibold text-white">Recent Reports</h2>
          </div>
          
          {reports.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-24 h-24 bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">No Reports Yet</h3>
              <p className="text-gray-500 mb-6">
                Generate your first report to get started with incident reporting and analysis.
              </p>
              <button
                onClick={handleGenerateReport}
                className="bg-cerberus-green hover:bg-cerberus-green/90 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
              >
                Generate Your First Report
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700/50">
                <thead className="bg-gray-700/30">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Report Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800/30 divide-y divide-gray-700/50">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{report.name}</div>
                        <div className="text-sm text-gray-400">{report.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-900/20 text-blue-400">
                          {report.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          report.status === 'completed' ? 'bg-green-900/20 text-green-400' :
                          report.status === 'in_progress' ? 'bg-yellow-900/20 text-yellow-400' :
                          'bg-red-900/20 text-red-400'
                        }`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewReport(report)}
                            className="text-cerberus-green hover:text-cerberus-green/80 transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDownloadReport(report)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Report Templates Section */}
        <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50">
          <div className="px-6 py-4 border-b border-gray-700/50">
            <h2 className="text-xl font-semibold text-white">Report Templates</h2>
            <p className="text-gray-400 mt-1">Use predefined templates to generate reports quickly</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50 hover:border-cerberus-green/50 transition-colors cursor-pointer">
                <div className="flex items-center mb-3">
                  <svg className="w-5 h-5 text-cerberus-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="font-medium text-white">Incident Summary</h3>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Comprehensive incident summary with timeline and impact analysis
                </p>
                <button className="text-cerberus-green hover:text-cerberus-green/80 text-sm font-medium">
                  Use Template →
                </button>
              </div>

              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50 hover:border-cerberus-green/50 transition-colors cursor-pointer">
                <div className="flex items-center mb-3">
                  <svg className="w-5 h-5 text-cerberus-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="font-medium text-white">Analytics Report</h3>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Statistical analysis and trends from incident data
                </p>
                <button className="text-cerberus-green hover:text-cerberus-green/80 text-sm font-medium">
                  Use Template →
                </button>
              </div>

              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50 hover:border-cerberus-green/50 transition-colors cursor-pointer">
                <div className="flex items-center mb-3">
                  <svg className="w-5 h-5 text-cerberus-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <h3 className="font-medium text-white">Security Assessment</h3>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Detailed security assessment with recommendations
                </p>
                <button className="text-cerberus-green hover:text-cerberus-green/80 text-sm font-medium">
                  Use Template →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
