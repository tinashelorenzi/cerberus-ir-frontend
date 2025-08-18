import config from '../config/env.js';

class PlaybookAPI {
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
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'API request failed');
    }
    
    return response.json();
  }

  // Get all playbooks with pagination and filtering
  async getPlaybooks(params = {}) {
    const searchParams = new URLSearchParams();
    
    // Add pagination params
    if (params.page) searchParams.append('page', params.page);
    if (params.size) searchParams.append('size', params.size);
    
    // Add filter params
    if (params.search) searchParams.append('search', params.search);
    if (params.status) searchParams.append('status', params.status);
    if (params.tags) searchParams.append('tags', params.tags);
    if (params.severity_levels) searchParams.append('severity_levels', params.severity_levels);
    if (params.alert_sources) searchParams.append('alert_sources', params.alert_sources);

    const response = await fetch(
      `${this.baseURL}/api/v1/playbooks?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  // Get a single playbook by ID
  async getPlaybook(id) {
    const response = await fetch(
      `${this.baseURL}/api/v1/playbooks/${id}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  // Create a new playbook
  async createPlaybook(playbookData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/playbooks/`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(playbookData)
      }
    );

    return this.handleResponse(response);
  }

  // Update an existing playbook
  async updatePlaybook(id, playbookData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/playbooks/${id}`,
      {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(playbookData)
      }
    );

    return this.handleResponse(response);
  }

  // Delete a playbook
  async deletePlaybook(id) {
    const response = await fetch(
      `${this.baseURL}/api/v1/playbooks/${id}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  // Get playbook templates
  async getPlaybookTemplates() {
    const response = await fetch(
      `${this.baseURL}/api/v1/playbooks/templates`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  // Create a new playbook template
  async createPlaybookTemplate(templateData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/playbooks/templates`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(templateData)
      }
    );

    return this.handleResponse(response);
  }

  // Get playbook executions
  async getPlaybookExecutions(params = {}) {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page);
    if (params.size) searchParams.append('size', params.size);
    if (params.playbook_id) searchParams.append('playbook_id', params.playbook_id);
    if (params.status) searchParams.append('status', params.status);

    const response = await fetch(
      `${this.baseURL}/api/v1/playbooks/executions?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  // Start a playbook execution
  async startPlaybookExecution(executionData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/playbooks/executions`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(executionData)
      }
    );

    return this.handleResponse(response);
  }
}

export default new PlaybookAPI();