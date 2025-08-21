import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const ReportTemplateEditor = ({ template, onSave, onBack }) => {
  const { user } = useAuth();
  const contentRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    author: '',
    content: '',
    version: '1.0',
    tags: [],
    incident_types: [],
    is_default: false,
    requires_approval: false,
    status: 'draft'
  });

  // Detected placeholders and variables
  const [detectedPlaceholders, setDetectedPlaceholders] = useState([]);
  const [contentStats, setContentStats] = useState({
    characters: 0,
    lines: 0,
    htmlTags: 0,
    cssRules: 0
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        author: template.author || user?.username || '',
        content: template.content || '',
        version: template.version || '1.0',
        tags: template.tag_list || [],
        incident_types: template.incident_type_list || [],
        is_default: template.is_default || false,
        requires_approval: template.requires_approval || false,
        status: template.status || 'draft'
      });
    } else {
      // Creating new template
      setFormData(prev => ({
        ...prev,
        author: user?.username || ''
      }));
    }
  }, [template, user]);

  useEffect(() => {
    // Analyze content for placeholders and stats
    analyzeContent(formData.content);
  }, [formData.content]);

  const analyzeContent = (content) => {
    if (!content) {
      setDetectedPlaceholders([]);
      setContentStats({ characters: 0, lines: 0, htmlTags: 0, cssRules: 0 });
      return;
    }

    // Detect Jinja placeholders
    const jinjaRegex = /\{\{[\s]*([^}]+?)[\s]*\}\}/g;
    const jinjaBlockRegex = /\{%[\s]*([^%]+?)[\s]*%\}/g;
    const placeholders = [];
    
    let match;
    while ((match = jinjaRegex.exec(content)) !== null) {
      const variable = match[1].trim().split('|')[0].trim(); // Remove filters
      if (!placeholders.some(p => p.name === variable)) {
        placeholders.push({
          name: variable,
          type: 'variable',
          usage: content.split(match[0]).length - 1,
          hasFilter: match[1].includes('|')
        });
      }
    }

    // Detect Jinja blocks (if, for, etc.)
    while ((match = jinjaBlockRegex.exec(content)) !== null) {
      const block = match[1].trim().split(' ')[0];
      if (!placeholders.some(p => p.name === block && p.type === 'block')) {
        placeholders.push({
          name: block,
          type: 'block',
          usage: content.split(match[0]).length - 1
        });
      }
    }

    setDetectedPlaceholders(placeholders);

    // Calculate content statistics
    const lines = content.split('\n').length;
    const htmlTags = (content.match(/<[^>]+>/g) || []).length;
    const cssRules = (content.match(/[^{}]+\{[^}]*\}/g) || []).length;

    setContentStats({
      characters: content.length,
      lines,
      htmlTags,
      cssRules
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleTagsChange = (value) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    handleInputChange('tags', tags);
  };

  const handleIncidentTypesChange = (value) => {
    const types = value.split(',').map(type => type.trim()).filter(type => type.length > 0);
    handleInputChange('incident_types', types);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (!formData.author.trim()) {
      newErrors.author = 'Author is required';
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

    try {
      setLoading(true);

      // Prepare payload matching backend schema
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        author: formData.author.trim(),
        content: formData.content.trim(),
        version: formData.version.trim(),
        tags: formData.tags.length > 0 ? formData.tags : null,
        incident_types: formData.incident_types.length > 0 ? formData.incident_types : null,
        is_default: formData.is_default,
        requires_approval: formData.requires_approval,
        status: formData.status
      };

      // API call (replace with actual service)
      if (template) {
        console.log('Updating template:', template.id, payload);
        // await ReportTemplateService.updateTemplate(template.id, payload);
      } else {
        console.log('Creating template:', payload);
        // await ReportTemplateService.createTemplate(payload);
      }

      onSave();
    } catch (error) {
      console.error('Error saving template:', error);
      setErrors({ submit: error.message || 'Failed to save template' });
    } finally {
      setLoading(false);
    }
  };

  const insertPlaceholder = (placeholder) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    const newText = before + `{{ ${placeholder} }}` + after;
    handleInputChange('content', newText);

    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length + 6, start + placeholder.length + 6);
    }, 0);
  };

  const getPlaceholderIcon = (type) => {
    if (type === 'block') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {template ? 'Edit Template' : 'Create Template'}
            </h1>
            <p className="text-gray-400">
              {template ? `Editing "${template.name}"` : 'Create a new report template'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full bg-gray-700 border ${errors.name ? 'border-red-500' : 'border-gray-600'} text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent`}
                    placeholder="e.g., Incident Summary Report"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Author *
                  </label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => handleInputChange('author', e.target.value)}
                    className={`w-full bg-gray-700 border ${errors.author ? 'border-red-500' : 'border-gray-600'} text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent`}
                    placeholder="Template author"
                  />
                  {errors.author && <p className="mt-1 text-sm text-red-400">{errors.author}</p>}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                  placeholder="Brief description of this template..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Version
                  </label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => handleInputChange('version', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                    placeholder="1.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_default}
                        onChange={(e) => handleInputChange('is_default', e.target.checked)}
                        className="rounded border-gray-600 bg-gray-700 text-cerberus-red focus:ring-cerberus-red focus:ring-offset-gray-800"
                      />
                      <span className="ml-2 text-sm text-gray-300">Default template</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.requires_approval}
                        onChange={(e) => handleInputChange('requires_approval', e.target.checked)}
                        className="rounded border-gray-600 bg-gray-700 text-cerberus-red focus:ring-cerberus-red focus:ring-offset-gray-800"
                      />
                      <span className="ml-2 text-sm text-gray-300">Requires approval</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Tags and Categories */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">Tags & Categories</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={formData.tags.join(', ')}
                    onChange={(e) => handleTagsChange(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                    placeholder="security, incident, weekly (comma-separated)"
                  />
                  <p className="mt-1 text-xs text-gray-500">Separate tags with commas</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Incident Types
                  </label>
                  <input
                    type="text"
                    value={formData.incident_types.join(', ')}
                    onChange={(e) => handleIncidentTypesChange(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent"
                    placeholder="malware, phishing, data breach (comma-separated)"
                  />
                  <p className="mt-1 text-xs text-gray-500">Applicable incident types</p>
                </div>
              </div>
            </div>

            {/* Template Content */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Template Content *</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <span>{contentStats.characters} chars</span>
                  <span>{contentStats.lines} lines</span>
                  {contentStats.htmlTags > 0 && <span>{contentStats.htmlTags} HTML tags</span>}
                  {contentStats.cssRules > 0 && <span>{contentStats.cssRules} CSS rules</span>}
                </div>
              </div>
              
              <div>
                <textarea
                  ref={contentRef}
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  rows={25}
                  className={`w-full bg-gray-700 border ${errors.content ? 'border-red-500' : 'border-gray-600'} text-white px-4 py-3 rounded-md focus:outline-none focus:ring-2 focus:ring-cerberus-red focus:border-transparent font-mono text-sm`}
                  placeholder="Enter your HTML/CSS template content here. Use {{ variable_name }} for dynamic placeholders..."
                />
                {errors.content && <p className="mt-1 text-sm text-red-400">{errors.content}</p>}
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
                <p>
                  Use Jinja2 syntax for dynamic content: 
                  <code className="ml-1 px-2 py-1 bg-gray-700 rounded text-cerberus-red">
                    &#123;&#123; variable_name &#125;&#125;
                  </code>
                </p>
                <button
                  type="button"
                  onClick={() => insertPlaceholder('incident.title')}
                  className="text-cerberus-red hover:text-red-400 transition-colors"
                >
                  Insert sample placeholder
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Detected Placeholders */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">Detected Placeholders</h3>
              
              {detectedPlaceholders.length === 0 ? (
                <p className="text-gray-400 text-sm">No placeholders detected</p>
              ) : (
                <div className="space-y-2">
                  {detectedPlaceholders.map((placeholder, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                      <div className="flex items-center space-x-2">
                        {getPlaceholderIcon(placeholder.type)}
                        <div>
                          <div className="text-sm font-medium text-white">
                            {placeholder.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {placeholder.type} • {placeholder.usage} use{placeholder.usage !== 1 ? 's' : ''}
                            {placeholder.hasFilter && ' • filtered'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Common Placeholders */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">Common Placeholders</h3>
              
              <div className="space-y-2">
                {[
                  'incident.title',
                  'incident.description',
                  'incident.severity',
                  'incident.status',
                  'incident.created_at',
                  'incident.assigned_to',
                  'alert.count',
                  'report.generated_at'
                ].map((placeholder) => (
                  <button
                    key={placeholder}
                    type="button"
                    onClick={() => insertPlaceholder(placeholder)}
                    className="w-full text-left p-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                  >
                    <code>&#123;&#123; {placeholder} &#125;&#125;</code>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">Preview</h3>
              <div className="bg-white rounded border p-4 max-h-64 overflow-y-auto">
                <div 
                  className="text-sm text-black"
                  dangerouslySetInnerHTML={{ 
                    __html: formData.content.replace(
                      /\{\{([^}]+)\}\}/g, 
                      '<span style="background: #fef3c7; color: #92400e; padding: 1px 4px; border-radius: 3px;">$1</span>'
                    )
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {errors.submit && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-300">{errors.submit}</span>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-cerberus-red hover:bg-red-700 text-white px-8 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              <span>{template ? 'Update Template' : 'Create Template'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ReportTemplateEditor;