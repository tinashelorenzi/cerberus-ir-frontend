// src/services/playbook_flow.js

import config from '../config/env.js';

class PlaybookFlowService {
  constructor() {
    this.baseURL = config.API_BASE_URL;
  }

  getAuthHeaders() {
    const token = localStorage.getItem(config.STORAGE_KEYS.ACCESS_TOKEN);
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

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
            errorMessage = error.detail.map(e => `${e.loc?.join('.') || 'field'}: ${e.msg}`).join(', ');
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
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
    }
    
    return response.json();
  }

  // ============================================================================
  // INCIDENT FLOW MANAGEMENT
  // ============================================================================

  /**
   * Create a new incident flow (start playbook execution)
   */
  async createIncidentFlow(flowData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/incident-flows/`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(flowData)
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Get incident flow by flow ID
   */
  async getIncidentFlow(flowId) {
    const response = await fetch(
      `${this.baseURL}/api/v1/incident-flows/${flowId}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Get incident flow by incident ID
   */
  async getFlowByIncidentId(incidentId) {
    const response = await fetch(
      `${this.baseURL}/api/v1/incident-flows/?incident_id=${incidentId}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    const data = await this.handleResponse(response);
    
    // Return the first flow if any exist
    if (data.items && data.items.length > 0) {
      return data.items[0];
    }
    
    return null;
  }

  /**
   * Get flow steps with current status
   */
  async getFlowSteps(flowId) {
    const response = await fetch(
      `${this.baseURL}/api/v1/incident-flows/${flowId}/steps`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Force initialize steps for a flow that has no steps
   */
  async forceInitializeSteps(flowId) {
    const response = await fetch(
      `${this.baseURL}/api/v1/incident-flows/${flowId}/initialize-steps`,
      {
        method: 'POST',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Delete an incident flow
   */
  async deleteIncidentFlow(flowId) {
    const response = await fetch(
      `${this.baseURL}/api/v1/incident-flows/${flowId}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Get dashboard data for current user
   */
  async getFlowDashboard() {
    const response = await fetch(
      `${this.baseURL}/api/v1/incident-flows/dashboard`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  // ============================================================================
  // STEP EXECUTION
  // ============================================================================

  /**
   * Start executing a step
   */
  async startStep(flowId, stepName) {
    const response = await fetch(
      `${this.baseURL}/api/v1/incident-flows/${flowId}/steps/${stepName}/start`,
      {
        method: 'POST',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Complete a step with output data
   */
  async completeStep(flowId, stepName, completionData = {}) {
    const response = await fetch(
      `${this.baseURL}/api/v1/incident-flows/${flowId}/steps/${stepName}/complete`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(completionData)
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Mark a step as failed
   */
  async failStep(flowId, stepName, errorData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/incident-flows/${flowId}/steps/${stepName}/fail`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(errorData)
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Skip a step (if allowed)
   */
  async skipStep(flowId, stepName, reason) {
    const response = await fetch(
      `${this.baseURL}/api/v1/incident-flows/${flowId}/steps/${stepName}/skip`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ reason })
      }
    );

    return this.handleResponse(response);
  }

  // ============================================================================
  // USER INPUT COLLECTION
  // ============================================================================

  /**
   * Submit user input for a step
   */
  async submitUserInput(flowId, inputData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/incident-flows/${flowId}/inputs`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(inputData)
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Get user inputs for a flow
   */
  async getUserInputs(flowId, stepName = null) {
    const url = new URL(`${this.baseURL}/api/v1/incident-flows/${flowId}/inputs`);
    if (stepName) {
      url.searchParams.append('step_name', stepName);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    return this.handleResponse(response);
  }

  // ============================================================================
  // FLOW CONTROL
  // ============================================================================

  /**
   * Pause flow execution
   */
  async pauseFlow(flowId, reason) {
    const response = await fetch(
      `${this.baseURL}/api/v1/incident-flows/${flowId}/pause`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ reason })
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Resume flow execution
   */
  async resumeFlow(flowId) {
    const response = await fetch(
      `${this.baseURL}/api/v1/incident-flows/${flowId}/resume`,
      {
        method: 'POST',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Cancel flow execution
   */
  async cancelFlow(flowId, reason) {
    const response = await fetch(
      `${this.baseURL}/api/v1/incident-flows/${flowId}/cancel`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ reason })
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Complete and commit the entire flow, updating alert and incident
   */
  async completeFlow(flowId, finalReport = '', alertDisposition = 'resolved', incidentStatus = 'resolved') {
    const response = await fetch(
      `${this.baseURL}/api/v1/incident-flows/${flowId}/complete`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ 
          final_report: finalReport,
          alert_disposition: alertDisposition,  // 'false_positive', 'resolved', 'closed'
          incident_status: incidentStatus       // 'resolved', 'closed'
        })
      }
    );
  
    return this.handleResponse(response);
  }

  /**
   * Manual completion when the backend endpoint doesn't exist
   */
  async completeFlowManually(flowId, finalReport, closeIncident, closeAlert) {
    try {
      // 1. Update flow status
      const flowResponse = await this.updateFlowStatus(flowId, 'completed', finalReport);
      
      // 2. Update incident if requested
      if (closeIncident && flowResponse.incident_id) {
        await this.updateIncident(flowResponse.incident_id, {
          status: 'resolved',
          resolution_summary: finalReport,
          resolved_at: new Date().toISOString()
        });
      }
      
      // 3. Update alert if requested
      if (closeAlert && flowResponse.alert_id) {
        await this.updateAlert(flowResponse.alert_id, {
          status: 'resolved',
          resolution_notes: finalReport,
          resolved_at: new Date().toISOString()
        });
      }
      
      return flowResponse;
    } catch (error) {
      console.error('Error in manual flow completion:', error);
      throw error;
    }
  }

  /**
   * Update incident status and details
   */
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

  /**
   * Update alert status and details
   */
  async updateAlert(alertId, updateData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/alerts/${alertId}`,
      {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updateData)
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Alternative method to update flow status if complete endpoint doesn't exist
   */
  async updateFlowStatus(flowId, status, finalReport = '') {
    const response = await fetch(
      `${this.baseURL}/api/v1/incident-flows/${flowId}`,
      {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ 
          status: status,
          final_report: finalReport,
          completed_at: new Date().toISOString()
        })
      }
    );

    return this.handleResponse(response);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get step execution status counts for visualization
   */
  getStepStatusCounts(steps) {
    const counts = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
      waiting_input: 0,
      waiting_approval: 0
    };

    steps.forEach(step => {
      if (counts.hasOwnProperty(step.status)) {
        counts[step.status]++;
      }
    });

    return counts;
  }

  /**
   * Group steps by phase for kanban display
   */
  groupStepsByPhase(steps) {
    const phases = {};
    
    steps.forEach(step => {
      const phaseName = step.phase_name;
      if (!phases[phaseName]) {
        phases[phaseName] = [];
      }
      phases[phaseName].push(step);
    });

    // Sort steps within each phase by step_index
    Object.keys(phases).forEach(phaseName => {
      phases[phaseName].sort((a, b) => a.step_index - b.step_index);
    });

    return phases;
  }

  /**
   * Calculate phase completion percentage
   */
  getPhaseProgress(phaseSteps) {
    if (!phaseSteps || phaseSteps.length === 0) return 0;
    
    const completedSteps = phaseSteps.filter(step => 
      step.status === 'completed'
    ).length;
    
    return Math.round((completedSteps / phaseSteps.length) * 100);
  }

  /**
   * Check if step can be executed based on dependencies and status
   */
  canExecuteStep(step, allSteps) {
    if (step.status !== 'pending') return false;
    
    // Check if all dependencies are completed
    if (step.depends_on_steps && step.depends_on_steps.length > 0) {
      const dependencySteps = allSteps.filter(s => 
        step.depends_on_steps.includes(s.step_name)
      );
      
      const allDependenciesCompleted = dependencySteps.every(dep => 
        dep.status === 'completed'
      );
      
      return allDependenciesCompleted;
    }
    
    return true;
  }

  /**
   * Check if flow is complete and ready to commit
   */
  isFlowComplete(steps) {
    if (!steps || steps.length === 0) return false;
    
    // All steps must be in a final state (completed, skipped, or failed)
    const finalStates = ['completed', 'skipped', 'failed'];
    return steps.every(step => finalStates.includes(step.status));
  }

  /**
   * Check if flow has any failed required steps
   */
  hasFailedRequiredSteps(steps) {
    if (!steps || steps.length === 0) return false;
    
    // Check for failed steps (assuming all steps are required unless explicitly marked as optional)
    return steps.some(step => 
      step.status === 'failed' && 
      step.required !== false // assuming required is true by default
    );
  }

  /**
   * Get next executable step in the flow
   */
  getNextExecutableStep(steps) {
    const sortedSteps = [...steps].sort((a, b) => a.global_step_index - b.global_step_index);
    
    return sortedSteps.find(step => 
      this.canExecuteStep(step, steps)
    );
  }

  /**
   * Format step duration for display
   */
  formatDuration(minutes) {
    if (!minutes) return 'N/A';
    
    if (minutes < 60) {
      return `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Get status color for UI display
   */
  getStatusColor(status) {
    const colors = {
      pending: 'gray',
      in_progress: 'blue',
      completed: 'green',
      failed: 'red',
      skipped: 'yellow',
      waiting_input: 'purple',
      waiting_approval: 'orange'
    };
    
    return colors[status] || 'gray';
  }

  /**
   * Get status icon for UI display
   */
  getStatusIcon(status) {
    const icons = {
      pending: '⏳',
      in_progress: '🔄',
      completed: '✅',
      failed: '❌',
      skipped: '⏭️',
      waiting_input: '📝',
      waiting_approval: '⏰'
    };
    
    return icons[status] || '❓';
  }

  /**
 * Complete flow with status selection
 */
  async completeFlowWithStatus(flowId, completionData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/incident-flows/${flowId}/complete`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          final_report: completionData.finalReport,
          alert_disposition: completionData.alertDisposition,
          incident_status: completionData.incidentStatus
        })
      }
    );
    return this.handleResponse(response);
  }
}

export default new PlaybookFlowService();