// src/components/playbooks/PlaybookFlow.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import playbookFlowService from '../../services/playbookFlow';

const PlaybookFlow = ({ playbook, incident, onClose }) => {
  const { user } = useAuth();
  
  // State management
  const [flowData, setFlowData] = useState(null);
  const [steps, setSteps] = useState([]);
  const [phaseSteps, setPhaseSteps] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStep, setSelectedStep] = useState(null);
  const [showUserInputModal, setShowUserInputModal] = useState(false);
  const [userInputData, setUserInputData] = useState({});
  const [submittingInput, setSubmittingInput] = useState(false);
  const [executingStep, setExecutingStep] = useState(new Set());
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [finalReport, setFinalReport] = useState('');
  const [closeIncident, setCloseIncident] = useState(true);
  const [closeAlert, setCloseAlert] = useState(true);
  const [committing, setCommitting] = useState(false);
  
  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionData, setCompletionData] = useState({
    finalReport: '',
    alertDisposition: 'resolved', // 'false_positive', 'resolved', 'closed'
    incidentStatus: 'resolved' // 'resolved', 'closed'
  });

  // Initialize flow on component mount
  useEffect(() => {
    initializeFlow();
  }, [playbook, incident]);

  const initializeFlow = async () => {
    try {
      setLoading(true);
      setError(null);

      let flow = null;
      
      try {
        // Try to create a new flow
        const flowData = {
          incident_id: incident.incident_id,
          playbook_id: playbook.id,
          alert_id: incident.alert_id || null,
          assigned_analyst_id: user.id
        };

        flow = await playbookFlowService.createIncidentFlow(flowData);
        
      } catch (createError) {
        // Check if it's a 409 conflict (flow already exists)
        if (createError.message.includes('already exists') || createError.message.includes('409')) {
          try {
            // Try to get the existing flow
            console.log('Flow already exists, attempting to fetch existing flow...');
            flow = await playbookFlowService.getFlowByIncidentId(incident.incident_id);
            
            if (!flow) {
              throw new Error('Could not retrieve existing flow for this incident');
            }
          } catch (fetchError) {
            console.error('Failed to fetch existing flow:', fetchError);
            setError('Incident flow already exists but could not be retrieved. Please refresh the page or contact support.');
            return;
          }
        } else {
          throw createError;
        }
      }

      if (!flow) {
        throw new Error('Failed to create or retrieve incident flow');
      }

      setFlowData(flow);

      // Get flow steps
      const stepsData = await playbookFlowService.getFlowSteps(flow.flow_id);
      setSteps(stepsData);

      // Group steps by phase
      const groupedSteps = playbookFlowService.groupStepsByPhase(stepsData);
      setPhaseSteps(groupedSteps);

    } catch (err) {
      console.error('Failed to initialize flow:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshSteps = async () => {
    try {
      const stepsData = await playbookFlowService.getFlowSteps(flowData.flow_id);
      setSteps(stepsData);
      
      const groupedSteps = playbookFlowService.groupStepsByPhase(stepsData);
      setPhaseSteps(groupedSteps);

      // Also refresh flow data to get updated progress
      const updatedFlow = await playbookFlowService.getIncidentFlow(flowData.flow_id);
      setFlowData(updatedFlow);
    } catch (err) {
      console.error('Failed to refresh steps:', err);
    }
  };

  // Step execution handlers
  const handleStartStep = async (step) => {
    try {
      setExecutingStep(prev => new Set(prev).add(step.step_name));
      
      await playbookFlowService.startStep(flowData.flow_id, step.step_name);
      await refreshSteps();
      
    } catch (err) {
      console.error('Failed to start step:', err);
      setError(`Failed to start step: ${err.message}`);
    } finally {
      setExecutingStep(prev => {
        const newSet = new Set(prev);
        newSet.delete(step.step_name);
        return newSet;
      });
    }
  };

  const handleCompleteStep = async (step, outputData = {}) => {
    try {
      setExecutingStep(prev => new Set(prev).add(step.step_name));
      
      await playbookFlowService.completeStep(flowData.flow_id, step.step_name, {
        output_data: outputData,
        success: true
      });
      
      await refreshSteps();
      
    } catch (err) {
      console.error('Failed to complete step:', err);
      setError(`Failed to complete step: ${err.message}`);
    } finally {
      setExecutingStep(prev => {
        const newSet = new Set(prev);
        newSet.delete(step.step_name);
        return newSet;
      });
    }
  };

  const handleSkipStep = async (step, reason) => {
    try {
      setExecutingStep(prev => new Set(prev).add(step.step_name));
      
      await playbookFlowService.skipStep(flowData.flow_id, step.step_name, reason);
      await refreshSteps();
      
    } catch (err) {
      console.error('Failed to skip step:', err);
      setError(`Failed to skip step: ${err.message}`);
    } finally {
      setExecutingStep(prev => {
        const newSet = new Set(prev);
        newSet.delete(step.step_name);
        return newSet;
      });
    }
  };

  // User input handlers
  const handleShowUserInput = (step) => {
    setSelectedStep(step);
    
    // Get input schema from step definition - check multiple possible locations
    const inputSchema = step.input_schema || step.inputs || {};
    let fields = [];
    
    // Handle different input schema formats
    if (inputSchema.fields && Array.isArray(inputSchema.fields)) {
      fields = inputSchema.fields;
    } else if (Array.isArray(inputSchema)) {
      fields = inputSchema;
    } else if (step.step_type === 'user_input') {
      // Create a default input field if none specified
      fields = [{
        name: 'user_input',
        type: 'textarea',
        label: 'Input Required',
        placeholder: 'Please provide the required information...',
        required: true
      }];
    }
    
    // Initialize input data based on fields
    const initialData = {};
    fields.forEach(field => {
      initialData[field.name] = field.type === 'checkbox' ? false : '';
    });
    
    setUserInputData(initialData);
    setShowUserInputModal(true);
  };

  const handleSubmitUserInput = async () => {
    try {
      setSubmittingInput(true);
      
      // Get input schema
      const inputSchema = selectedStep.input_schema || selectedStep.inputs || {};
      let fields = [];
      
      if (inputSchema.fields && Array.isArray(inputSchema.fields)) {
        fields = inputSchema.fields;
      } else if (Array.isArray(inputSchema)) {
        fields = inputSchema;
      } else {
        fields = [{
          name: 'user_input',
          type: 'textarea',
          label: 'Input Required'
        }];
      }
      
      // Prepare input submissions for each field
      const inputPromises = [];
      
      for (const field of fields) {
        const value = userInputData[field.name];
        
        const inputData = {
          field_name: field.name,
          field_type: field.type || 'text',
          label: field.label || field.name,
          raw_value: typeof value === 'string' ? value : JSON.stringify(value),
          parsed_value: typeof value === 'object' ? value : null,
          is_required: field.required || false,
          is_sensitive: field.sensitive || false,
          validation_rules: field.validation || null
        };
        
        inputPromises.push(
          playbookFlowService.submitUserInput(flowData.flow_id, inputData)
        );
      }
      
      // Submit all inputs
      await Promise.all(inputPromises);
      
      // Complete the step with the collected input data
      await handleCompleteStep(selectedStep, userInputData);
      
      // Close modal
      setShowUserInputModal(false);
      setSelectedStep(null);
      setUserInputData({});
      
    } catch (err) {
      console.error('Failed to submit user input:', err);
      setError(`Failed to submit input: ${err.message}`);
    } finally {
      setSubmittingInput(false);
    }
  };

  // Flow completion handlers
  const handleCompleteFlow = async () => {
    try {
      setCommitting(true);
      
      await playbookFlowService.completeFlow(
        flowData.flow_id, 
        finalReport, 
        closeIncident,
        closeAlert
      );
      
      // Refresh to show completed status
      await refreshSteps();
      
      setShowCommitModal(false);
      setFinalReport('');
      setCloseIncident(true);
      setCloseAlert(true);
      
    } catch (err) {
      console.error('Failed to complete flow:', err);
      setError(`Failed to complete flow: ${err.message}`);
    } finally {
      setCommitting(false);
    }
  };

  const handleCompleteFlowWithStatus = async () => {
    try {
      setCommitting(true);
      
      // Use the correct method that sends the proper format
      await playbookFlowService.completeFlowWithStatus(
        flowData.flow_id, 
        completionData  // Pass the entire completionData object
      );
      
      // Refresh to show completed status
      await refreshSteps();
      
      setShowCompletionModal(false);
      setCompletionData({
        finalReport: '',
        alertDisposition: 'resolved',
        incidentStatus: 'resolved'
      });
      
    } catch (err) {
      console.error('Failed to complete flow:', err);
      setError(`Failed to complete flow: ${err.message}`);
    } finally {
      setCommitting(false);
    }
  };

  // Check if flow is ready to commit
  const isFlowComplete = playbookFlowService.isFlowComplete(steps);
  const hasFailedSteps = playbookFlowService.hasFailedRequiredSteps(steps);

  // Debug logging for flow completion
  console.log('Flow completion check:', {
    stepsCount: steps.length,
    isFlowComplete,
    hasFailedSteps,
    flowStatus: flowData?.status,
    stepStatuses: steps.map(s => ({ name: s.step_name, status: s.status }))
  });

  const getStepActions = (step) => {
    const canExecute = playbookFlowService.canExecuteStep(step, steps);
    const isExecuting = executingStep.has(step.step_name);
    
    switch (step.status) {
      case 'pending':
        return canExecute ? (
          <button
            onClick={() => handleStartStep(step)}
            disabled={isExecuting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            {isExecuting ? 'Starting...' : 'Start'}
          </button>
        ) : (
          <span className="text-gray-400 text-sm">Waiting for dependencies</span>
        );
        
      case 'in_progress':
        if (step.step_type === 'user_input') {
          return (
            <button
              onClick={() => handleShowUserInput(step)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
            >
              Provide Input
            </button>
          );
        } else if (step.step_type === 'manual_action') {
          return (
            <div className="flex space-x-2">
              <button
                onClick={() => handleCompleteStep(step)}
                disabled={isExecuting}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
              >
                {isExecuting ? 'Completing...' : 'Complete'}
              </button>
              <button
                onClick={() => handleSkipStep(step, 'Manual skip')}
                disabled={isExecuting}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
              >
                Skip
              </button>
            </div>
          );
        }
        return <span className="text-blue-400 text-sm">In Progress...</span>;
        
      case 'completed':
        return <span className="text-green-400 text-sm">✅ Completed</span>;
        
      case 'failed':
        return <span className="text-red-400 text-sm">❌ Failed</span>;
        
      case 'skipped':
        return <span className="text-yellow-400 text-sm">⏭️ Skipped</span>;
        
      default:
        return <span className="text-gray-400 text-sm">{step.status}</span>;
    }
  };

  const renderUserInputModal = () => {
    if (!showUserInputModal || !selectedStep) return null;
    
    // Get input schema from step definition
    const inputSchema = selectedStep.input_schema || selectedStep.inputs || {};
    let fields = [];
    
    // Handle different input schema formats
    if (inputSchema.fields && Array.isArray(inputSchema.fields)) {
      fields = inputSchema.fields;
    } else if (Array.isArray(inputSchema)) {
      fields = inputSchema;
    } else if (selectedStep.step_type === 'user_input') {
      fields = [{
        name: 'user_input',
        type: 'textarea',
        label: 'Input Required',
        placeholder: 'Please provide the required information...',
        required: true
      }];
    }
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedStep.title}</h2>
                <p className="text-gray-400 text-sm mt-1">{selectedStep.description}</p>
              </div>
              <button
                onClick={() => setShowUserInputModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Instructions */}
            {selectedStep.instructions && (
              <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                <h3 className="font-medium text-white mb-2">Instructions</h3>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedStep.instructions}</p>
              </div>
            )}
            
            {/* Input Fields */}
            {fields.length > 0 ? (
              <div className="space-y-4 mb-6">
                {fields.map((field, index) => (
                  <div key={index}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {field.label || field.name}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    
                    {field.type === 'textarea' ? (
                      <textarea
                        value={userInputData[field.name] || ''}
                        onChange={(e) => setUserInputData(prev => ({
                          ...prev,
                          [field.name]: e.target.value
                        }))}
                        placeholder={field.placeholder}
                        className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                        rows={4}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={userInputData[field.name] || ''}
                        onChange={(e) => setUserInputData(prev => ({
                          ...prev,
                          [field.name]: e.target.value
                        }))}
                        className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                      >
                        <option value="">Select an option</option>
                        {(field.options || []).map((option, optIndex) => (
                          <option key={optIndex} value={option.value || option}>
                            {option.label || option}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'checkbox' ? (
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={userInputData[field.name] || false}
                          onChange={(e) => setUserInputData(prev => ({
                            ...prev,
                            [field.name]: e.target.checked
                          }))}
                          className="mr-2"
                        />
                        <span className="text-gray-300">{field.description || field.label}</span>
                      </label>
                    ) : (
                      <input
                        type={field.type || 'text'}
                        value={userInputData[field.name] || ''}
                        onChange={(e) => setUserInputData(prev => ({
                          ...prev,
                          [field.name]: e.target.value
                        }))}
                        placeholder={field.placeholder}
                        className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                      />
                    )}
                    
                    {field.description && field.type !== 'checkbox' && (
                      <p className="text-gray-400 text-xs mt-1">{field.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                <p className="text-gray-300 text-sm">No specific input fields defined for this step. Please follow the instructions above and complete the step manually.</p>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowUserInputModal(false)}
                className="px-4 py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 rounded-md text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitUserInput}
                disabled={submittingInput}
                className="px-4 py-2 bg-cerberus-red hover:bg-red-700 text-white rounded-md text-sm transition-colors disabled:opacity-50"
              >
                {submittingInput ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCompletionModal = () => {
    if (!showCompletionModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-bold text-white mb-4">Complete Playbook Flow</h2>
          
          {/* Progress Summary */}
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <h3 className="font-medium text-gray-300 mb-2">Flow Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Completed: {steps.filter(s => s.status === 'completed').length}</div>
              <div>Failed: {steps.filter(s => s.status === 'failed').length}</div>
            </div>
            <div className="text-green-400 font-medium">
              Progress: {Math.round(flowData?.progress_percentage || 0)}%
            </div>
          </div>

          {/* Final Report */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Final Report *
            </label>
            <textarea
              value={completionData.finalReport}
              onChange={(e) => setCompletionData(prev => ({...prev, finalReport: e.target.value}))}
              placeholder="Provide a summary of the incident response, findings, and recommendations..."
              className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red"
              rows={4}
              required
            />
          </div>

          {/* Alert Disposition */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Alert Disposition *
            </label>
            <select
              value={completionData.alertDisposition}
              onChange={(e) => setCompletionData(prev => ({...prev, alertDisposition: e.target.value}))}
              className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red"
            >
              <option value="false_positive">False Positive</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <p className="text-gray-400 text-xs mt-1">
              How should this alert be classified?
            </p>
          </div>

          {/* Incident Status */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Incident Status *
            </label>
            <select
              value={completionData.incidentStatus}
              onChange={(e) => setCompletionData(prev => ({...prev, incidentStatus: e.target.value}))}
              className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red"
            >
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowCompletionModal(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleCompleteFlowWithStatus}
              disabled={!completionData.finalReport.trim() || committing}
              className="px-4 py-2 bg-cerberus-red text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {committing ? 'Completing...' : 'Complete Flow'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cerberus-red mx-auto mb-4"></div>
          <p className="text-white">Initializing playbook flow...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 rounded-lg p-8 text-center max-w-md">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-white font-medium mb-2">Error Loading Playbook</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <div className="flex space-x-3 justify-center">
            <button
              onClick={initializeFlow}
              className="px-4 py-2 bg-cerberus-red hover:bg-red-700 text-white rounded-md text-sm transition-colors"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 rounded-md text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">{playbook.name}</h2>
              <p className="text-gray-400 text-sm mt-1">
                Incident: {incident.incident_id} | Flow: {flowData?.flow_id}
              </p>
              {flowData && (
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      flowData.status === 'completed' ? 'bg-green-500' :
                      flowData.status === 'in_progress' ? 'bg-blue-500' :
                      flowData.status === 'failed' ? 'bg-red-500' :
                      'bg-gray-500'
                    }`}></div>
                    <span className="text-sm text-gray-300 capitalize">{flowData.status}</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    Progress: {Math.round(flowData.progress_percentage || 0)}%
                  </div>
                  <div className="text-sm text-gray-300">
                    Steps: {flowData.completed_steps || 0}/{flowData.total_steps || 0}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {flowData && (
          <div className="px-6 py-3 bg-gray-700">
            <div className="flex justify-between text-sm text-gray-300 mb-2">
              <span>Overall Progress</span>
              <span>{Math.round(flowData.progress_percentage || 0)}%</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.max(0, Math.min(100, flowData.progress_percentage || 0))}%`,
                  minWidth: flowData.progress_percentage > 0 ? '4px' : '0px',
                  backgroundColor: '#dc2626' // Explicit red color as fallback
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Kanban Board */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 min-h-full">
            {Object.entries(phaseSteps).map(([phaseName, phaseStepsArray]) => {
              const phaseProgress = playbookFlowService.getPhaseProgress(phaseStepsArray);
              const phaseStatusCounts = playbookFlowService.getStepStatusCounts(phaseStepsArray);
              
              return (
                <div key={phaseName} className="bg-gray-700 rounded-lg flex flex-col">
                  {/* Phase Header */}
                  <div className="p-4 border-b border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white">{phaseName}</h3>
                      <span className="text-sm text-gray-300">{phaseProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-1.5 mb-3">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.max(0, Math.min(100, phaseProgress))}%`,
                          minWidth: phaseProgress > 0 ? '2px' : '0px'
                        }}
                      ></div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {phaseStatusCounts.completed > 0 && (
                        <span className="bg-green-600 text-white px-2 py-1 rounded">
                          ✓ {phaseStatusCounts.completed}
                        </span>
                      )}
                      {phaseStatusCounts.in_progress > 0 && (
                        <span className="bg-blue-600 text-white px-2 py-1 rounded">
                          🔄 {phaseStatusCounts.in_progress}
                        </span>
                      )}
                      {phaseStatusCounts.pending > 0 && (
                        <span className="bg-gray-600 text-white px-2 py-1 rounded">
                          ⏳ {phaseStatusCounts.pending}
                        </span>
                      )}
                      {phaseStatusCounts.waiting_input > 0 && (
                        <span className="bg-purple-600 text-white px-2 py-1 rounded">
                          📝 {phaseStatusCounts.waiting_input}
                        </span>
                      )}
                      {phaseStatusCounts.failed > 0 && (
                        <span className="bg-red-600 text-white px-2 py-1 rounded">
                          ❌ {phaseStatusCounts.failed}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Phase Steps */}
                  <div className="flex-1 p-4 space-y-3">
                    {phaseStepsArray.map((step) => {
                      const canExecute = playbookFlowService.canExecuteStep(step, steps);
                      const isExecuting = executingStep.has(step.step_name);
                      const statusColor = playbookFlowService.getStatusColor(step.status);
                      
                      return (
                        <div 
                          key={step.step_name} 
                          className={`bg-gray-800 rounded-lg p-4 border-l-4 transition-all duration-200 ${
                            step.status === 'completed' ? 'border-green-500' :
                            step.status === 'in_progress' ? 'border-blue-500' :
                            step.status === 'failed' ? 'border-red-500' :
                            step.status === 'waiting_input' ? 'border-purple-500' :
                            canExecute ? 'border-yellow-500' :
                            'border-gray-600'
                          } ${isExecuting ? 'opacity-75' : ''}`}
                        >
                          {/* Step Header */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-white text-sm">{step.title}</h4>
                              <p className="text-gray-400 text-xs mt-1">{step.description}</p>
                            </div>
                            <div className="flex items-center space-x-2 ml-3">
                              <span className="text-lg">
                                {playbookFlowService.getStatusIcon(step.status)}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full text-white ${
                                statusColor === 'green' ? 'bg-green-600' :
                                statusColor === 'blue' ? 'bg-blue-600' :
                                statusColor === 'red' ? 'bg-red-600' :
                                statusColor === 'purple' ? 'bg-purple-600' :
                                statusColor === 'yellow' ? 'bg-yellow-600' :
                                statusColor === 'orange' ? 'bg-orange-600' :
                                'bg-gray-600'
                              }`}>
                                {step.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>

                          {/* Step Metadata */}
                          <div className="flex items-center space-x-4 text-xs text-gray-400 mb-3">
                            <span>Type: {step.step_type?.replace('_', ' ')}</span>
                            {step.expected_duration && (
                              <span>Est: {playbookFlowService.formatDuration(step.expected_duration)}</span>
                            )}
                            {step.actual_duration && (
                              <span>Actual: {playbookFlowService.formatDuration(step.actual_duration)}</span>
                            )}
                          </div>

                          {/* Step Dependencies */}
                          {step.depends_on_steps && step.depends_on_steps.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-400 mb-1">Depends on:</p>
                              <div className="flex flex-wrap gap-1">
                                {step.depends_on_steps.map((depStep) => {
                                  const depStepData = steps.find(s => s.step_name === depStep);
                                  const isDepCompleted = depStepData?.status === 'completed';
                                  
                                  return (
                                    <span 
                                      key={depStep}
                                      className={`text-xs px-2 py-1 rounded ${
                                        isDepCompleted 
                                          ? 'bg-green-600 text-white' 
                                          : 'bg-gray-600 text-gray-300'
                                      }`}
                                    >
                                      {depStep}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Step Instructions (if in progress) */}
                          {step.status === 'in_progress' && step.instructions && (
                            <div className="mb-3 p-3 bg-gray-700 rounded text-xs">
                              <p className="text-gray-300 font-medium mb-1">Instructions:</p>
                              <p className="text-gray-400 whitespace-pre-wrap">{step.instructions}</p>
                            </div>
                          )}

                          {/* Step Actions */}
                          <div className="flex justify-end">
                            {getStepActions(step)}
                          </div>

                          {/* Step Notes (if completed/failed) */}
                          {step.notes && (step.status === 'completed' || step.status === 'failed') && (
                            <div className="mt-3 p-2 bg-gray-700 rounded text-xs">
                              <p className="text-gray-400">{step.notes}</p>
                            </div>
                          )}

                          {/* Error Message (if failed) */}
                          {step.error_message && step.status === 'failed' && (
                            <div className="mt-3 p-2 bg-red-900 rounded text-xs">
                              <p className="text-red-300">{step.error_message}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

                 {/* Footer Actions */}
         <div className="p-6 border-t border-gray-700">
           <div className="flex justify-between items-center">
             <div className="flex space-x-4">
               {flowData?.status === 'in_progress' && (
                 <>
                   <button
                     onClick={() => playbookFlowService.pauseFlow(flowData.flow_id, 'Manual pause')}
                     className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm transition-colors"
                   >
                     Pause Flow
                   </button>
                   <button
                     onClick={() => playbookFlowService.cancelFlow(flowData.flow_id, 'Manual cancellation')}
                     className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors"
                   >
                     Cancel Flow
                   </button>
                 </>
               )}
               {flowData?.status === 'paused' && (
                 <button
                   onClick={() => playbookFlowService.resumeFlow(flowData.flow_id)}
                   className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm transition-colors"
                 >
                   Resume Flow
                 </button>
               )}
             </div>
             
             <div className="flex space-x-3">
               <button
                 onClick={refreshSteps}
                 className="px-4 py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 rounded-md text-sm transition-colors"
               >
                 Refresh
               </button>
               {flowData && (isFlowComplete || flowData.progress_percentage >= 100) && (
                 <button
                   onClick={() => setShowCompletionModal(true)}
                   className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
                   disabled={committing}
                 >
                   {committing ? 'Completing...' : 'Complete Flow'}
                 </button>
               )}
               <button
                 onClick={onClose}
                 className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm transition-colors"
               >
                 Close
               </button>
             </div>
           </div>
         </div>
      </div>

      {/* User Input Modal */}
      {renderUserInputModal()}

      {/* Completion Modal */}
      {renderCompletionModal()}
    </div>
  );
};

export default PlaybookFlow;