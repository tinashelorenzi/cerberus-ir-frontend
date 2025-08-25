import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import reportsAPI from '../../services/reports';
import LoadingSpinner from '../common/LoadingSpinner';

const ReportBuilder = ({ report, onSave, onCancel, onGenerate }) => {
  const { user } = useAuth();
  
  // Report data and context
  const [reportData, setReportData] = useState(null);
  const [template, setTemplate] = useState(null);
  const [buildingContext, setBuildingContext] = useState(null);
  const [existingElements, setExistingElements] = useState([]);
  
  // Template analysis
  const [detectedPlaceholders, setDetectedPlaceholders] = useState([]);
  const [elementMappings, setElementMappings] = useState({});
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [error, setError] = useState(null);
  
  // Drag and Drop
  const [draggedItem, setDraggedItem] = useState(null);
  
  // Custom input modal
  const [showCustomInputModal, setShowCustomInputModal] = useState(false);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState(null);
  const [customInputValue, setCustomInputValue] = useState('');

  // Load data on component mount
  useEffect(() => {
    if (report) {
      loadReportData();
    }
  }, [report]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load report details, elements, and building context in parallel
      const [reportResponse, elementsResponse, contextResponse] = await Promise.all([
        reportsAPI.getReport(report.id),
        reportsAPI.getReportElements(report.id),
        reportsAPI.getBuildingContext(report.id)
      ]);
      
      setReportData(reportResponse);
      setExistingElements(elementsResponse);
      setBuildingContext(contextResponse);
      
      // Set template from report
      if (reportResponse.template) {
        setTemplate(reportResponse.template);
      }
      
      // Build existing mappings from elements
      const mappings = {};
      elementsResponse.forEach(element => {
        if (element.template_variable) {
          mappings[element.template_variable] = {
            elementId: element.id,
            recordType: element.element_type,
            displayName: element.display_name,
            value: element.element_data?.value || element.element_data?.content || element.element_data?.user_input || '[No Value]'
          };
        }
      });
      setElementMappings(mappings);
      
    } catch (err) {
      console.error('Failed to load report data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Analyze template content for Jinja placeholders
  useEffect(() => {
    if (template?.content) {
      analyzeTemplate(template.content);
    }
  }, [template, elementMappings]);

  const analyzeTemplate = (content) => {
    const jinjaRegex = /\{\{[\s]*([^}]+?)[\s]*\}\}/g;
    const placeholders = [];
    let match;

    while ((match = jinjaRegex.exec(content)) !== null) {
      const variable = match[1].trim().split('|')[0].trim(); // Remove filters
      const startIndex = match.index;
      const endIndex = match.index + match[0].length;
      
      if (!placeholders.some(p => p.variable === variable)) {
        placeholders.push({
          id: `placeholder_${placeholders.length}`,
          variable,
          fullMatch: match[0],
          startIndex,
          endIndex,
          mapped: !!elementMappings[variable]
        });
      }
    }
    
    setDetectedPlaceholders(placeholders);
  };

  // Fill remaining placeholders with N/A
  const fillRemainingWithNA = async () => {
    try {
      const unmappedPlaceholders = detectedPlaceholders.filter(
        placeholder => !elementMappings[placeholder.variable]
      );

      if (unmappedPlaceholders.length === 0) {
        return; // No unmapped placeholders
      }

      // Create elements for all unmapped placeholders
      const elementPromises = unmappedPlaceholders.map(async (placeholder) => {
        const elementData = {
          element_type: 'user_input',
          element_key: `na_${placeholder.variable}`,
          display_name: `N/A: ${placeholder.variable}`,
          template_variable: placeholder.variable,
          element_data: { value: 'N/A' },
          section_name: 'main',
          position_order: 0
        };

        return await reportsAPI.addReportElement(report.id, elementData);
      });

      const newElements = await Promise.all(elementPromises);

      // Update local state
      const newMappings = { ...elementMappings };
      unmappedPlaceholders.forEach((placeholder, index) => {
        newMappings[placeholder.variable] = {
          elementId: newElements[index].id,
          recordType: 'user_input',
          displayName: `N/A: ${placeholder.variable}`,
          value: 'N/A'
        };
      });

      setElementMappings(newMappings);
    } catch (err) {
      console.error('Failed to fill placeholders with N/A:', err);
      setError(err.message);
    }
  };

  // Drag handlers
  const handleDragStart = (e, item, sourceType) => {
    setDraggedItem({
      ...item,
      sourceType // 'data_source', 'user_input', 'analytics'
    });
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e, placeholder) => {
    e.preventDefault();
    
    if (!draggedItem || !placeholder) return;
    
    try {
      let elementData;
      
      // Prepare element data based on source type
      if (draggedItem.sourceType === 'data_source') {
        elementData = {
          element_type: draggedItem.source_type,
          element_key: draggedItem.source_id,
          display_name: draggedItem.display_name,
          template_variable: placeholder.variable,
          element_data: draggedItem.sample_value ? { value: draggedItem.sample_value } : {},
          section_name: 'main', // Default section
          position_order: 0
        };
      } else if (draggedItem.sourceType === 'user_input') {
        elementData = {
          element_type: 'user_input',
          element_key: `input_${draggedItem.id}`,
          display_name: draggedItem.input_label || draggedItem.field_name,
          template_variable: placeholder.variable,
          element_data: { 
            execution_id: draggedItem.execution_id,
            field_name: draggedItem.field_name,
            value: draggedItem.user_input 
          },
          section_name: 'main',
          position_order: 0
        };
      } else if (draggedItem.sourceType === 'analytics') {
        elementData = {
          element_type: 'analytics',
          element_key: draggedItem.metric,
          display_name: draggedItem.display_name,
          template_variable: placeholder.variable,
          element_data: { 
            metric_type: draggedItem.metric,
            value: draggedItem.value 
          },
          section_name: 'main',
          position_order: 0
        };
      }
      
      // Check if placeholder is already mapped
      if (elementMappings[placeholder.variable]) {
        // Update existing element
        const existingMapping = elementMappings[placeholder.variable];
        await reportsAPI.updateReportElement(
          report.id,
          existingMapping.elementId,
          elementData
        );
      } else {
        // Create new element
        const newElement = await reportsAPI.addReportElement(report.id, elementData);
        elementData.id = newElement.id;
      }
      
      // Update local state
      setElementMappings(prev => ({
        ...prev,
        [placeholder.variable]: {
          elementId: elementData.id,
          recordType: elementData.element_type,
          displayName: elementData.display_name,
          value: elementData.element_data?.value || elementData.element_data?.user_input || '[No Value]'
        }
      }));
      
    } catch (err) {
      console.error('Drop failed:', err);
      setError(err.message);
    }
    
    setDraggedItem(null);
  };

  // Handle custom input
  const handleCustomInput = (placeholder) => {
    setSelectedPlaceholder(placeholder);
    setCustomInputValue(elementMappings[placeholder.variable]?.value || '');
    setShowCustomInputModal(true);
  };

  const saveCustomInput = async () => {
    if (!selectedPlaceholder || !customInputValue.trim()) return;
    
    try {
      const elementData = {
        element_type: 'user_input',
        element_key: `custom_${selectedPlaceholder.variable}`,
        display_name: `Custom: ${selectedPlaceholder.variable}`,
        template_variable: selectedPlaceholder.variable,
        element_data: { value: customInputValue.trim() },
        section_name: 'main',
        position_order: 0
      };
      
      if (elementMappings[selectedPlaceholder.variable]) {
        // Update existing
        const existingMapping = elementMappings[selectedPlaceholder.variable];
        await reportsAPI.updateReportElement(
          report.id,
          existingMapping.elementId,
          elementData
        );
      } else {
        // Create new
        const newElement = await reportsAPI.addReportElement(report.id, elementData);
        elementData.id = newElement.id;
      }
      
      // Update local state
      setElementMappings(prev => ({
        ...prev,
        [selectedPlaceholder.variable]: {
          elementId: elementData.id,
          recordType: 'user_input',
          displayName: elementData.display_name,
          value: customInputValue.trim()
        }
      }));
      
      setShowCustomInputModal(false);
      setSelectedPlaceholder(null);
      setCustomInputValue('');
      
    } catch (err) {
      console.error('Failed to save custom input:', err);
      setError(err.message);
    }
  };

  // Remove mapping
  const removeMapping = async (variable) => {
    try {
      const mapping = elementMappings[variable];
      if (mapping?.elementId) {
        await reportsAPI.deleteReportElement(report.id, mapping.elementId);
      }
      
      setElementMappings(prev => {
        const newMappings = { ...prev };
        delete newMappings[variable];
        return newMappings;
      });
    } catch (err) {
      console.error('Failed to remove mapping:', err);
      setError(err.message);
    }
  };

  // Generate preview content
  const generatePreview = () => {
    if (!template?.content) return 'No template content available';
    
    let preview = template.content;
    
    // Replace mapped placeholders
    Object.entries(elementMappings).forEach(([variable, mapping]) => {
      const placeholder = `{{ ${variable} }}`;
      preview = preview.replaceAll(placeholder, mapping.value || `[${mapping.displayName}]`);
    });
    
    // Replace unmapped placeholders with [UNMAPPED] indicator
    detectedPlaceholders.forEach(placeholder => {
      if (!elementMappings[placeholder.variable]) {
        preview = preview.replaceAll(placeholder.fullMatch, `[UNMAPPED: ${placeholder.variable}]`);
      }
    });
    
    return preview;
  };

  // Convert markdown/plain text to HTML for rendering
  const renderPreviewContent = (content) => {
    // Simple markdown to HTML conversion
    let html = content
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 rounded mb-3 overflow-x-auto"><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')
      // Lists
      .replace(/^\* (.*$)/gim, '<li class="mb-1">$1</li>')
      .replace(/^- (.*$)/gim, '<li class="mb-1">$1</li>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p class="mb-3">')
      // Line breaks
      .replace(/\n/g, '<br>');

    // Wrap in paragraph tags if not already wrapped
    if (!html.startsWith('<')) {
      html = `<p class="mb-3">${html}</p>`;
    }

    return html;
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'incident_data': return '🔍';
      case 'user_input': return '✏️';
      case 'analytics': return '📊';
      case 'playbook_data': return '📋';
      default: return '📄';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'incident_data': return 'bg-blue-500';
      case 'user_input': return 'bg-green-500';
      case 'analytics': return 'bg-purple-500';
      case 'playbook_data': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">Error: {error}</p>
        <button onClick={onCancel} className="text-cerberus-red hover:text-red-400">
          Go Back
        </button>
      </div>
    );
  }

  if (!reportData || !template) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">No report or template found</p>
        <button onClick={onCancel} className="text-cerberus-red hover:text-red-400">
          Go Back
        </button>
      </div>
    );
  }

  const unmappedCount = detectedPlaceholders.length - Object.keys(elementMappings).length;

  return (
    <div className="h-screen flex bg-gray-900 text-white">
      {/* Left Sidebar - Available Data Sources */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="mr-2">📦</span>
          Available Data Sources
        </h3>
        
        {/* Data Sources */}
        {buildingContext?.data_sources && buildingContext.data_sources.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Data Sources</h4>
            <div className="space-y-2">
              {buildingContext.data_sources.map((dataSource, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, dataSource, 'data_source')}
                  className="p-3 rounded-lg border border-gray-600 bg-gray-700 cursor-move transition-all hover:bg-gray-600 hover:shadow-lg"
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getTypeColor(dataSource.source_type)}`} />
                    <span className="text-lg">{getTypeIcon(dataSource.source_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{dataSource.display_name}</p>
                      <p className="text-xs text-gray-400 capitalize">{dataSource.source_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  {dataSource.sample_value && (
                    <div className="mt-2 text-xs text-gray-300 bg-gray-800 px-2 py-1 rounded max-h-20 overflow-y-auto">
                      {dataSource.sample_value}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Inputs */}
        {buildingContext?.available_user_inputs && buildingContext.available_user_inputs.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-300 mb-3">User Inputs</h4>
            <div className="space-y-2">
              {buildingContext.available_user_inputs.map((userInput) => (
                <div
                  key={userInput.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, userInput, 'user_input')}
                  className="p-3 rounded-lg border border-gray-600 bg-gray-700 cursor-move transition-all hover:bg-gray-600 hover:shadow-lg"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-lg">✏️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{userInput.input_label || userInput.field_name}</p>
                      <p className="text-xs text-gray-400">{userInput.phase_name} - {userInput.step_name}</p>
                    </div>
                  </div>
                  {userInput.user_input && (
                    <div className="mt-2 text-xs text-gray-300 bg-gray-800 px-2 py-1 rounded max-h-20 overflow-y-auto">
                      {userInput.user_input}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics */}
        {buildingContext?.available_analytics && buildingContext.available_analytics.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Analytics</h4>
            <div className="space-y-2">
              {buildingContext.available_analytics.map((analytic, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, analytic, 'analytics')}
                  className="p-3 rounded-lg border border-gray-600 bg-gray-700 cursor-move transition-all hover:bg-gray-600 hover:shadow-lg"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="text-lg">📊</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{analytic.display_name}</p>
                      <p className="text-xs text-gray-400">{analytic.description}</p>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-300 bg-gray-800 px-2 py-1 rounded">
                    Value: {analytic.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <h4 className="text-sm font-medium text-blue-400 mb-2">💡 How to Use</h4>
          <ul className="text-xs text-gray-300 space-y-1">
            <li>• Drag data records to placeholders</li>
            <li>• Red placeholders are unmapped</li>
            <li>• Green placeholders are mapped</li>
            <li>• Click placeholders for custom input</li>
            <li>• Use Preview mode to see results</li>
          </ul>
        </div>
      </div>

      {/* Center - Template with Placeholders */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📝</span>
              <div>
                <h2 className="text-xl font-semibold">{reportData.title}</h2>
                <p className="text-sm text-gray-400">Template: {template.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-400">
                Mapped: <span className="text-green-400">{Object.keys(elementMappings).length}</span> / 
                <span className="text-gray-300"> {detectedPlaceholders.length}</span>
              </div>
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  previewMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <span>{previewMode ? '✏️' : '👁️'}</span>
                <span>{previewMode ? 'Edit Mode' : 'Preview Mode'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Template Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {previewMode ? (
            <div className="bg-white text-black p-8 rounded-lg shadow-lg">
              <div className="prose prose-sm max-w-none">
                <div 
                  className="font-sans text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: renderPreviewContent(generatePreview()) 
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm text-gray-400 mb-4">
                <span className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-red-500 rounded"></span>
                  <span>Unmapped</span>
                </span>
                <span className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-green-500 rounded"></span>
                  <span>Mapped</span>
                </span>
                <span className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-blue-500 rounded"></span>
                  <span>Drop Zone Active</span>
                </span>
              </div>
              
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <div className="font-mono text-sm whitespace-pre-wrap leading-relaxed">
                  {template.content.split(/(\{\{[^}]+\}\})/).map((part, index) => {
                    const isPlaceholder = part.match(/\{\{([^}]+)\}\}/);
                    
                    if (isPlaceholder) {
                      const variable = isPlaceholder[1].trim();
                      const mapping = elementMappings[variable];
                      
                      return (
                        <span
                          key={index}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, { variable })}
                          onClick={() => handleCustomInput({ variable })}
                          className={`inline-block px-3 py-2 mx-1 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
                            mapping
                              ? 'border-green-500 bg-green-900/20 text-green-300 hover:bg-green-900/30'
                              : 'border-red-500 bg-red-900/20 text-red-300 hover:border-red-400 hover:bg-red-900/30'
                          }`}
                          title={mapping 
                            ? `Mapped to: ${mapping.displayName}\nClick to edit or drag new data here` 
                            : `Unmapped placeholder: ${variable}\nDrop data here or click for custom input`
                          }
                        >
                          {mapping ? (
                            <span className="flex items-center space-x-2">
                              <span className="text-green-400 font-medium">{mapping.displayName}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeMapping(variable);
                                }}
                                className="text-red-400 hover:text-red-300 font-bold text-lg leading-none"
                                title="Remove mapping"
                              >
                                ×
                              </button>
                            </span>
                          ) : (
                            <span className="text-red-400 flex items-center space-x-1">
                              <span>{part}</span>
                              <span className="text-xs opacity-60">📝</span>
                            </span>
                          )}
                        </span>
                      );
                    }
                    
                    return <span key={index}>{part}</span>;
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Mapping Summary and Actions */}
      <div className="w-80 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="mr-2">🎯</span>
          Placeholder Mappings
        </h3>
        
        <div className="space-y-3">
          {detectedPlaceholders.map((placeholder) => {
            const mapping = elementMappings[placeholder.variable];
            return (
              <div key={placeholder.id} className="bg-gray-700 p-3 rounded-lg border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm text-blue-400 bg-gray-800 px-2 py-1 rounded">
                    {placeholder.fullMatch}
                  </code>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleCustomInput(placeholder)}
                      className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 rounded bg-blue-900/20 hover:bg-blue-900/40 transition-colors"
                      title="Custom input"
                    >
                      ✏️
                    </button>
                    {mapping && (
                      <button
                        onClick={() => removeMapping(placeholder.variable)}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded bg-red-900/20 hover:bg-red-900/40 transition-colors"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
                
                {mapping ? (
                  <div className="text-sm">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`w-3 h-3 rounded-full ${getTypeColor(mapping.recordType)}`} />
                      <span className="text-green-400 font-medium">{mapping.displayName}</span>
                    </div>
                    <div className="text-gray-400 text-xs mb-2 capitalize">
                      Type: {mapping.recordType.replace('_', ' ')}
                    </div>
                    <div className="text-gray-300 text-xs bg-gray-800 px-2 py-1 rounded max-h-16 overflow-y-auto">
                      {mapping.value}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-red-400 text-sm">
                    <span>⚠️</span>
                    <span>Click to add custom input</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {detectedPlaceholders.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <span className="text-4xl mb-2 block">📄</span>
            <p className="text-sm">No placeholders detected</p>
            <p className="text-xs mt-1">Template may not contain Jinja placeholders</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-gray-700 space-y-3">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Progress</span>
              <span>{Object.keys(elementMappings).length} / {detectedPlaceholders.length}</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: detectedPlaceholders.length > 0 
                    ? `${(Object.keys(elementMappings).length / detectedPlaceholders.length) * 100}%` 
                    : '0%' 
                }}
              />
            </div>
          </div>

          {/* Fill N/A Button */}
          {unmappedCount > 0 && (
            <button
              onClick={fillRemainingWithNA}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              title={`Fill ${unmappedCount} unmapped placeholder${unmappedCount !== 1 ? 's' : ''} with "N/A"`}
            >
              <span>⚠️</span>
              <span>Fill {unmappedCount} with N/A</span>
            </button>
          )}

          <button
            onClick={onCancel}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <span>←</span>
            <span>Back to Reports</span>
          </button>

          <button
            onClick={() => {
              setSaving(true);
              onSave?.(reportData).finally(() => setSaving(false));
            }}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <span>💾</span>
            <span>{saving ? 'Saving...' : 'Save Progress'}</span>
          </button>

          <button
            onClick={() => onGenerate?.(report.id)}
            className={`w-full py-3 px-4 rounded-lg transition-colors font-medium flex items-center justify-center space-x-2 ${
              Object.keys(elementMappings).length === detectedPlaceholders.length && detectedPlaceholders.length > 0
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
            disabled={Object.keys(elementMappings).length !== detectedPlaceholders.length || detectedPlaceholders.length === 0}
          >
            <span>🚀</span>
            <span>
              {Object.keys(elementMappings).length === detectedPlaceholders.length && detectedPlaceholders.length > 0
                ? 'Generate Report'
                : `Map ${detectedPlaceholders.length - Object.keys(elementMappings).length} more placeholder${detectedPlaceholders.length - Object.keys(elementMappings).length !== 1 ? 's' : ''}`
              }
            </span>
          </button>
        </div>
      </div>

      {/* Custom Input Modal */}
      {showCustomInputModal && selectedPlaceholder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Custom Input for {selectedPlaceholder.variable}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Value
              </label>
              <textarea
                value={customInputValue}
                onChange={(e) => setCustomInputValue(e.target.value)}
                placeholder={`Enter value for ${selectedPlaceholder.variable}`}
                rows={4}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                This will be used as the value for <code className="bg-gray-700 px-1 rounded">{`{{ ${selectedPlaceholder.variable} }}`}</code>
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCustomInputModal(false);
                  setSelectedPlaceholder(null);
                  setCustomInputValue('');
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveCustomInput}
                disabled={!customInputValue.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Input
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportBuilder;