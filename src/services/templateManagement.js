import config from '../config/env.js';

class ReportTemplateAPI {
  constructor() {
    this.baseURL = config.API_BASE_URL;
  }

  // Helper method to get auth headers
  getAuthHeaders() {
    const token = localStorage.getItem(config.STORAGE_KEYS.ACCESS_TOKEN);
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Handle API responses
  async handleResponse(response) {
    if (response.status === 401) {
      // Token expired, redirect to login
      localStorage.clear();
      window.location.reload();
      return;
    }
    
    if (!response.ok) {
      try {
        const error = await response.json();
        // Handle different error response formats
        let errorMessage = 'API request failed';
        
        if (error.detail) {
          // FastAPI validation error format
          if (Array.isArray(error.detail)) {
            errorMessage = error.detail.map(e => `${e.loc?.join('.')}: ${e.msg}`).join(', ');
          } else if (typeof error.detail === 'string') {
            errorMessage = error.detail;
          }
        } else if (error.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        
        throw new Error(errorMessage);
      } catch (jsonError) {
        // If JSON parsing fails, use status text
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
    }
    
    return response.json();
  }

  // List report templates with pagination and filtering
  async getTemplates(params = {}) {
    const searchParams = new URLSearchParams();
    
    // Add pagination params
    if (params.page) searchParams.append('page', params.page);
    if (params.limit) searchParams.append('limit', params.limit);
    
    // Add filter params
    if (params.search) searchParams.append('search', params.search);
    if (params.status) searchParams.append('status', params.status);
    if (params.author) searchParams.append('author', params.author);
    if (params.is_default !== undefined) searchParams.append('is_default', params.is_default);
    
    // Add sorting params
    if (params.sort_by) searchParams.append('sort_by', params.sort_by);
    if (params.sort_order) searchParams.append('sort_order', params.sort_order);

    console.log("Fetching templates from fastAPI backnd");
    const response = await fetch(
      `${this.baseURL}/api/v1/report-templates?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  // Get a specific report template by ID
  async getTemplate(templateId) {
    const response = await fetch(
      `${this.baseURL}/api/v1/report-templates/${templateId}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  // Create a new report template
  async createTemplate(templateData) {
    // Ensure proper data structure matching backend schema
    const payload = {
      name: templateData.name,
      description: templateData.description || '',
      author: templateData.author,
      content: templateData.content,
      version: templateData.version || '1.0',
      tags: templateData.tags && templateData.tags.length > 0 ? templateData.tags : null,
      incident_types: templateData.incident_types && templateData.incident_types.length > 0 ? templateData.incident_types : null,
      is_default: templateData.is_default || false,
      requires_approval: templateData.requires_approval || false
    };

    const response = await fetch(
      `${this.baseURL}/api/v1/report-templates`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload)
      }
    );

    return this.handleResponse(response);
  }

  // Update an existing report template
  async updateTemplate(templateId, templateData) {
    // Prepare update payload - only include non-null values
    const payload = {};
    
    if (templateData.name !== undefined) payload.name = templateData.name;
    if (templateData.description !== undefined) payload.description = templateData.description;
    if (templateData.author !== undefined) payload.author = templateData.author;
    if (templateData.content !== undefined) payload.content = templateData.content;
    if (templateData.version !== undefined) payload.version = templateData.version;
    if (templateData.tags !== undefined) {
      payload.tags = templateData.tags && templateData.tags.length > 0 ? templateData.tags : null;
    }
    if (templateData.incident_types !== undefined) {
      payload.incident_types = templateData.incident_types && templateData.incident_types.length > 0 ? templateData.incident_types : null;
    }
    if (templateData.is_default !== undefined) payload.is_default = templateData.is_default;
    if (templateData.requires_approval !== undefined) payload.requires_approval = templateData.requires_approval;
    if (templateData.status !== undefined) payload.status = templateData.status;

    const response = await fetch(
      `${this.baseURL}/api/v1/report-templates/${templateId}`,
      {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload)
      }
    );

    return this.handleResponse(response);
  }

  // Delete a report template
  async deleteTemplate(templateId) {
    const response = await fetch(
      `${this.baseURL}/api/v1/report-templates/${templateId}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      }
    );

    // Handle 204 No Content response for successful deletion
    if (response.status === 204) {
      return { success: true, message: 'Template deleted successfully' };
    }

    return this.handleResponse(response);
  }

  // Clone a report template
  async cloneTemplate(templateId, cloneData) {
    const payload = {
      name: cloneData.name,
      author: cloneData.author,
      description: cloneData.description || ''
    };

    const response = await fetch(
      `${this.baseURL}/api/v1/report-templates/${templateId}/clone`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload)
      }
    );

    return this.handleResponse(response);
  }

  // Get template statistics
  async getTemplateStats() {
    const response = await fetch(
      `${this.baseURL}/api/v1/report-templates/stats`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  // Bulk operations on templates
  async bulkOperation(operation, templateIds) {
    const payload = {
      template_ids: templateIds,
      operation: operation // 'activate', 'archive', 'delete'
    };

    const response = await fetch(
      `${this.baseURL}/api/v1/report-templates/bulk`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload)
      }
    );

    return this.handleResponse(response);
  }

  // Activate templates (bulk or single)
  async activateTemplates(templateIds) {
    if (Array.isArray(templateIds)) {
      return this.bulkOperation('activate', templateIds);
    } else {
      return this.updateTemplate(templateIds, { status: 'active' });
    }
  }

  // Archive templates (bulk or single)
  async archiveTemplates(templateIds) {
    if (Array.isArray(templateIds)) {
      return this.bulkOperation('archive', templateIds);
    } else {
      return this.updateTemplate(templateIds, { status: 'archived' });
    }
  }

  // Delete templates (bulk)
  async deleteTemplates(templateIds) {
    if (Array.isArray(templateIds)) {
      return this.bulkOperation('delete', templateIds);
    } else {
      return this.deleteTemplate(templateIds);
    }
  }

  // Search templates by content
  async searchTemplateContent(query) {
    const response = await fetch(
      `${this.baseURL}/api/v1/report-templates/search`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ query })
      }
    );

    return this.handleResponse(response);
  }

  // Validate template content (Jinja2 syntax check)
  async validateTemplate(content) {
    const response = await fetch(
      `${this.baseURL}/api/v1/report-templates/validate`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ content })
      }
    );

    return this.handleResponse(response);
  }

  // Preview template with sample data
  async previewTemplate(templateId, sampleData = {}) {
    const response = await fetch(
      `${this.baseURL}/api/v1/report-templates/${templateId}/preview`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ sample_data: sampleData })
      }
    );

    return this.handleResponse(response);
  }

  // Get template usage history
  async getTemplateUsage(templateId, params = {}) {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page);
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.start_date) searchParams.append('start_date', params.start_date);
    if (params.end_date) searchParams.append('end_date', params.end_date);

    const response = await fetch(
      `${this.baseURL}/api/v1/report-templates/${templateId}/usage?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  // Export template as file
  async exportTemplate(templateId, format = 'json') {
    const response = await fetch(
      `${this.baseURL}/api/v1/report-templates/${templateId}/export?format=${format}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    if (response.ok) {
      const blob = await response.blob();
      return blob;
    } else {
      return this.handleResponse(response);
    }
  }

  // Import template from file
  async importTemplate(file) {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem(config.STORAGE_KEYS.ACCESS_TOKEN);
    const response = await fetch(
      `${this.baseURL}/api/v1/report-templates/import`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type for FormData - let browser set it with boundary
        },
        body: formData
      }
    );

    return this.handleResponse(response);
  }

  // Helper method to analyze Jinja2 placeholders in content
  analyzePlaceholders(content) {
    if (!content) return [];

    const jinjaRegex = /\{\{[\s]*([^}]+?)[\s]*\}\}/g;
    const jinjaBlockRegex = /\{%[\s]*([^%]+?)[\s]*%\}/g;
    const placeholders = [];
    
    let match;
    
    // Find variable placeholders
    while ((match = jinjaRegex.exec(content)) !== null) {
      const variable = match[1].trim().split('|')[0].trim(); // Remove filters
      if (!placeholders.some(p => p.name === variable)) {
        placeholders.push({
          name: variable,
          type: 'variable',
          usage: content.split(match[0]).length - 1,
          hasFilter: match[1].includes('|'),
          fullMatch: match[0]
        });
      }
    }

    // Find block placeholders
    while ((match = jinjaBlockRegex.exec(content)) !== null) {
      const block = match[1].trim().split(' ')[0];
      if (!placeholders.some(p => p.name === block && p.type === 'block')) {
        placeholders.push({
          name: block,
          type: 'block',
          usage: content.split(match[0]).length - 1,
          fullMatch: match[0]
        });
      }
    }

    return placeholders;
  }

  // Helper method to get content statistics
  getContentStats(content) {
    if (!content) {
      return { characters: 0, lines: 0, htmlTags: 0, cssRules: 0 };
    }

    const lines = content.split('\n').length;
    const htmlTags = (content.match(/<[^>]+>/g) || []).length;
    const cssRules = (content.match(/[^{}]+\{[^}]*\}/g) || []).length;

    return {
      characters: content.length,
      lines,
      htmlTags,
      cssRules
    };
  }
}

export default new ReportTemplateAPI();