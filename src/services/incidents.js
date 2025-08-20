// src/services/incidents.js

import config from '../config/env.js';

class IncidentsAPI {
  constructor() {
    this.baseURL = config.API_BASE_URL;
    this.wsURL = config.WS_BASE_URL || 'ws://localhost:8000';
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
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
      localStorage.clear();
      window.location.reload();
      return;
    }
    
    if (!response.ok) {
      try {
        const error = await response.json();
        let errorMessage = 'API request failed';
        
        if (error.detail) {
          if (Array.isArray(error.detail)) {
            errorMessage = error.detail.map(e => `${e.loc?.join('.')}: ${e.msg}`).join(', ');
          } else if (typeof error.detail === 'string') {
            errorMessage = error.detail;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        throw new Error(errorMessage);
      } catch (jsonError) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
    }
    
    return response.json();
  }

  // ===== WEBSOCKET METHODS =====

  // Connect to WebSocket for real-time updates
  connectWebSocket() {
    const token = localStorage.getItem(config.STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      console.error('No auth token available for WebSocket connection');
      return;
    }

    try {
      this.ws = new WebSocket(`${this.wsURL}/ws/incidents?token=${token}`);
      
      this.ws.onopen = () => {
        console.log('Incident WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Request initial data
        this.sendMessage('get_owned_incidents', {});
        this.sendMessage('get_recent_alerts', {});
        
        // Start ping interval
        this.startPingInterval();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('Incident WebSocket disconnected', event.code, event.reason);
        this.stopPingInterval();
        
        // Attempt to reconnect if not intentionally closed
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('Incident WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  // Disconnect WebSocket
  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close(1000, 'User disconnecting');
      this.ws = null;
    }
    this.stopPingInterval();
  }

  // Send message through WebSocket
  sendMessage(type, data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      console.warn('WebSocket not connected, cannot send message:', type);
    }
  }

  // Handle incoming WebSocket messages
  handleWebSocketMessage(message) {
    const { type, data } = message;
    
    // Notify listeners
    if (this.listeners.has(type)) {
      this.listeners.get(type).forEach(callback => callback(data));
    }

    // Handle common message types
    switch (type) {
      case 'new_alert':
        this.emit('alertReceived', data);
        break;
      case 'alert_updated':
        this.emit('alertUpdated', data);
        break;
      case 'incident_created':
        this.emit('incidentCreated', data);
        break;
      case 'incident_updated':
        this.emit('incidentUpdated', data);
        break;
      case 'ownership_taken':
        this.emit('ownershipTaken', data);
        break;
      case 'alert_ownership_taken':
        this.emit('alertOwnershipTaken', data);
        break;
      case 'initial_data':
        this.emit('initialDataReceived', data);
        break;
      case 'recent_alerts':
        this.emit('recentAlertsReceived', data);
        break;
      case 'owned_incidents':
        this.emit('ownedIncidentsReceived', data);
        break;
      case 'error':
        this.emit('websocketError', data);
        console.error('WebSocket error:', data.message);
        break;
      case 'pong':
        // Ping response, connection is alive
        break;
      default:
        console.log('Unknown WebSocket message type:', type);
    }
  }

  // Schedule reconnection attempt
  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connectWebSocket();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('connectionFailed', { message: 'Failed to establish WebSocket connection' });
    }
  }

  // Start ping interval to keep connection alive
  startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendMessage('ping', {});
      }
    }, 30000); // Ping every 30 seconds
  }

  // Stop ping interval
  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // ===== EVENT LISTENER METHODS =====

  // Add event listener
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
  }

  // Remove event listener
  off(eventType, callback) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).delete(callback);
    }
  }

  // Emit event to listeners
  emit(eventType, data) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).forEach(callback => callback(data));
    }
  }

  // ===== ALERT METHODS =====

  // Take ownership of an alert
  takeOwnership(alertId, notes = null) {
    this.sendMessage('take_ownership', { 
        alert_id: alertId,
        notes 
      });
      
      // Return a resolved promise for compatibility
      return Promise.resolve({ alert_id: alertId });
  }

  // Get recent alerts (fallback to API if WebSocket unavailable)
  async getRecentAlerts(params = {}) {
    // Try WebSocket first
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return new Promise((resolve, reject) => {
        const handler = (data) => {
          this.off('recentAlertsReceived', handler);
          resolve(data.alerts || []);
        };
        
        this.on('recentAlertsReceived', handler);
        this.sendMessage('get_recent_alerts', params);
        
        setTimeout(() => {
          this.off('recentAlertsReceived', handler);
          reject(new Error('Request timed out'));
        }, 5000);
      });
    }

    // Fallback to API
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page);
    if (params.size) searchParams.append('size', params.size);
    if (params.status) searchParams.append('status', params.status);
    if (params.severity) searchParams.append('severity', params.severity);

    const response = await fetch(
      `${this.baseURL}/api/v1/alerts?${searchParams}`,
      { headers: this.getAuthHeaders() }
    );

    const data = await this.handleResponse(response);
    return data.alerts || [];
  }

  // ===== INCIDENT METHODS =====

  // Get owned incidents
  async getOwnedIncidents(includeResolved = false) {
    const params = {};
    
    // Add status filter if not including resolved
    if (!includeResolved) {
      params.status = 'new,investigating,in_progress,contained,active';
    }
    
    // Try WebSocket first
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return new Promise((resolve, reject) => {
        const handler = (data) => {
          this.off('ownedIncidentsReceived', handler);
          resolve(data.incidents || []);
        };
        
        this.on('ownedIncidentsReceived', handler);
        this.sendMessage('get_owned_incidents', params);
        
        setTimeout(() => {
          this.off('ownedIncidentsReceived', handler);
          reject(new Error('Request timed out'));
        }, 5000);
      });
    }
  
    // Fallback to API
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.append('status', params.status);
    
    const response = await fetch(
      `${this.baseURL}/api/v1/incidents/owned?${searchParams}`,
      { headers: this.getAuthHeaders() }
    );
  
    const data = await this.handleResponse(response);
    return data.incidents || [];
  }

  // Get all incidents with filtering
  async getIncidents(params = {}) {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page);
    if (params.size) searchParams.append('size', params.size);
    if (params.search) searchParams.append('search', params.search);
    if (params.severity) searchParams.append('severity', params.severity);
    if (params.status) searchParams.append('status', params.status);
    if (params.priority) searchParams.append('priority', params.priority);
    if (params.owner_id) searchParams.append('owner_id', params.owner_id);
    if (params.assigned_analyst_id) searchParams.append('assigned_analyst_id', params.assigned_analyst_id);

    const response = await fetch(
      `${this.baseURL}/api/v1/incidents?${searchParams}`,
      { headers: this.getAuthHeaders() }
    );

    return this.handleResponse(response);
  }

  // Get incident by ID
  async getIncident(incidentId) {
    const response = await fetch(
      `${this.baseURL}/api/v1/incidents/${incidentId}`,
      { headers: this.getAuthHeaders() }
    );

    return this.handleResponse(response);
  }

  // Create new incident
  async createIncident(incidentData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/incidents`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(incidentData)
      }
    );

    return this.handleResponse(response);
  }

  async getIncidentClosureDetails(incidentId) {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/incidents/${incidentId}/closure-details`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching incident closure details:', error);
      throw error;
    }
  }

  // Update incident
  async updateIncident(incidentId, updateData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/incidents/${incidentId}`,
      {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updateData)
      }
    );

    return this.handleResponse(response);
  }

  // Update incident status
  async updateIncidentStatus(incidentId, newStatus, notes = null) {
    const response = await fetch(
      `${this.baseURL}/api/v1/incidents/${incidentId}/status`,
      {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ 
          status: newStatus,
          notes 
        })
      }
    );

    return this.handleResponse(response);
  }

  // Add note to incident
  async addIncidentNote(incidentId, noteData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/incidents/${incidentId}/notes`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(noteData)
      }
    );

    return this.handleResponse(response);
  }

  // Get incident statistics
  async getIncidentStats() {
    const response = await fetch(
      `${this.baseURL}/api/v1/incidents/stats`,
      { headers: this.getAuthHeaders() }
    );

    return this.handleResponse(response);
  }

  // Watch specific incident for updates
  watchIncident(incidentId) {
    this.sendMessage('watch_incident', { incident_id: incidentId });
  }

  // Stop watching incident
  unwatchIncident(incidentId) {
    this.sendMessage('unwatch_incident', { incident_id: incidentId });
  }

  // ===== UTILITY METHODS =====

  // Format timestamp for display
  formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get severity color class
  getSeverityColor(severity) {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'medium': return 'bg-yellow-600 text-white';
      case 'low': return 'bg-blue-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  }

  // Get status color class
  getStatusColor(status) {
    switch (status?.toLowerCase()) {
      case 'new': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assigned': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'investigating': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'contained': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  // Get priority color class
  getPriorityColor(priority) {
    switch (priority?.toLowerCase()) {
      case 'p1': return 'bg-red-600 text-white';
      case 'p2': return 'bg-orange-600 text-white';
      case 'p3': return 'bg-yellow-600 text-white';
      case 'p4': return 'bg-green-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  }

  // Check if incident is overdue
  isIncidentOverdue(incident) {
    if (!incident) return false;
    
    const now = new Date();
    
    // Check response SLA
    if (incident.response_sla_deadline && !incident.first_response_at) {
      return new Date(incident.response_sla_deadline) < now;
    }
    
    // Check resolution SLA
    if (incident.resolution_sla_deadline && !incident.resolved_at) {
      return new Date(incident.resolution_sla_deadline) < now;
    }
    
    return incident.sla_breached || false;
  }
}

// Create and export singleton instance
const incidentsAPI = new IncidentsAPI();
export default incidentsAPI;