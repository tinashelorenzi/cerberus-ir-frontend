// File: src/components/playbooks/PlaybookEditor.jsx
import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import config from '../../config/env';

const PlaybookEditor = ({ playbook, onSave, onCancel }) => {
  const [playbookData, setPlaybookData] = useState(playbook);
  const [currentTag, setCurrentTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setPlaybookData(playbook);
    setHasChanges(false);
  }, [playbook]);

  const stepTypes = [
    { type: 'manual_action', label: 'Manual Action', icon: '👤', color: 'bg-blue-500' },
    { type: 'automated_action', label: 'Automated Action', icon: '🤖', color: 'bg-green-500' },
    { type: 'user_input', label: 'User Input', icon: '📝', color: 'bg-yellow-500' },
    { type: 'approval', label: 'Approval', icon: '✅', color: 'bg-purple-500' },
    { type: 'notification', label: 'Notification', icon: '📧', color: 'bg-orange-500' },
    { type: 'analysis', label: 'Analysis', icon: '🔍', color: 'bg-indigo-500' },
    { type: 'decision_point', label: 'Decision Point', icon: '🔀', color: 'bg-red-500' },
    { type: 'artifact_collection', label: 'Collect Evidence', icon: '📋', color: 'bg-cyan-500' }
  ];

  const markAsChanged = () => {
    setHasChanges(true);
  };

  const updatePlaybookData = (updates) => {
    setPlaybookData(prev => ({ ...prev, ...updates }));
    markAsChanged();
  };

  const updatePhase = (phaseIndex, updates) => {
    setPlaybookData(prev => ({
      ...prev,
      playbook_definition: {
        ...prev.playbook_definition,
        phases: prev.playbook_definition.phases.map((phase, index) => 
          index === phaseIndex ? { ...phase, ...updates } : phase
        )
      }
    }));
    markAsChanged();
  };

  const addStep = (phaseIndex, stepType) => {
    const newStep = {
      name: `step_${Date.now()}`,
      title: '',
      type: stepType,
      description: '',
      required: true,
      inputs: [],
      instructions: '',
      requires_approval: stepType === 'approval',
      estimated_minutes: 15
    };

    updatePhase(phaseIndex, {
      steps: [...(playbookData.playbook_definition.phases[phaseIndex].steps || []), newStep]
    });
  };

  const updateStep = (phaseIndex, stepIndex, updates) => {
    const updatedSteps = [...(playbookData.playbook_definition.phases[phaseIndex].steps || [])];
    updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], ...updates };
    updatePhase(phaseIndex, { steps: updatedSteps });
  };

  const removeStep = (phaseIndex, stepIndex) => {
    const updatedSteps = (playbookData.playbook_definition.phases[phaseIndex].steps || []).filter((_, index) => index !== stepIndex);
    updatePhase(phaseIndex, { steps: updatedSteps });
  };

  const addPhase = () => {
    const newPhase = {
      name: `phase_${(playbookData.playbook_definition.phases || []).length + 1}`,
      title: `Phase ${(playbookData.playbook_definition.phases || []).length + 1}`,
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
    markAsChanged();
  };

  const removePhase = (phaseIndex) => {
    setPlaybookData(prev => ({
      ...prev,
      playbook_definition: {
        ...prev.playbook_definition,
        phases: (prev.playbook_definition.phases || []).filter((_, index) => index !== phaseIndex)
      }
    }));
    markAsChanged();
  };

  const addTag = () => {
    if (currentTag.trim() && !(playbookData.tags || []).includes(currentTag.trim())) {
      setPlaybookData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), currentTag.trim()]
      }));
      setCurrentTag('');
      markAsChanged();
    }
  };

  const removeTag = (tagToRemove) => {
    setPlaybookData(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
    }));
    markAsChanged();
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Update metadata
      const updatedPlaybook = {
        ...playbookData,
        playbook_definition: {
          ...playbookData.playbook_definition,
          metadata: {
            ...(playbookData.playbook_definition.metadata || {}),
            name: playbookData.name,
            description: playbookData.description,
            estimated_duration: playbookData.estimated_duration_minutes,
            version: playbookData.version || '1.0'
          }
        }
      };

      const token = localStorage.getItem(config.STORAGE_KEYS.ACCESS_TOKEN);
      const response = await fetch(`${config.API_BASE_URL}/playbooks/${playbook.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedPlaybook),
      });

      if (response.ok) {
        setHasChanges(false);
        onSave();
      } else {
        const errorData = await response.json();
        alert(`Failed to update playbook: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating playbook:', error);
      alert('Failed to update playbook');
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'active': 'bg-green-900/20 text-green-400 border-green-500/50',
      'draft': 'bg-yellow-900/20 text-yellow-400 border-yellow-500/50',
      'deprecated': 'bg-red-900/20 text-red-400 border-red-500/50',
      'archived': 'bg-gray-900/20 text-gray-400 border-gray-500/50'
    };
    return colors[status] || 'bg-gray-900/20 text-gray-400 border-gray-500/50';
  };

  return (
    <div className="space-y-6">
      {/* Playbook Header Info */}
      <div className="card-glass p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Edit Playbook</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>ID: {playbook.id}</span>
              <span>Created: {formatDate(playbook.created_at)}</span>
              {playbook.updated_at && playbook.updated_at !== playbook.created_at && (
                <span>Updated: {formatDate(playbook.updated_at)}</span>
              )}
              <span>Version: {playbookData.version || '1.0'}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(playbookData.status)}`}>
              {playbookData.status?.charAt(0).toUpperCase() + playbookData.status?.slice(1)}
            </span>
            {hasChanges && (
              <span className="px-2 py-1 bg-orange-900/20 text-orange-400 text-xs rounded-full">
                Unsaved Changes
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="card-glass p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Playbook Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Playbook Name *
            </label>
            <input
              type="text"
              value={playbookData.name || ''}
              onChange={(e) => updatePlaybookData({ name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-cerberus-green focus:ring-1 focus:ring-cerberus-green"
              placeholder="Enter playbook name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Estimated Duration (minutes)
            </label>
            <input
              type="number"
              value={playbookData.estimated_duration_minutes || 60}
              onChange={(e) => updatePlaybookData({ estimated_duration_minutes: parseInt(e.target.value) || 60 })}
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-cerberus-green focus:ring-1 focus:ring-cerberus-green"
              min="1"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={playbookData.description || ''}
            onChange={(e) => updatePlaybookData({ description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-cerberus-green focus:ring-1 focus:ring-cerberus-green"
            placeholder="Describe the purpose and scope of this playbook"
          />
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
                className="inline-flex items-center px-3 py-1 bg-cerberus-green/20 text-cerberus-green text-sm rounded-full"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-2 text-cerberus-green/70 hover:text-cerberus-green"
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

      {/* Phases and Steps - Kanban Style */}
      <div className="card-glass p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Playbook Phases</h3>
            <p className="text-sm text-gray-400 mt-1">
              {(playbookData.playbook_definition?.phases || []).length} phases, {
                (playbookData.playbook_definition?.phases || []).reduce((total, phase) => total + (phase.steps?.length || 0), 0)
              } total steps
            </p>
          </div>
          <button
            onClick={addPhase}
            className="btn-primary flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Phase</span>
          </button>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {(playbookData.playbook_definition?.phases || []).map((phase, phaseIndex) => (
              <div key={phaseIndex} className="bg-gray-800/30 rounded-lg border border-gray-600/50">
                {/* Phase Header */}
                <div className="p-4 border-b border-gray-600/50">
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="text"
                      value={phase.title || ''}
                      onChange={(e) => updatePhase(phaseIndex, { title: e.target.value })}
                      className="text-lg font-semibold bg-transparent text-white border-none outline-none flex-1"
                      placeholder="Phase Title"
                    />
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
                        {(phase.steps || []).length} steps
                      </span>
                      <button
                        onClick={() => removePhase(phaseIndex)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Remove Phase"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={phase.description || ''}
                    onChange={(e) => updatePhase(phaseIndex, { description: e.target.value })}
                    placeholder="Phase description..."
                    className="w-full text-sm bg-transparent text-gray-300 border-none outline-none resize-none"
                    rows={2}
                  />
                </div>

                {/* Steps */}
                <Droppable droppableId={`phase-${phaseIndex}`}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="p-4 min-h-[200px]"
                    >
                      {(phase.steps || []).map((step, stepIndex) => (
                        <Draggable
                          key={stepIndex}
                          draggableId={`${phaseIndex}-${stepIndex}`}
                          index={stepIndex}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="mb-3 p-3 bg-gray-700/50 rounded-lg border border-gray-600/30 hover:border-cerberus-green/50 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-2 flex-1">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                    stepTypes.find(t => t.type === step.type)?.color || 'bg-gray-500'
                                  }`}>
                                    {stepTypes.find(t => t.type === step.type)?.icon || '?'}
                                  </span>
                                  <input
                                    type="text"
                                    value={step.title || ''}
                                    onChange={(e) => updateStep(phaseIndex, stepIndex, { title: e.target.value })}
                                    className="text-sm font-medium bg-transparent text-white border-none outline-none flex-1"
                                    placeholder="Step title"
                                  />
                                </div>
                                <button
                                  onClick={() => removeStep(phaseIndex, stepIndex)}
                                  className="text-red-400 hover:text-red-300 p-1"
                                  title="Remove Step"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                              
                              <select
                                value={step.type || 'manual_action'}
                                onChange={(e) => updateStep(phaseIndex, stepIndex, { type: e.target.value })}
                                className="w-full text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-300 mb-2"
                              >
                                {stepTypes.map(stepType => (
                                  <option key={stepType.type} value={stepType.type}>
                                    {stepType.label}
                                  </option>
                                ))}
                              </select>

                              <textarea
                                value={step.description || ''}
                                onChange={(e) => updateStep(phaseIndex, stepIndex, { description: e.target.value })}
                                placeholder="Step description..."
                                className="w-full text-xs bg-transparent text-gray-400 border-none outline-none resize-none"
                                rows={2}
                              />

                              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                                <label className="flex items-center space-x-1">
                                  <input
                                    type="checkbox"
                                    checked={step.required !== false}
                                    onChange={(e) => updateStep(phaseIndex, stepIndex, { required: e.target.checked })}
                                    className="rounded"
                                  />
                                  <span>Required</span>
                                </label>
                                <div className="flex items-center space-x-1">
                                  <span>⏱</span>
                                  <input
                                    type="number"
                                    value={step.estimated_minutes || 15}
                                    onChange={(e) => updateStep(phaseIndex, stepIndex, { estimated_minutes: parseInt(e.target.value) || 15 })}
                                    className="w-12 bg-transparent border-none outline-none text-center"
                                    min="1"
                                  />
                                  <span>min</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {/* Add Step Buttons */}
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        {stepTypes.slice(0, 4).map(stepType => (
                          <button
                            key={stepType.type}
                            onClick={() => addStep(phaseIndex, stepType.type)}
                            className="p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-600/30 hover:border-cerberus-green/50 transition-colors text-xs text-gray-300 flex items-center space-x-1"
                          >
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${stepType.color}`}>
                              {stepType.icon}
                            </span>
                            <span className="truncate">{stepType.label}</span>
                          </button>
                        ))}
                      </div>
                      
                      {stepTypes.length > 4 && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300 mb-2">
                            More step types...
                          </summary>
                          <div className="grid grid-cols-2 gap-2">
                            {stepTypes.slice(4).map(stepType => (
                              <button
                                key={stepType.type}
                                onClick={() => addStep(phaseIndex, stepType.type)}
                                className="p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-600/30 hover:border-cerberus-green/50 transition-colors text-xs text-gray-300 flex items-center space-x-1"
                              >
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${stepType.color}`}>
                                  {stepType.icon}
                                </span>
                                <span className="truncate">{stepType.label}</span>
                              </button>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>

        {(!playbookData.playbook_definition?.phases || playbookData.playbook_definition.phases.length === 0) && (
          <div className="text-center py-12 border-2 border-dashed border-gray-600 rounded-lg">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">No phases defined</h3>
            <p className="text-gray-400 mb-4">This playbook doesn't have any phases yet. Add the first phase to get started.</p>
            <button
              onClick={addPhase}
              className="btn-primary"
            >
              Add First Phase
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={onCancel}
            className="btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          {hasChanges && (
            <span className="text-sm text-orange-400 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              You have unsaved changes
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !playbookData.name?.trim()}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {saving && (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          <span>{saving ? 'Updating...' : 'Update Playbook'}</span>
        </button>
      </div>
    </div>
  );
};

export default PlaybookEditor;