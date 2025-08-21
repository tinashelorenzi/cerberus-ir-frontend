import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import reportsAPI from '../../services/reports';
import ReportTemplateAPI from '../../services/templateManagement';
import LoadingSpinner from '../common/LoadingSpinner';

const ReportBuildWizard = ({ isOpen, onClose, onReportCreated }) => {
  const { user } = useAuth();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Step 1: Report Type and Basic Info
  const [step1Data, setStep1Data] = useState({
    report_type: 'incident',
    title: '',
    description: '',
    template_id: null
  });
  
  // Step 2: Incident Selection or Collective Filters
  const [step2Data, setStep2Data] = useState({
    // For incident reports
    incident_ids: [],
    
    // For collective reports
    date_range: {
      start: '',
      end: ''
    },
    users: [],
    ip_addresses: [],
    incident_types: [],
    severity_levels: [],
    status_filters: [],
    affected_departments: [],
    playbook_types: []
  });
  
  // Step 3: Report Configuration
  const [step3Data, setStep3Data] = useState({
    include_sections: [
      'executive_summary',
      'incident_details',
      'timeline',
      'actions_taken',
      'user_inputs',
      'recommendations'
    ],
    analytics_options: [
      'incident_count',
      'mttr',
      'affected_systems'
    ]
  });
  
  // Data for dropdowns and selections
  const [availableIncidents, setAvailableIncidents] = useState([]);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      resetWizard();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    await Promise.all([
      loadAvailableIncidents(),
      loadAvailableTemplates()
    ]);
  };

  const loadAvailableIncidents = async () => {
    try {
      setLoadingIncidents(true);
      const incidents = await reportsAPI.getAvailableIncidents();
      setAvailableIncidents(incidents);
    } catch (err) {
      console.error('Failed to load incidents:', err);
      setError('Failed to load available incidents');
    } finally {
      setLoadingIncidents(false);
    }
  };

  const loadAvailableTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await ReportTemplateAPI.getTemplates({
        status: 'active',
        limit: 100
      });
      setAvailableTemplates(response.templates || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('Failed to load report templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setError(null);
    setValidationErrors({});
    setStep1Data({
      report_type: 'incident',
      title: '',
      description: '',
      template_id: null
    });
    setStep2Data({
      incident_ids: [],
      date_range: { start: '', end: '' },
      users: [],
      ip_addresses: [],
      incident_types: [],
      severity_levels: [],
      status_filters: [],
      affected_departments: [],
      playbook_types: []
    });
    setStep3Data({
      include_sections: [
        'executive_summary',
        'incident_details',
        'timeline',
        'actions_taken',
        'user_inputs',
        'recommendations'
      ],
      analytics_options: [
        'incident_count',
        'mttr',
        'affected_systems'
      ]
    });
  };

  const validateStep1 = () => {
    const validation = reportsAPI.validateWizardStep1(step1Data);
    setValidationErrors(validation.errors.reduce((acc, error) => {
      acc.step1 = acc.step1 || [];
      acc.step1.push(error);
      return acc;
    }, {}));
    return validation.isValid;
  };

  const validateStep2 = () => {
    const validation = reportsAPI.validateWizardStep2(step2Data, step1Data.report_type);
    setValidationErrors(prev => ({
      ...prev,
      step2: validation.errors
    }));
    return validation.isValid;
  };

  const handleStep1Change = (field, value) => {
    setStep1Data(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation errors for this field
    if (validationErrors.step1) {
      setValidationErrors(prev => ({
        ...prev,
        step1: prev.step1?.filter(error => !error.toLowerCase().includes(field.toLowerCase()))
      }));
    }
  };

  const handleStep2Change = (field, value) => {
    setStep2Data(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation errors
    if (validationErrors.step2) {
      setValidationErrors(prev => ({
        ...prev,
        step2: []
      }));
    }
  };

  const handleDateRangeChange = (field, value) => {
    setStep2Data(prev => ({
      ...prev,
      date_range: {
        ...prev.date_range,
        [field]: value
      }
    }));
  };

  const handleIncidentToggle = (incidentId) => {
    setStep2Data(prev => ({
      ...prev,
      incident_ids: prev.incident_ids.includes(incidentId)
        ? prev.incident_ids.filter(id => id !== incidentId)
        : [...prev.incident_ids, incidentId]
    }));
  };

  const handleSectionToggle = (section) => {
    setStep3Data(prev => ({
      ...prev,
      include_sections: prev.include_sections.includes(section)
        ? prev.include_sections.filter(s => s !== section)
        : [...prev.include_sections, section]
    }));
  };

  const handleAnalyticsToggle = (analytics) => {
    setStep3Data(prev => ({
      ...prev,
      analytics_options: prev.analytics_options.includes(analytics)
        ? prev.analytics_options.filter(a => a !== analytics)
        : [...prev.analytics_options, analytics]
    }));
  };

  const handleNext = () => {
    let isValid = true;
    
    if (currentStep === 1) {
      isValid = validateStep1();
    } else if (currentStep === 2) {
      isValid = validateStep2();
    }
    
    if (isValid) {
      setCurrentStep(prev => prev + 1);
      setError(null);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Build the complete wizard data
      const wizardData = reportsAPI.buildWizardData(
        step1Data,
        step2Data,
        step3Data.include_sections,
        step3Data.analytics_options
      );
      
      // Complete the wizard
      const newReport = await reportsAPI.completeWizard(wizardData);
      
      // Notify parent component
      onReportCreated(newReport);
      
      // Close the wizard
      onClose();
      
    } catch (err) {
      console.error('Failed to create report:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const availableSections = [
    { id: 'executive_summary', label: 'Executive Summary', description: 'High-level overview of the incident' },
    { id: 'incident_details', label: 'Incident Details', description: 'Detailed information about the incident' },
    { id: 'timeline', label: 'Timeline', description: 'Chronological sequence of events' },
    { id: 'actions_taken', label: 'Actions Taken', description: 'Response actions and procedures followed' },
    { id: 'user_inputs', label: 'User Inputs', description: 'Data collected during playbook execution' },
    { id: 'recommendations', label: 'Recommendations', description: 'Lessons learned and future improvements' },
    { id: 'artifacts', label: 'Artifacts', description: 'Evidence and files collected' },
    { id: 'impact_assessment', label: 'Impact Assessment', description: 'Analysis of incident impact' }
  ];

  const availableAnalytics = [
    { id: 'incident_count', label: 'Incident Count', description: 'Total number of incidents' },
    { id: 'mttr', label: 'Mean Time to Resolution', description: 'Average resolution time' },
    { id: 'affected_systems', label: 'Affected Systems', description: 'Number of impacted systems' },
    { id: 'severity_distribution', label: 'Severity Distribution', description: 'Breakdown by severity levels' },
    { id: 'response_time', label: 'Response Time', description: 'Time to initial response' },
    { id: 'containment_time', label: 'Containment Time', description: 'Time to contain the incident' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Create New Report</h2>
            <p className="text-gray-400 mt-1">
              Step {currentStep} of 3 - {
                currentStep === 1 ? 'Report Type & Basic Information' :
                currentStep === 2 ? (step1Data.report_type === 'incident' ? 'Select Incidents' : 'Configure Filters') :
                'Configure Report Sections'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4">
          <div className="flex items-center">
            {[1, 2, 3].map(step => (
              <React.Fragment key={step}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  step <= currentStep 
                    ? 'bg-cerberus-red border-cerberus-red text-white' 
                    : 'border-gray-600 text-gray-400'
                }`}>
                  {step < currentStep ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step
                  )}
                </div>
                {step < 3 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    step < currentStep ? 'bg-cerberus-red' : 'bg-gray-600'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-6">
              <p>{error}</p>
            </div>
          )}

          {/* Validation Errors */}
          {(validationErrors.step1?.length > 0 || validationErrors.step2?.length > 0) && (
            <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-6">
              <p className="font-medium mb-2">Please fix the following errors:</p>
              <ul className="list-disc list-inside space-y-1">
                {[...(validationErrors.step1 || []), ...(validationErrors.step2 || [])].map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step 1: Report Type and Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Report Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Report Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                      step1Data.report_type === 'incident'
                        ? 'border-cerberus-red bg-red-900/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                    onClick={() => handleStep1Change('report_type', 'incident')}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="report_type"
                        value="incident"
                        checked={step1Data.report_type === 'incident'}
                        onChange={() => handleStep1Change('report_type', 'incident')}
                        className="text-cerberus-red focus:ring-cerberus-red"
                      />
                      <div className="ml-3">
                        <h3 className="text-white font-medium">Incident Report</h3>
                        <p className="text-gray-400 text-sm">Generate a report for one or more specific incidents</p>
                      </div>
                    </div>
                  </div>
                  
                  <div
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                      step1Data.report_type === 'collective'
                        ? 'border-cerberus-red bg-red-900/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                    onClick={() => handleStep1Change('report_type', 'collective')}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="report_type"
                        value="collective"
                        checked={step1Data.report_type === 'collective'}
                        onChange={() => handleStep1Change('report_type', 'collective')}
                        className="text-cerberus-red focus:ring-cerberus-red"
                      />
                      <div className="ml-3">
                        <h3 className="text-white font-medium">Collective Report</h3>
                        <p className="text-gray-400 text-sm">Generate a comprehensive report across multiple incidents and time periods</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Report Title *
                </label>
                <input
                  type="text"
                  value={step1Data.title}
                  onChange={(e) => handleStep1Change('title', e.target.value)}
                  placeholder="Enter report title..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={step1Data.description}
                  onChange={(e) => handleStep1Change('description', e.target.value)}
                  placeholder="Enter report description..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                />
              </div>

              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Report Template
                </label>
                {loadingTemplates ? (
                  <div className="text-gray-400">Loading templates...</div>
                ) : (
                  <select
                    value={step1Data.template_id || ''}
                    onChange={(e) => handleStep1Change('template_id', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                  >
                    <option value="">Select a template (optional)</option>
                    {availableTemplates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-gray-400 text-sm mt-1">Choose a template to structure your report</p>
              </div>
            </div>
          )}

          {/* Step 2: Incident Selection or Collective Filters */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {step1Data.report_type === 'incident' ? (
                // Incident Selection
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Select Incidents</h3>
                  <p className="text-gray-400 mb-4">Choose one or more resolved incidents to include in your report.</p>
                  
                  {loadingIncidents ? (
                    <LoadingSpinner />
                  ) : availableIncidents.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No resolved incidents available for reporting.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {availableIncidents.map(incident => (
                        <div
                          key={incident.id}
                          className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                            step2Data.incident_ids.includes(incident.id)
                              ? 'border-cerberus-red bg-red-900/20'
                              : 'border-gray-600 hover:border-gray-500'
                          }`}
                          onClick={() => handleIncidentToggle(incident.id)}
                        >
                          <div className="flex items-start">
                            <input
                              type="checkbox"
                              checked={step2Data.incident_ids.includes(incident.id)}
                              onChange={() => handleIncidentToggle(incident.id)}
                              className="mt-1 text-cerberus-red focus:ring-cerberus-red"
                            />
                            <div className="ml-3 flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="text-white font-medium">{incident.incident_id}</h4>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  incident.severity === 'critical' ? 'bg-red-600 text-red-100' :
                                  incident.severity === 'high' ? 'bg-orange-600 text-orange-100' :
                                  incident.severity === 'medium' ? 'bg-yellow-600 text-yellow-100' :
                                  'bg-green-600 text-green-100'
                                }`}>
                                  {incident.severity}
                                </span>
                              </div>
                              <p className="text-gray-300 mt-1">{incident.title}</p>
                              <div className="flex items-center text-sm text-gray-400 mt-2">
                                <span>Created: {new Date(incident.created_at).toLocaleDateString()}</span>
                                {incident.resolved_at && (
                                  <span className="ml-4">
                                    Resolved: {new Date(incident.resolved_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {step2Data.incident_ids.length > 0 && (
                    <div className="mt-4 p-3 bg-gray-750 rounded-lg">
                      <p className="text-white text-sm">
                        <strong>{step2Data.incident_ids.length}</strong> incident{step2Data.incident_ids.length > 1 ? 's' : ''} selected
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Collective Report Filters
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white mb-4">Configure Report Filters</h3>
                  
                  {/* Date Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Date Range *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={step2Data.date_range.start}
                          onChange={(e) => handleDateRangeChange('start', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">End Date</label>
                        <input
                          type="date"
                          value={step2Data.date_range.end}
                          onChange={(e) => handleDateRangeChange('end', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Severity Levels */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Severity Levels
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {['low', 'medium', 'high', 'critical'].map(severity => (
                        <label key={severity} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={step2Data.severity_levels.includes(severity)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleStep2Change('severity_levels', [...step2Data.severity_levels, severity]);
                              } else {
                                handleStep2Change('severity_levels', step2Data.severity_levels.filter(s => s !== severity));
                              }
                            }}
                            className="text-cerberus-red focus:ring-cerberus-red"
                          />
                          <span className="ml-2 text-white capitalize">{severity}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Incident Types */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Incident Types
                    </label>
                    <input
                      type="text"
                      value={step2Data.incident_types.join(', ')}
                      onChange={(e) => handleStep2Change('incident_types', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                      placeholder="malware, phishing, data breach (comma separated)"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                    />
                  </div>

                  {/* Additional Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Affected Departments
                      </label>
                      <input
                        type="text"
                        value={step2Data.affected_departments.join(', ')}
                        onChange={(e) => handleStep2Change('affected_departments', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                        placeholder="IT, Finance, HR (comma separated)"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        IP Addresses
                      </label>
                      <input
                        type="text"
                        value={step2Data.ip_addresses.join(', ')}
                        onChange={(e) => handleStep2Change('ip_addresses', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                        placeholder="192.168.1.1, 10.0.0.1 (comma separated)"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Report Configuration */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white mb-4">Configure Report Sections</h3>
              
              {/* Report Sections */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Include Sections
                </label>
                <p className="text-gray-400 text-sm mb-4">Select which sections to include in your report</p>
                <div className="space-y-3">
                  {availableSections.map(section => (
                    <div
                      key={section.id}
                      className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                        step3Data.include_sections.includes(section.id)
                          ? 'border-cerberus-red bg-red-900/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                      onClick={() => handleSectionToggle(section.id)}
                    >
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          checked={step3Data.include_sections.includes(section.id)}
                          onChange={() => handleSectionToggle(section.id)}
                          className="mt-1 text-cerberus-red focus:ring-cerberus-red"
                        />
                        <div className="ml-3">
                          <h4 className="text-white font-medium">{section.label}</h4>
                          <p className="text-gray-400 text-sm mt-1">{section.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analytics Options */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Analytics & Metrics
                </label>
                <p className="text-gray-400 text-sm mb-4">Select analytics to automatically generate in your report</p>
                <div className="space-y-3">
                  {availableAnalytics.map(analytics => (
                    <div
                      key={analytics.id}
                      className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                        step3Data.analytics_options.includes(analytics.id)
                          ? 'border-cerberus-red bg-red-900/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                      onClick={() => handleAnalyticsToggle(analytics.id)}
                    >
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          checked={step3Data.analytics_options.includes(analytics.id)}
                          onChange={() => handleAnalyticsToggle(analytics.id)}
                          className="mt-1 text-cerberus-red focus:ring-cerberus-red"
                        />
                        <div className="ml-3">
                          <h4 className="text-white font-medium">{analytics.label}</h4>
                          <p className="text-gray-400 text-sm mt-1">{analytics.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-750 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Report Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type:</span>
                    <span className="text-white">{reportsAPI.getTypeDisplay(step1Data.report_type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Title:</span>
                    <span className="text-white">{step1Data.title}</span>
                  </div>
                  {step1Data.report_type === 'incident' && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Incidents:</span>
                      <span className="text-white">{step2Data.incident_ids.length} selected</span>
                    </div>
                  )}
                  {step1Data.report_type === 'collective' && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date Range:</span>
                      <span className="text-white">
                        {step2Data.date_range.start} to {step2Data.date_range.end}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sections:</span>
                    <span className="text-white">{step3Data.include_sections.length} selected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Analytics:</span>
                    <span className="text-white">{step3Data.analytics_options.length} selected</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-700">
          <div>
            {currentStep > 1 && (
              <button
                onClick={handlePrevious}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                ← Previous
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            
            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                disabled={isSubmitting}
                className="bg-cerberus-red hover:bg-red-600 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-cerberus-red hover:bg-red-600 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating Report...
                  </span>
                ) : (
                  'Create Report'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportBuildWizard;