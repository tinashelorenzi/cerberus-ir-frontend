import config from '../config/env.js';

class EndpointTokensAPI {
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

  // Create a new endpoint token
  async createToken(tokenData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/endpoint-tokens`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(tokenData)
      }
    );

    return this.handleResponse(response);
  }

  // List endpoint tokens with pagination and filtering
  async listTokens(params = {}) {
    const searchParams = new URLSearchParams();
    
    // Add pagination params
    if (params.page) searchParams.append('page', params.page);
    if (params.size) searchParams.append('size', params.size);
    
    // Add filter params
    if (params.active_only) searchParams.append('active_only', params.active_only);
    if (params.search) searchParams.append('search', params.search);

    const response = await fetch(
      `${this.baseURL}/api/v1/endpoint-tokens?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  // Get a specific endpoint token
  async getToken(tokenId) {
    const response = await fetch(
      `${this.baseURL}/api/v1/endpoint-tokens/${tokenId}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  // Update an endpoint token
  async updateToken(tokenId, updateData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/endpoint-tokens/${tokenId}`,
      {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updateData)
      }
    );

    return this.handleResponse(response);
  }

  // Delete an endpoint token
  async deleteToken(tokenId) {
    const response = await fetch(
      `${this.baseURL}/api/v1/endpoint-tokens/${tokenId}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      }
    );

    if (response.status === 401) {
      localStorage.clear();
      window.location.reload();
      return;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'API request failed');
    }

    return true; // Delete usually returns no content
  }

  // Validate a token (for testing purposes)
  async validateToken(token) {
    const response = await fetch(
      `${this.baseURL}/api/v1/endpoint-tokens/validate`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ token })
      }
    );

    return this.handleResponse(response);
  }

  // Toggle token active status
  async toggleTokenStatus(tokenId, isActive) {
    return this.updateToken(tokenId, { is_active: isActive });
  }

  // Regenerate token (if supported by backend)
  async regenerateToken(tokenId) {
    const response = await fetch(
      `${this.baseURL}/api/v1/endpoint-tokens/${tokenId}/regenerate`,
      {
        method: 'POST',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }
}

export default new EndpointTokensAPI();