// src/services/reports.js

import config from '../config/env.js';

class ReportsAPI {
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
  // REPORT MANAGEMENT
  // ============================================================================

  /**
   * List reports with filtering and pagination
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Paginated report list
   */
  async getReports(params = {}) {
    const searchParams = new URLSearchParams();
    
    // Pagination
    if (params.page) searchParams.append('page', params.page);
    if (params.size) searchParams.append('size', params.size);
    
    // Filters
    if (params.search) searchParams.append('search', params.search);
    if (params.report_type) searchParams.append('report_type', params.report_type);
    if (params.status) searchParams.append('status', params.status);
    if (params.created_by_id) searchParams.append('created_by_id', params.created_by_id);
    if (params.template_id) searchParams.append('template_id', params.template_id);
    if (params.tags) searchParams.append('tags', params.tags);
    if (params.date_start) searchParams.append('date_start', params.date_start);
    if (params.date_end) searchParams.append('date_end', params.date_end);
    
    // Sorting
    if (params.sort_by) searchParams.append('sort_by', params.sort_by);
    if (params.sort_order) searchParams.append('sort_order', params.sort_order);

    const response = await fetch(
      `${this.baseURL}/api/v1/reports?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Get a specific report by ID
   * @param {number} reportId - Report ID
   * @returns {Promise<Object>} Report details
   */
  async getReport(reportId) {
    const response = await fetch(
      `${this.baseURL}/api/v1/reports/${reportId}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Create a new report
   * @param {Object} reportData - Report creation data
   * @returns {Promise<Object>} Created report
   */
  async createReport(reportData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/reports`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(reportData)
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Update an existing report
   * @param {number} reportId - Report ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated report
   */
  async updateReport(reportId, updateData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/reports/${reportId}`,
      {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updateData)
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Delete a report
   * @param {number} reportId - Report ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteReport(reportId) {
    const response = await fetch(
      `${this.baseURL}/api/v1/reports/${reportId}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  // ============================================================================
  // REPORT WIZARD
  // ============================================================================

  /**
   * Get available incidents for report creation
   * @returns {Promise<Array>} Available incidents
   */
  async getAvailableIncidents() {
    const response = await fetch(
      `${this.baseURL}/api/v1/reports/wizard/available-incidents`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Complete the report creation wizard
   * @param {Object} wizardData - Complete wizard data
   * @returns {Promise<Object>} Created report
   */
  async completeWizard(wizardData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/reports/wizard/complete`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(wizardData)
      }
    );

    return this.handleResponse(response);
  }

  // ============================================================================
  // REPORT ELEMENTS (Drag & Drop System)
  // ============================================================================

  /**
   * Get all elements for a report
   * @param {number} reportId - Report ID
   * @returns {Promise<Array>} Report elements
   */
  async getReportElements(reportId) {
    const response = await fetch(
      `${this.baseURL}/api/v1/reports/${reportId}/elements`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Add an element to a report
   * @param {number} reportId - Report ID
   * @param {Object} elementData - Element data
   * @returns {Promise<Object>} Created element
   */
  async addReportElement(reportId, elementData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/reports/${reportId}/elements`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(elementData)
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Update a report element
   * @param {number} reportId - Report ID
   * @param {number} elementId - Element ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated element
   */
  async updateReportElement(reportId, elementId, updateData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/reports/${reportId}/elements/${elementId}`,
      {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updateData)
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Delete a report element
   * @param {number} reportId - Report ID
   * @param {number} elementId - Element ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteReportElement(reportId, elementId) {
    const response = await fetch(
      `${this.baseURL}/api/v1/reports/${reportId}/elements/${elementId}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Reorder report elements
   * @param {number} reportId - Report ID
   * @param {Array} elementOrders - Array of {id, section_name, position_order}
   * @returns {Promise<Array>} Updated elements
   */
  async reorderReportElements(reportId, elementOrders) {
    // Update each element's position
    const updatePromises = elementOrders.map(order => 
      this.updateReportElement(reportId, order.id, {
        section_name: order.section_name,
        position_order: order.position_order
      })
    );

    return Promise.all(updatePromises);
  }

  // ============================================================================
  // REPORT BUILDING CONTEXT
  // ============================================================================

  /**
   * Get building context for a report (data sources, template vars, etc.)
   * @param {number} reportId - Report ID
   * @returns {Promise<Object>} Building context
   */
  async getBuildingContext(reportId) {
    const response = await fetch(
      `${this.baseURL}/api/v1/reports/${reportId}/building-context`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  // ============================================================================
  // REPORT GENERATION
  // ============================================================================

  /**
   * Start report generation
   * @param {number} reportId - Report ID
   * @param {Object} generationParams - Generation parameters
   * @returns {Promise<Object>} Generation start confirmation
   */
  async generateReport(reportId, generationParams = {}) {
    const requestData = {
      report_id: reportId,
      force_regenerate: generationParams.force_regenerate || false,
      export_formats: generationParams.export_formats || ['markdown']
    };

    const response = await fetch(
      `${this.baseURL}/api/v1/reports/${reportId}/generate`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestData)
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Check report generation status (polling helper)
   * @param {number} reportId - Report ID
   * @returns {Promise<Object>} Report with current status
   */
  async checkGenerationStatus(reportId) {
    return this.getReport(reportId);
  }

  /**
   * Poll for report completion
   * @param {number} reportId - Report ID
   * @param {number} maxAttempts - Maximum polling attempts
   * @param {number} interval - Polling interval in ms
   * @returns {Promise<Object>} Completed report
   */
  async pollForCompletion(reportId, maxAttempts = 30, interval = 2000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const report = await this.checkGenerationStatus(reportId);
      
      if (report.status === 'completed') {
        return report;
      }
      
      if (report.status === 'failed') {
        throw new Error('Report generation failed');
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error('Report generation timeout');
  }

  // ============================================================================
  // REPORT EXPORT & DOWNLOAD
  // ============================================================================

  /**
   * Export report in specified format
   * @param {number} reportId - Report ID
   * @param {Object} exportParams - Export parameters
   * @returns {Promise<Object>} Export response with download URL
   */
  async exportReport(reportId, exportParams) {
    const response = await fetch(
      `${this.baseURL}/api/v1/reports/${reportId}/export`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(exportParams)
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Download report file
   * @param {number} reportId - Report ID
   * @param {string} format - File format (markdown, html, pdf)
   * @returns {Promise<Blob>} File blob
   */
  async downloadReport(reportId, format) {
    const response = await fetch(
      `${this.baseURL}/api/v1/reports/${reportId}/download/${format}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem(config.STORAGE_KEYS.ACCESS_TOKEN)}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Download report and save to file
   * @param {number} reportId - Report ID
   * @param {string} format - File format
   * @param {string} filename - Optional filename
   */
  async downloadAndSaveReport(reportId, format, filename = null) {
    try {
      const blob = await this.downloadReport(reportId, format);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `report_${reportId}.${format}`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // REPORT SHARING
  // ============================================================================

  /**
   * Share a report
   * @param {number} reportId - Report ID
   * @param {Object} shareData - Share configuration
   * @returns {Promise<Object>} Share details
   */
  async shareReport(reportId, shareData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/reports/${reportId}/share`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(shareData)
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Get report shares
   * @param {number} reportId - Report ID
   * @returns {Promise<Array>} Report shares
   */
  async getReportShares(reportId) {
    const response = await fetch(
      `${this.baseURL}/api/v1/reports/${reportId}/shares`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  // ============================================================================
  // REPORT COMMENTS & COLLABORATION
  // ============================================================================

  /**
   * Add a comment to a report
   * @param {number} reportId - Report ID
   * @param {Object} commentData - Comment data
   * @returns {Promise<Object>} Created comment
   */
  async addComment(reportId, commentData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/reports/${reportId}/comments`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(commentData)
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Get comments for a report
   * @param {number} reportId - Report ID
   * @returns {Promise<Array>} Report comments
   */
  async getComments(reportId) {
    const response = await fetch(
      `${this.baseURL}/api/v1/reports/${reportId}/comments`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  // ============================================================================
  // ANALYTICS & STATISTICS
  // ============================================================================

  /**
   * Get report statistics
   * @returns {Promise<Object>} Report statistics
   */
  async getReportStats() {
    const response = await fetch(
      `${this.baseURL}/api/v1/reports/stats`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    return this.handleResponse(response);
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Perform bulk operations on reports
   * @param {Object} operationData - Bulk operation data
   * @returns {Promise<Object>} Operation results
   */
  async bulkOperation(operationData) {
    const response = await fetch(
      `${this.baseURL}/api/v1/reports/bulk-operation`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(operationData)
      }
    );

    return this.handleResponse(response);
  }

  /**
   * Delete multiple reports
   * @param {Array} reportIds - Array of report IDs
   * @returns {Promise<Object>} Deletion results
   */
  async deleteMultipleReports(reportIds) {
    return this.bulkOperation({
      report_ids: reportIds,
      operation: 'delete'
    });
  }

  /**
   * Archive multiple reports
   * @param {Array} reportIds - Array of report IDs
   * @returns {Promise<Object>} Archive results
   */
  async archiveMultipleReports(reportIds) {
    return this.bulkOperation({
      report_ids: reportIds,
      operation: 'archive'
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Format report data for display
   * @param {Object} report - Raw report data
   * @returns {Object} Formatted report data
   */
  formatReportData(report) {
    return {
      ...report,
      created_at_formatted: new Date(report.created_at).toLocaleString(),
      updated_at_formatted: new Date(report.updated_at).toLocaleString(),
      generated_at_formatted: report.generated_at ? 
        new Date(report.generated_at).toLocaleString() : null,
      status_badge: this.getStatusBadge(report.status),
      type_display: this.getTypeDisplay(report.report_type),
      file_size_formatted: report.file_size_bytes ? 
        this.formatFileSize(report.file_size_bytes) : null
    };
  }

  /**
   * Get status badge configuration
   * @param {string} status - Report status
   * @returns {Object} Badge configuration
   */
  getStatusBadge(status) {
    const statusConfig = {
      draft: { color: 'gray', text: 'Draft' },
      generating: { color: 'blue', text: 'Generating...' },
      completed: { color: 'green', text: 'Completed' },
      failed: { color: 'red', text: 'Failed' },
      archived: { color: 'yellow', text: 'Archived' }
    };

    return statusConfig[status] || { color: 'gray', text: status };
  }

  /**
   * Get type display text
   * @param {string} type - Report type
   * @returns {string} Display text
   */
  getTypeDisplay(type) {
    const typeDisplays = {
      incident: 'Incident Report',
      collective: 'Collective Report'
    };

    return typeDisplays[type] || type;
  }

  /**
   * Format file size in human readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate report data before submission
   * @param {Object} reportData - Report data to validate
   * @returns {Object} Validation result
   */
  validateReportData(reportData) {
    const errors = [];

    if (!reportData.title || reportData.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (reportData.title && reportData.title.length > 300) {
      errors.push('Title must be less than 300 characters');
    }

    if (!reportData.report_type) {
      errors.push('Report type is required');
    }

    if (!['incident', 'collective'].includes(reportData.report_type)) {
      errors.push('Invalid report type');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ============================================================================
  // WIZARD HELPERS
  // ============================================================================

  /**
   * Build wizard data for completion
   * @param {Object} step1Data - Step 1 data
   * @param {Object} step2Data - Step 2 data
   * @param {Array} includeSections - Sections to include
   * @param {Array} analyticsOptions - Analytics options
   * @returns {Object} Complete wizard data
   */
  buildWizardData(step1Data, step2Data, includeSections = [], analyticsOptions = []) {
    return {
      step1: step1Data,
      step2: step2Data,
      include_sections: includeSections,
      analytics_options: analyticsOptions
    };
  }

  /**
   * Validate wizard step 1 data
   * @param {Object} step1Data - Step 1 data
   * @returns {Object} Validation result
   */
  validateWizardStep1(step1Data) {
    const errors = [];

    if (!step1Data.report_type) {
      errors.push('Report type is required');
    }

    if (!step1Data.title || step1Data.title.trim().length === 0) {
      errors.push('Title is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate wizard step 2 data
   * @param {Object} step2Data - Step 2 data
   * @param {string} reportType - Report type from step 1
   * @returns {Object} Validation result
   */
  validateWizardStep2(step2Data, reportType) {
    const errors = [];

    if (reportType === 'incident') {
      if (!step2Data.incident_ids || step2Data.incident_ids.length === 0) {
        errors.push('At least one incident must be selected');
      }
    } else if (reportType === 'collective') {
      if (!step2Data.date_range || !step2Data.date_range.start || !step2Data.date_range.end) {
        errors.push('Date range is required for collective reports');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export default new ReportsAPI();