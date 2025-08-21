import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import reportsAPI from '../../services/reports';
import LoadingSpinner from '../common/LoadingSpinner';

const ReportBuilder = ({ report, onSave, onCancel, onGenerate }) => {
  const { user } = useAuth();
  
  // Report data and elements
  const [reportData, setReportData] = useState(null);
  const [elements, setElements] = useState([]);
  const [buildingContext, setBuildingContext] = useState(null);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('executive_summary');
  
  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverSection, setDragOverSection] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState(null);
  
  // Editing State
  const [editingElement, setEditingElement] = useState(null);
  const [showElementModal, setShowElementModal] = useState(false);
  const [newElementData, setNewElementData] = useState({
    element_type: 'user_input',
    display_name: '',
    template_variable: '',
    element_data: {}
  });
  
  // Preview State
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  // Refs for scroll and positioning
  const sectionsRef = useRef({});
  const dropZoneRef = useRef(null);

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
      setElements(elementsResponse);
      setBuildingContext(contextResponse);
      
    } catch (err) {
      console.error('Failed to load report data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(reportData);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await onGenerate(report.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  // ============================================================================
  // DRAG AND DROP HANDLERS
  // ============================================================================

  const handleDragStart = (e, item, sourceType) => {
    setDraggedItem({
      ...item,
      sourceType // 'data_source' or 'existing_element'
    });
    
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', ''); // Required for some browsers
  };

  const handleDragOver = (e, sectionName, position = null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    setDragOverSection(sectionName);
    setDragOverPosition(position);
  };

  const handleDragLeave = (e) => {
    // Only clear if we're leaving the entire drop zone
    if (!dropZoneRef.current?.contains(e.relatedTarget)) {
      setDragOverSection(null);
      setDragOverPosition(null);
    }
  };

  const handleDrop = async (e, sectionName, position = null) => {
    e.preventDefault();
    
    if (!draggedItem) return;
    
    try {
      let elementData;
      
      if (draggedItem.sourceType === 'data_source') {
        // Create new element from data source
        elementData = {
          element_type: draggedItem.source_type,
          element_key: draggedItem.source_id,
          display_name: draggedItem.display_name,
          section_name: sectionName,
          position_order: position !== null ? position : getNextPositionInSection(sectionName),
          element_data: draggedItem.sample_value ? { value: draggedItem.sample_value } : {},
          template_variable: draggedItem.display_name.toLowerCase().replace(/\s+/g, '_')
        };
        
        const newElement = await reportsAPI.addReportElement(report.id, elementData);
        setElements(prev => [...prev, newElement]);
        
      } else if (draggedItem.sourceType === 'existing_element') {
        // Move existing element to new position
        const updatedElement = await reportsAPI.updateReportElement(
          report.id,
          draggedItem.id,
          {
            section_name: sectionName,
            position_order: position !== null ? position : getNextPositionInSection(sectionName)
          }
        );
        
        setElements(prev => prev.map(el => 
          el.id === draggedItem.id ? updatedElement : el
        ));
      }
      
      // Reorder elements in the target section
      await reorderSectionElements(sectionName);
      
    } catch (err) {
      console.error('Drop failed:', err);
      setError(err.message);
    } finally {
      setDraggedItem(null);
      setDragOverSection(null);
      setDragOverPosition(null);
    }
  };

  const getNextPositionInSection = (sectionName) => {
    const sectionElements = elements.filter(el => el.section_name === sectionName);
    return sectionElements.length > 0 ? Math.max(...sectionElements.map(el => el.position_order)) + 1 : 0;
  };

  const reorderSectionElements = async (sectionName) => {
    const sectionElements = elements
      .filter(el => el.section_name === sectionName)
      .sort((a, b) => a.position_order - b.position_order);
    
    const reorderPromises = sectionElements.map((element, index) => 
      reportsAPI.updateReportElement(report.id, element.id, { position_order: index })
    );
    
    await Promise.all(reorderPromises);
    await loadReportData(); // Refresh to get updated order
  };

  // ============================================================================
  // ELEMENT MANAGEMENT
  // ============================================================================

  const handleEditElement = (element) => {
    setEditingElement(element);
    setNewElementData({
      element_type: element.element_type,
      display_name: element.display_name,
      template_variable: element.template_variable || '',
      element_data: element.element_data || {}
    });
    setShowElementModal(true);
  };

  const handleDeleteElement = async (elementId) => {
    if (!confirm('Are you sure you want to delete this element?')) return;
    
    try {
      await reportsAPI.deleteReportElement(report.id, elementId);
      setElements(prev => prev.filter(el => el.id !== elementId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveElement = async () => {
    try {
      if (editingElement) {
        // Update existing element
        const updatedElement = await reportsAPI.updateReportElement(
          report.id,
          editingElement.id,
          newElementData
        );
        setElements(prev => prev.map(el => 
          el.id === editingElement.id ? updatedElement : el
        ));
      }
      
      setShowElementModal(false);
      setEditingElement(null);
      resetElementModal();
      
    } catch (err) {
      setError(err.message);
    }
  };

  const resetElementModal = () => {
    setNewElementData({
      element_type: 'user_input',
      display_name: '',
      template_variable: '',
      element_data: {}
    });
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getSectionElements = (sectionName) => {
    return elements
      .filter(el => el.section_name === sectionName)
      .sort((a, b) => a.position_order - b.position_order);
  };

  const getElementIcon = (elementType) => {
    const icons = {
      user_input: '📝',
      analytics: '📊',
      static_text: '📄',
      incident_data: '🔍'
    };
    return icons[elementType] || '📋';
  };

  const getElementTypeDisplay = (elementType) => {
    const displays = {
      user_input: 'User Input',
      analytics: 'Analytics',
      static_text: 'Static Text',
      incident_data: 'Incident Data'
    };
    return displays[elementType] || elementType;
  };

  const reportSections = [
    { id: 'executive_summary', name: 'Executive Summary', description: 'High-level overview' },
    { id: 'incident_details', name: 'Incident Details', description: 'Detailed information' },
    { id: 'timeline', name: 'Timeline', description: 'Chronological events' },
    { id: 'actions_taken', name: 'Actions Taken', description: 'Response procedures' },
    { id: 'user_inputs', name: 'User Inputs', description: 'Collected data' },
    { id: 'impact_assessment', name: 'Impact Assessment', description: 'Business impact analysis' },
    { id: 'recommendations', name: 'Recommendations', description: 'Lessons learned' },
    { id: 'artifacts', name: 'Artifacts', description: 'Evidence collected' }
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Report not found</p>
        <button onClick={onCancel} className="mt-4 text-cerberus-red hover:text-red-400">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">{reportData.title}</h1>
            <p className="text-gray-400 text-sm mt-1">Report Builder - Drag and drop elements to build your report</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || elements.length === 0}
              className="px-4 py-2 bg-cerberus-red hover:bg-red-600 text-white rounded transition-colors disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Report'}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

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

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Data Sources */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-medium text-white">Data Sources</h2>
            <p className="text-gray-400 text-sm mt-1">Drag elements into your report sections</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Available Data Sources */}
            {buildingContext?.data_sources && (
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Available Elements</h3>
                <div className="space-y-2">
                  {buildingContext.data_sources.map((dataSource, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={(e) => handleDragStart(e, dataSource, 'data_source')}
                      className="bg-gray-700 p-3 rounded-lg cursor-move hover:bg-gray-600 transition-colors border border-gray-600"
                    >
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getElementIcon(dataSource.source_type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {dataSource.display_name}
                          </p>
                          <p className="text-gray-400 text-xs truncate">
                            {getElementTypeDisplay(dataSource.source_type)}
                          </p>
                          {dataSource.description && (
                            <p className="text-gray-500 text-xs mt-1 truncate">
                              {dataSource.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Analytics */}
            {buildingContext?.available_analytics && buildingContext.available_analytics.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Analytics</h3>
                <div className="space-y-2">
                  {buildingContext.available_analytics.map((analytics, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={(e) => handleDragStart(e, {
                        source_type: 'analytics',
                        source_id: analytics.metric,
                        display_name: analytics.display_name,
                        sample_value: analytics.value
                      }, 'data_source')}
                      className="bg-gray-700 p-3 rounded-lg cursor-move hover:bg-gray-600 transition-colors border border-gray-600"
                    >
                      <div className="flex items-center">
                        <span className="text-lg mr-2">📊</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {analytics.display_name}
                          </p>
                          <p className="text-gray-400 text-xs">
                            Value: {analytics.value}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available User Inputs */}
            {buildingContext?.available_user_inputs && buildingContext.available_user_inputs.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">User Inputs</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {buildingContext.available_user_inputs.map((input, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={(e) => handleDragStart(e, {
                        source_type: 'user_input',
                        source_id: `input_${input.id}`,
                        display_name: input.input_label || input.field_name,
                        sample_value: JSON.stringify(input.user_input),
                        execution_id: input.execution_id,
                        field_name: input.field_name
                      }, 'data_source')}
                      className="bg-gray-700 p-3 rounded-lg cursor-move hover:bg-gray-600 transition-colors border border-gray-600"
                    >
                      <div className="flex items-center">
                        <span className="text-lg mr-2">📝</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {input.input_label || input.field_name}
                          </p>
                          <p className="text-gray-400 text-xs truncate">
                            {input.phase_name} → {input.step_name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Report Builder Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Section Navigation */}
          <div className="bg-gray-750 border-b border-gray-700 px-6 py-3">
            <div className="flex space-x-1 overflow-x-auto">
              {reportSections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    activeSection === section.id
                      ? 'bg-cerberus-red text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {section.name}
                </button>
              ))}
            </div>
          </div>

          {/* Report Section Content */}
          <div
            ref={dropZoneRef}
            className="flex-1 overflow-y-auto p-6"
            onDragOver={(e) => handleDragOver(e, activeSection)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, activeSection)}
          >
            <div className="max-w-4xl mx-auto">
              {/* Section Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {reportSections.find(s => s.id === activeSection)?.name}
                </h2>
                <p className="text-gray-400 mt-1">
                  {reportSections.find(s => s.id === activeSection)?.description}
                </p>
              </div>

              {/* Drop Zone */}
              <div className={`min-h-96 rounded-lg border-2 border-dashed transition-colors ${
                dragOverSection === activeSection
                  ? 'border-cerberus-red bg-red-900/10'
                  : 'border-gray-600'
              }`}>
                {/* Existing Elements */}
                <div className="p-4 space-y-4">
                  {getSectionElements(activeSection).map((element, index) => (
                    <div
                      key={element.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, element, 'existing_element')}
                      className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{getElementIcon(element.element_type)}</span>
                          <div>
                            <h4 className="text-white font-medium">{element.display_name}</h4>
                            <p className="text-gray-400 text-sm">
                              {getElementTypeDisplay(element.element_type)}
                              {element.template_variable && (
                                <span className="ml-2 text-cerberus-red">
                                  {`{{${element.template_variable}}}`}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditElement(element)}
                            className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                            title="Edit Element"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteElement(element.id)}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete Element"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* Element Preview */}
                      {element.element_data && (
                        <div className="mt-3 p-3 bg-gray-750 rounded text-sm">
                          <p className="text-gray-300">
                            <strong>Data:</strong> {JSON.stringify(element.element_data, null, 2)}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Empty State */}
                  {getSectionElements(activeSection).length === 0 && (
                    <div className="text-center py-12">
                      <div className="text-gray-500 mb-4">
                        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p>No elements in this section yet</p>
                        <p className="text-sm">Drag elements from the sidebar to add content</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Preview (Optional) */}
        {showPreview && (
          <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-medium text-white">Live Preview</h2>
              <p className="text-gray-400 text-sm mt-1">Preview of current section</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-white text-black p-4 rounded-lg text-sm">
                <h3 className="font-bold mb-3">
                  {reportSections.find(s => s.id === activeSection)?.name}
                </h3>
                
                {getSectionElements(activeSection).map(element => (
                  <div key={element.id} className="mb-3 p-2 border-l-2 border-blue-500 bg-blue-50">
                    <strong>{element.display_name}:</strong>
                    <br />
                    <span className="text-gray-700">
                      {element.element_data?.value || '[Dynamic Content]'}
                    </span>
                  </div>
                ))}
                
                {getSectionElements(activeSection).length === 0 && (
                  <p className="text-gray-500 italic">No content added yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Element Edit Modal */}
      {showElementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">
                {editingElement ? 'Edit Element' : 'Add Element'}
              </h3>
              <button
                onClick={() => {
                  setShowElementModal(false);
                  setEditingElement(null);
                  resetElementModal();
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newElementData.display_name}
                  onChange={(e) => setNewElementData(prev => ({
                    ...prev,
                    display_name: e.target.value
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Template Variable
                </label>
                <input
                  type="text"
                  value={newElementData.template_variable}
                  onChange={(e) => setNewElementData(prev => ({
                    ...prev,
                    template_variable: e.target.value
                  }))}
                  placeholder="variable_name"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                />
                <p className="text-gray-400 text-xs mt-1">
                  Will be used as {`{{${newElementData.template_variable || 'variable_name'}}}`} in the template
                </p>
              </div>
              
              {newElementData.element_type === 'static_text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Content
                  </label>
                  <textarea
                    value={newElementData.element_data.content || ''}
                    onChange={(e) => setNewElementData(prev => ({
                      ...prev,
                      element_data: {
                        ...prev.element_data,
                        content: e.target.value
                      }
                    }))}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                    placeholder="Enter static text content..."
                  />
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowElementModal(false);
                  setEditingElement(null);
                  resetElementModal();
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveElement}
                className="px-4 py-2 bg-cerberus-red hover:bg-red-600 text-white rounded transition-colors"
              >
                Save Element
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportBuilder;