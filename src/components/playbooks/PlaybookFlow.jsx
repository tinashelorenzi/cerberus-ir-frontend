import React, { useState } from 'react';

const PlaybookFlow = ({ playbook, incident, onClose }) => {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [currentStep, setCurrentStep] = useState(0);

  // Dummy data for demonstration
  const phases = playbook?.playbook_definition?.phases || [
    {
      title: 'Initial Assessment',
      description: 'Gather initial information about the incident',
      steps: [
        { title: 'Review Alert Details', type: 'manual_action', description: 'Examine the alert information and context', estimated_minutes: 5, required: true },
        { title: 'Identify Affected Systems', type: 'manual_action', description: 'Determine which systems are impacted', estimated_minutes: 10, required: true },
        { title: 'Assess Severity Level', type: 'decision_point', description: 'Evaluate the severity and priority of the incident', estimated_minutes: 5, required: true }
      ]
    },
    {
      title: 'Containment',
      description: 'Isolate and contain the threat',
      steps: [
        { title: 'Block Suspicious IPs', type: 'automated_action', description: 'Automatically block identified malicious IP addresses', estimated_minutes: 2, required: true },
        { title: 'Disable Compromised Accounts', type: 'manual_action', description: 'Disable any compromised user accounts', estimated_minutes: 15, required: true },
        { title: 'Isolate Affected Systems', type: 'manual_action', description: 'Disconnect affected systems from the network', estimated_minutes: 20, required: true }
      ]
    },
    {
      title: 'Investigation',
      description: 'Deep dive analysis of the incident',
      steps: [
        { title: 'Collect System Logs', type: 'artifact_collection', description: 'Gather relevant system and security logs', estimated_minutes: 30, required: true },
        { title: 'Analyze Network Traffic', type: 'analysis', description: 'Review network traffic patterns for anomalies', estimated_minutes: 45, required: true },
        { title: 'Review Access Logs', type: 'analysis', description: 'Examine user access and authentication logs', estimated_minutes: 30, required: true }
      ]
    },
    {
      title: 'Remediation',
      description: 'Fix and restore affected systems',
      steps: [
        { title: 'Remove Malware', type: 'automated_action', description: 'Run automated malware removal tools', estimated_minutes: 60, required: true },
        { title: 'Patch Vulnerabilities', type: 'manual_action', description: 'Apply security patches to affected systems', estimated_minutes: 120, required: true },
        { title: 'Restore from Backup', type: 'manual_action', description: 'Restore clean system state from backup', estimated_minutes: 180, required: false }
      ]
    },
    {
      title: 'Recovery',
      description: 'Return systems to normal operation',
      steps: [
        { title: 'Verify System Integrity', type: 'manual_action', description: 'Confirm systems are clean and secure', estimated_minutes: 30, required: true },
        { title: 'Re-enable Services', type: 'manual_action', description: 'Gradually restore affected services', estimated_minutes: 45, required: true },
        { title: 'Monitor for Recurrence', type: 'notification', description: 'Set up monitoring for similar threats', estimated_minutes: 15, required: true }
      ]
    }
  ];

  const handleStepComplete = (phaseIndex, stepIndex) => {
    const stepKey = `${phaseIndex}-${stepIndex}`;
    setCompletedSteps(prev => new Set([...prev, stepKey]));
    
    // Auto-advance to next step
    const currentPhaseSteps = phases[phaseIndex].steps;
    if (stepIndex < currentPhaseSteps.length - 1) {
      setCurrentStep(stepIndex + 1);
    } else if (phaseIndex < phases.length - 1) {
      // Move to next phase
      setCurrentPhase(phaseIndex + 1);
      setCurrentStep(0);
    }
  };

  const handleStepSkip = (phaseIndex, stepIndex) => {
    const stepKey = `${phaseIndex}-${stepIndex}`;
    setCompletedSteps(prev => new Set([...prev, stepKey]));
    
    // Auto-advance to next step
    const currentPhaseSteps = phases[phaseIndex].steps;
    if (stepIndex < currentPhaseSteps.length - 1) {
      setCurrentStep(stepIndex + 1);
    } else if (phaseIndex < phases.length - 1) {
      setCurrentPhase(phaseIndex + 1);
      setCurrentStep(0);
    }
  };

  const getStepStatus = (phaseIndex, stepIndex) => {
    const stepKey = `${phaseIndex}-${stepIndex}`;
    if (completedSteps.has(stepKey)) {
      return 'completed';
    } else if (phaseIndex === currentPhase && stepIndex === currentStep) {
      return 'current';
    } else if (phaseIndex < currentPhase || (phaseIndex === currentPhase && stepIndex < currentStep)) {
      return 'pending';
    } else {
      return 'upcoming';
    }
  };

  const getStepIcon = (step) => {
    switch (step.type) {
      case 'manual_action':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
      case 'automated_action':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'decision_point':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'artifact_collection':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'analysis':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'notification':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.19 4.19A2 2 0 004 6v10a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-1.81 1.19z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900/50 border-b border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Playbook Execution</h2>
              <p className="text-gray-400 mt-1">
                {playbook?.name} - Incident {incident?.incident_id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex space-x-6 p-6 min-w-max">
            {phases.map((phase, phaseIndex) => (
              <div key={phaseIndex} className="flex-shrink-0 w-80">
                <div className="bg-gray-700 rounded-lg p-4">
                  {/* Phase Header */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {phase.title}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        phaseIndex < currentPhase 
                          ? 'bg-green-600 text-white' 
                          : phaseIndex === currentPhase 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-600 text-gray-300'
                      }`}>
                        {phaseIndex < currentPhase ? 'Completed' : phaseIndex === currentPhase ? 'In Progress' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{phase.description}</p>
                  </div>

                  {/* Steps */}
                  <div className="space-y-3">
                    {phase.steps.map((step, stepIndex) => {
                      const status = getStepStatus(phaseIndex, stepIndex);
                      return (
                        <div
                          key={stepIndex}
                          className={`p-3 rounded-lg border transition-all ${
                            status === 'completed'
                              ? 'bg-green-900/30 border-green-600'
                              : status === 'current'
                              ? 'bg-blue-900/30 border-blue-600'
                              : status === 'pending'
                              ? 'bg-yellow-900/30 border-yellow-600'
                              : 'bg-gray-600/30 border-gray-500'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className={`p-1 rounded ${
                                status === 'completed'
                                  ? 'bg-green-600 text-white'
                                  : status === 'current'
                                  ? 'bg-blue-600 text-white'
                                  : status === 'pending'
                                  ? 'bg-yellow-600 text-white'
                                  : 'bg-gray-600 text-gray-300'
                              }`}>
                                {getStepIcon(step)}
                              </div>
                              <h4 className="text-sm font-medium text-white">{step.title}</h4>
                            </div>
                            <span className="text-xs text-gray-400">{step.estimated_minutes}m</span>
                          </div>
                          
                          <p className="text-xs text-gray-400 mb-3">{step.description}</p>
                          
                          <div className="flex items-center justify-between">
                            <span className={`text-xs px-2 py-1 rounded ${
                              step.type === 'automated_action'
                                ? 'bg-purple-600/20 text-purple-300'
                                : step.type === 'manual_action'
                                ? 'bg-blue-600/20 text-blue-300'
                                : step.type === 'decision_point'
                                ? 'bg-orange-600/20 text-orange-300'
                                : 'bg-gray-600/20 text-gray-300'
                            }`}>
                              {step.type.replace('_', ' ')}
                            </span>
                            
                            {status === 'current' && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleStepComplete(phaseIndex, stepIndex)}
                                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                                >
                                  Complete
                                </button>
                                {!step.required && (
                                  <button
                                    onClick={() => handleStepSkip(phaseIndex, stepIndex)}
                                    className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                                  >
                                    Skip
                                  </button>
                                )}
                              </div>
                            )}
                            
                            {status === 'completed' && (
                              <div className="flex items-center text-green-400">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-xs">Done</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-900/50 border-t border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Overall Progress</span>
            <span className="text-sm text-white">
              {Math.round((completedSteps.size / phases.reduce((acc, phase) => acc + phase.steps.length, 0)) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-cerberus-green h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(completedSteps.size / phases.reduce((acc, phase) => acc + phase.steps.length, 0)) * 100}%` 
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaybookFlow;
