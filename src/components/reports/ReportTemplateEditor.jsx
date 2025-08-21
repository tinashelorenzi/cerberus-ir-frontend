import { useState, useEffect } from 'react';

const ReportTemplateEditor = ({ template, onSave, onBack }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'incident',
    status: 'draft',
    content: '',
    variables: []
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        category: template.category || 'incident',
        status: template.status || 'draft',
        content: template.content || '',
        variables: template.variables || []
      });
    }
  }, [template]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'Template content is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    try {
      // Mock save - replace with actual API call
      console.log('Updating template:', { id: template.id, ...formData });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSave();
    } catch (error) {
      console.error('Error updating template:', error);
      setErrors({ submit: 'Failed to update template. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const addVariable = () => {
    setFormData(prev => ({
      ...prev,
      variables: [...prev.variables, { name: '', type: 'text', description: '' }]
    }));
  };

  const removeVariable = (index) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index)
    }));
  };

  const updateVariable = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.map((variable, i) => 
        i === index ? { ...variable, [field]: value } : variable
      )
    }));
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Edit Report Template</h2>
          <p className="text-gray-400 mt-1">Modify the template: {template.name}</p>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
            <span>ID: {template.id}</span>
            <span>Created: {formatDate(template.created_at)}</span>
            <span>Updated: {formatDate(template.updated_at)}</span>
          </div>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 rounded-md text-sm transition-colors"
        >
          Back to List
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">Basic Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full bg-gray-700 border ${errors.name ? 'border-red-500' : 'border-gray-600'} text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent`}
                    placeholder="Enter template name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-400">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className={`w-full bg-gray-700 border ${errors.description ? 'border-red-500' : 'border-gray-600'} text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent`}
                    placeholder="Describe the purpose and content of this template"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-400">{errors.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                    >
                      <option value="incident">Incident Reports</option>
                      <option value="weekly">Weekly Reports</option>
                      <option value="monthly">Monthly Reports</option>
                      <option value="threat">Threat Intelligence</option>
                      <option value="compliance">Compliance Reports</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Template Variables */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Template Variables</h3>
                <button
                  type="button"
                  onClick={addVariable}
                  className="px-3 py-1 bg-cerberus-red hover:bg-red-700 text-white rounded-md text-sm transition-colors"
                >
                  Add Variable
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.variables.map((variable, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-md">
                    <input
                      type="text"
                      value={variable.name}
                      onChange={(e) => updateVariable(index, 'name', e.target.value)}
                      placeholder="Variable name"
                      className="flex-1 bg-gray-600 border border-gray-500 text-white px-3 py-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cerberus-red"
                    />
                    <select
                      value={variable.type}
                      onChange={(e) => updateVariable(index, 'type', e.target.value)}
                      className="bg-gray-600 border border-gray-500 text-white px-3 py-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cerberus-red"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="select">Select</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeVariable(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                
                {formData.variables.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-4">
                    No variables defined. Add variables to make your template dynamic.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Template Content */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-4">Template Content *</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Report Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                rows={20}
                className={`w-full bg-gray-700 border ${errors.content ? 'border-red-500' : 'border-gray-600'} text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent font-mono text-sm`}
                placeholder={`# Report Template

## Executive Summary
[Enter executive summary here]

## Incident Details
- **Incident ID**: {{incident_id}}
- **Date**: {{date}}
- **Severity**: {{severity}}

## Analysis
[Enter analysis details]

## Recommendations
[Enter recommendations]

## Conclusion
[Enter conclusion]`}
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-400">{errors.content}</p>
              )}
            </div>

            <div className="mt-4 p-3 bg-gray-700 rounded-md">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Template Tips:</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Use {{variable_name}} syntax to insert dynamic variables</li>
                <li>• Markdown formatting is supported</li>
                <li>• Include placeholders for common report sections</li>
                <li>• Keep content professional and structured</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {errors.submit && (
          <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-300">{errors.submit}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-cerberus-red hover:bg-red-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Update Template'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportTemplateEditor;
