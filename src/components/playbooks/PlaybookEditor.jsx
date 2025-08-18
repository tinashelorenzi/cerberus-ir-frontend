import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import PlaybookAPI from '../../services/PlaybookAPI'; // Import the API service

const PlaybookBuilder = ({ onSave, onCancel }) => {
  const [playbookData, setPlaybookData] = useState({
    name: '',
    description: '',
    estimated_duration_minutes: 30,
    tags: [],
    status: 'draft',
    version: '1.0',
    playbook_definition: {
      metadata: {},
      phases: []
    }
  });
  const [currentTag, setCurrentTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!playbookData.name.trim()) {
      newErrors.name = 'Playbook name is required';
    }
    
    if (!playbookData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (playbookData.playbook_definition.phases.length === 0) {
      newErrors.phases = 'At least one phase is required';
    }
    
    // Validate each phase has at least one step
    playbookData.playbook_definition.phases.forEach((phase, phaseIndex) => {
      if (!phase.steps || phase.steps.length === 0) {
        newErrors[`phase_${phaseIndex}_steps`] = `Phase "${phase.title}" must have at least one step`;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updatePlaybookData = (updates) => {
    setPlaybookData(prev => ({ ...prev, ...updates }));
    // Clear related errors when updating
    if (updates.name) setErrors(prev => ({ ...prev, name: undefined }));
    if (updates.description) setErrors(prev => ({ ...prev, description: undefined }));
  };

  const addTag = () => {
    if (currentTag.trim() && 
        !(playbookData.tags || []).includes(currentTag.trim())) {
      setPlaybookData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setPlaybookData(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      
      // Prepare playbook data with metadata
      const playbookToSave = {
        ...playbookData,
        playbook_definition: {
          ...playbookData.playbook_definition,
          metadata: {
            name: playbookData.name,
            description: playbookData.description,
            estimated_duration: playbookData.estimated_duration_minutes,
            version: playbookData.version || '1.0'
          }
        }
      };

      // Use PlaybookAPI service instead of direct fetch
      await PlaybookAPI.createPlaybook(playbookToSave);
      
      onSave();
    } catch (error) {
      console.error('Error creating playbook:', error);
      alert(`Failed to create playbook: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    if (source.droppableId === destination.droppableId) {
      // Reordering within the same phase
      const phaseIndex = parseInt(source.droppableId.split('-')[1]);
      const steps = [...(playbookData.playbook_definition.phases[phaseIndex].steps || [])];
      const [reorderedStep] = steps.splice(source.index, 1);
      steps.splice(destination.index, 0, reorderedStep);
      updatePhase(phaseIndex, { steps });
    }
  };

  const updatePhase = (phaseIndex, updates) => {
    const updatedPhases = [...(playbookData.playbook_definition.phases || [])];
    updatedPhases[phaseIndex] = { ...updatedPhases[phaseIndex], ...updates };
    
    setPlaybookData(prev => ({
      ...prev,
      playbook_definition: {
        ...prev.playbook_definition,
        phases: updatedPhases
      }
    }));
    
    // Clear phase-related errors
    setErrors(prev => ({ 
      ...prev, 
      phases: undefined,
      [`phase_${phaseIndex}_steps`]: undefined 
    }));
  };

  const addPhase = () => {
    const newPhase = {
      name: `phase_${Date.now()}`,
      title: 'New Phase',
      description: '',
      steps: []
    };
    
    setPlaybookData(prev => ({
      ...prev,
      playbook_definition: {
        ...prev.playbook_definition,
        phases: [...(prev.playbook_definition.phases || []), newPhase]
      }
    }));
    
    setErrors(prev => ({ ...prev, phases: undefined }));
  };

  const removePhase = (phaseIndex) => {
    const updatedPhases = [...(playbookData.playbook_definition.phases || [])];
    updatedPhases.splice(phaseIndex, 1);
    
    setPlaybookData(prev => ({
      ...prev,
      playbook_definition: {
        ...prev.playbook_definition,
        phases: updatedPhases
      }
    }));
  };

  const addStep = (phaseIndex) => {
    const newStep = {
      name: `step_${Date.now()}`,
      title: 'New Step',
      type: 'manual_action',
      description: '',
      required: true,
      inputs: [],
      estimated_minutes: 5
    };
    
    const updatedPhases = [...(playbookData.playbook_definition.phases || [])];
    const phase = updatedPhases[phaseIndex];
    phase.steps = [...(phase.steps || []), newStep];
    
    setPlaybookData(prev => ({
      ...prev,
      playbook_definition: {
        ...prev.playbook_definition,
        phases: updatedPhases
      }
    }));
    
    setErrors(prev => ({ ...prev, [`phase_${phaseIndex}_steps`]: undefined }));
  };

  const updateStep = (phaseIndex, stepIndex, updates) => {
    const updatedPhases = [...(playbookData.playbook_definition.phases || [])];
    const steps = [...updatedPhases[phaseIndex].steps];
    steps[stepIndex] = { ...steps[stepIndex], ...updates };
    updatedPhases[phaseIndex].steps = steps;
    
    setPlaybookData(prev => ({
      ...prev,
      playbook_definition: {
        ...prev.playbook_definition,
        phases: updatedPhases
      }
    }));
  };

  const removeStep = (phaseIndex, stepIndex) => {
    const updatedPhases = [...(playbookData.playbook_definition.phases || [])];
    updatedPhases[phaseIndex].steps.splice(stepIndex, 1);
    
    setPlaybookData(prev => ({
      ...prev,
      playbook_definition: {
        ...prev.playbook_definition,
        phases: updatedPhases
      }
    }));
  };

  return (
    <div className="min-h-screen bg-cerberus-dark">
      {/* Header */}
      <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Create New Playbook</h1>
              <p className="text-gray-400">Build a new incident response playbook</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-cerberus-green text-white rounded-lg hover:bg-cerberus-green/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {saving ? 'Creating...' : 'Create Playbook'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Error Summary */}
        {Object.keys(errors).length > 0 && (
          <div className="card-glass p-4 border-l-4 border-red-500">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Please fix the following errors:</span>
            </div>
            <ul className="list-disc list-inside text-red-300 text-sm space-y-1">
              {Object.values(errors).map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Basic Information */}
        <div className="card-glass p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Playbook Name *
              </label>
              <input
                type="text"
                value={playbookData.name}
                onChange={(e) => updatePlaybookData({ name: e.target.value })}
                className={`w-full px-3 py-2 bg-gray-800/50 border rounded-lg text-white focus:ring-1 ${
                  errors.name 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-600 focus:border-cerberus-green focus:ring-cerberus-green'
                }`}
                placeholder="Enter playbook name"
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Estimated Duration (minutes)
              </label>
              <input
                type="number"
                value={playbookData.estimated_duration_minutes}
                onChange={(e) => updatePlaybookData({ estimated_duration_minutes: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-cerberus-green focus:ring-1 focus:ring-cerberus-green"
                min="1"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={playbookData.description}
              onChange={(e) => updatePlaybookData({ description: e.target.value })}
              className={`w-full px-3 py-2 bg-gray-800/50 border rounded-lg text-white focus:ring-1 ${
                errors.description 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-600 focus:border-cerberus-green focus:ring-cerberus-green'
              }`}
              rows="3"
              placeholder="Describe what this playbook is for and when to use it"
            />
            {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
          </div>

          {/* Tags */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(playbookData.tags || []).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-cerberus-green/20 text-cerberus-green rounded-full text-sm"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="text-cerberus-green hover:text-red-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-cerberus-green focus:ring-1 focus:ring-cerberus-green"
                placeholder="Add tags..."
              />
              <button
                onClick={addTag}
                className="px-4 py-2 bg-cerberus-green text-white rounded-lg hover:bg-cerberus-green/80"
              >
                Add
              </button>
            </div>
          </div>

          {/* Status and Version */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                value={playbookData.status || 'draft'}
                onChange={(e) => updatePlaybookData({ status: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-cerberus-green focus:ring-1 focus:ring-cerberus-green"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="deprecated">Deprecated</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Version
              </label>
              <input
                type="text"
                value={playbookData.version || '1.0'}
                onChange={(e) => updatePlaybookData({ version: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-cerberus-green focus:ring-1 focus:ring-cerberus-green"
                placeholder="1.0"
              />
            </div>
          </div>
        </div>

        {/* Phases and Steps */}
        <div className="card-glass p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Playbook Phases</h2>
              {errors.phases && <p className="text-red-400 text-sm mt-1">{errors.phases}</p>}
            </div>
            <button
              onClick={addPhase}
              className="px-4 py-2 bg-cerberus-green text-white rounded-lg hover:bg-cerberus-green/80 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Phase
            </button>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <div className="space-y-6">
              {(playbookData.playbook_definition.phases || []).map((phase, phaseIndex) => (
                <div key={phaseIndex} className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={phase.title || ''}
                        onChange={(e) => updatePhase(phaseIndex, { title: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-lg font-medium focus:border-cerberus-green focus:ring-1 focus:ring-cerberus-green"
                        placeholder="Phase Title"
                      />
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => addStep(phaseIndex)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Add Step
                      </button>
                      <button
                        onClick={() => removePhase(phaseIndex)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={phase.description || ''}
                    onChange={(e) => updatePhase(phaseIndex, { description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-sm mb-4 focus:border-cerberus-green focus:ring-1 focus:ring-cerberus-green"
                    rows="2"
                    placeholder="Phase description"
                  />

                  {errors[`phase_${phaseIndex}_steps`] && (
                    <div className="mb-4 p-2 bg-red-900/50 border border-red-700 rounded text-red-400 text-sm">
                      {errors[`phase_${phaseIndex}_steps`]}
                    </div>
                  )}

                  <Droppable droppableId={`phase-${phaseIndex}`}>
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                        {(phase.steps || []).map((step, stepIndex) => (
                          <Draggable key={stepIndex} draggableId={`step-${phaseIndex}-${stepIndex}`} index={stepIndex}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="bg-gray-700/50 rounded-lg p-3 border border-gray-600"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <input
                                    type="text"
                                    value={step.title || ''}
                                    onChange={(e) => updateStep(phaseIndex, stepIndex, { title: e.target.value })}
                                    className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-cerberus-green focus:ring-1 focus:ring-cerberus-green"
                                    placeholder="Step Title"
                                  />
                                  <button
                                    onClick={() => removeStep(phaseIndex, stepIndex)}
                                    className="ml-2 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                  >
                                    Remove
                                  </button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                                  <select
                                    value={step.type || 'manual_action'}
                                    onChange={(e) => updateStep(phaseIndex, stepIndex, { type: e.target.value })}
                                    className="px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-sm focus:border-cerberus-green focus:ring-1 focus:ring-cerberus-green"
                                  >
                                    <option value="manual_action">Manual Action</option>
                                    <option value="automated_action">Automated Action</option>
                                    <option value="user_input">User Input</option>
                                    <option value="approval">Approval</option>
                                    <option value="notification">Notification</option>
                                    <option value="artifact_collection">Artifact Collection</option>
                                    <option value="analysis">Analysis</option>
                                    <option value="decision_point">Decision Point</option>
                                    <option value="report_generation">Report Generation</option>
                                  </select>
                                  
                                  <input
                                    type="number"
                                    value={step.estimated_minutes || 5}
                                    onChange={(e) => updateStep(phaseIndex, stepIndex, { estimated_minutes: parseInt(e.target.value) || 5 })}
                                    className="px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-sm focus:border-cerberus-green focus:ring-1 focus:ring-cerberus-green"
                                    placeholder="Minutes"
                                    min="1"
                                  />
                                  
                                  <label className="flex items-center gap-2 text-sm text-gray-300">
                                    <input
                                      type="checkbox"
                                      checked={step.required !== false}
                                      onChange={(e) => updateStep(phaseIndex, stepIndex, { required: e.target.checked })}
                                      className="rounded"
                                    />
                                    Required
                                  </label>
                                </div>
                                
                                <textarea
                                  value={step.description || ''}
                                  onChange={(e) => updateStep(phaseIndex, stepIndex, { description: e.target.value })}
                                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-sm focus:border-cerberus-green focus:ring-1 focus:ring-cerberus-green"
                                  rows="2"
                                  placeholder="Step description or instructions"
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>

          {playbookData.playbook_definition.phases?.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>No phases created yet</p>
                <p className="text-sm">Add phases to structure your incident response process</p>
              </div>
              <button
                onClick={addPhase}
                className="px-6 py-3 bg-cerberus-green text-white rounded-lg hover:bg-cerberus-green/80"
              >
                Create First Phase
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaybookBuilder;