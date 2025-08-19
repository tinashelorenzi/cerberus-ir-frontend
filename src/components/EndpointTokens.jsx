import React, { useState, useEffect } from 'react';
import EndpointTokensAPI from '../services/endpoints.js';
import { useAuth } from '../contexts/AuthContext';

const TokenManagement = () => {
  const { user } = useAuth();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [createdToken, setCreatedToken] = useState(null);
  const [editingToken, setEditingToken] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    token_name: '',
    description: '',
    can_create_alerts: true,
    can_update_alerts: false,
    can_read_alerts: true,
    rate_limit_per_minute: 100,
    expires_in_days: null,
    allowed_ips: [],
    allowed_sources: []
  });

  const [ipInput, setIpInput] = useState('');
  const [sourceInput, setSourceInput] = useState('');

  // Load tokens on component mount and when filters change
  useEffect(() => {
    loadTokens();
  }, [currentPage, searchTerm, activeOnly]);

  const validateFormData = () => {
    const errors = [];
    
    if (!formData.token_name || formData.token_name.trim().length === 0) {
      errors.push('Token name is required');
    }
    
    if (formData.token_name && !/^[a-zA-Z0-9\s\-_]+$/.test(formData.token_name.trim())) {
      errors.push('Token name can only contain letters, numbers, spaces, hyphens, and underscores');
    }
    
    if (formData.rate_limit_per_minute < 1 || formData.rate_limit_per_minute > 1000) {
      errors.push('Rate limit must be between 1 and 1000');
    }
    
    if (formData.expires_in_days && (formData.expires_in_days < 1 || formData.expires_in_days > 365)) {
      errors.push('Expiration days must be between 1 and 365');
    }
    
    // Validate IP addresses if provided
    if (formData.allowed_ips && formData.allowed_ips.length > 0) {
      formData.allowed_ips.forEach(ip => {
        // Basic IP validation - you might want to use a proper IP validation library
        if (!/^(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?$/.test(ip.trim())) {
          errors.push(`Invalid IP address: ${ip}`);
        }
      });
    }
    
    return errors;
  };

  const loadTokens = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        size: pageSize,
        search: searchTerm || undefined,
        active_only: activeOnly
      };

      const response = await EndpointTokensAPI.listTokens(params);
      setTokens(response.items);
      setTotalPages(response.pages);
      setError(null);
    } catch (err) {
      setError('Failed to load tokens: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateToken = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateFormData();
    if (validationErrors.length > 0) {
      setError('Validation errors: ' + validationErrors.join(', '));
      return;
    }
    
    try {
      setLoading(true);
      
      // Prepare data to match FastAPI schema exactly
      const tokenData = {
        token_name: formData.token_name.trim(),
        description: formData.description?.trim() || null,
        can_create_alerts: Boolean(formData.can_create_alerts),
        can_update_alerts: Boolean(formData.can_update_alerts),
        can_read_alerts: Boolean(formData.can_read_alerts),
        rate_limit_per_minute: parseInt(formData.rate_limit_per_minute, 10),
        expires_in_days: formData.expires_in_days ? parseInt(formData.expires_in_days, 10) : null,
        // Only include arrays if they have content, otherwise send null
        allowed_ips: formData.allowed_ips && formData.allowed_ips.length > 0 ? formData.allowed_ips : null,
        allowed_sources: formData.allowed_sources && formData.allowed_sources.length > 0 ? formData.allowed_sources : null
      };

      console.log('Sending token data:', tokenData); // Debug logging
      
      const response = await EndpointTokensAPI.createToken(tokenData);
      
      // Show the created token (only chance to see it)
      setCreatedToken(response);
      setShowCreateModal(false);
      setShowTokenModal(true);
      
      // Reset form
      resetForm();
      
      // Reload tokens list
      await loadTokens();
    } catch (err) {
      console.error('Token creation error:', err); // Debug logging
      setError('Failed to create token: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateToken = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateFormData();
    if (validationErrors.length > 0) {
      setError('Validation errors: ' + validationErrors.join(', '));
      return;
    }
    
    try {
      setLoading(true);
      
      const updateData = {
        ...formData,
        allowed_ips: formData.allowed_ips.length > 0 ? formData.allowed_ips : null,
        allowed_sources: formData.allowed_sources.length > 0 ? formData.allowed_sources : null
      };

      await EndpointTokensAPI.updateToken(editingToken.id, updateData);
      
      setShowEditModal(false);
      setEditingToken(null);
      resetForm();
      await loadTokens();
    } catch (err) {
      setError('Failed to update token: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteToken = async (tokenId) => {
    if (!confirm('Are you sure you want to delete this token? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await EndpointTokensAPI.deleteToken(tokenId);
      await loadTokens();
    } catch (err) {
      setError('Failed to delete token: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (tokenId, currentStatus) => {
    try {
      setLoading(true);
      await EndpointTokensAPI.toggleTokenStatus(tokenId, !currentStatus);
      await loadTokens();
    } catch (err) {
      setError('Failed to update token status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      token_name: '',
      description: '',
      can_create_alerts: true,
      can_update_alerts: false,
      can_read_alerts: true,
      rate_limit_per_minute: 100,
      expires_in_days: null,
      allowed_ips: [],
      allowed_sources: []
    });
    setIpInput('');
    setSourceInput('');
  };

  const openEditModal = (token) => {
    setEditingToken(token);
    setFormData({
      token_name: token.token_name,
      description: token.description || '',
      can_create_alerts: token.can_create_alerts,
      can_update_alerts: token.can_update_alerts,
      can_read_alerts: token.can_read_alerts,
      rate_limit_per_minute: token.rate_limit_per_minute,
      expires_in_days: null, // Don't pre-fill expiry extension
      allowed_ips: token.allowed_ips || [],
      allowed_sources: token.allowed_sources || []
    });
    setShowEditModal(true);
  };

  const addIpAddress = () => {
    if (ipInput.trim() && !formData.allowed_ips.includes(ipInput.trim())) {
      setFormData(prev => ({
        ...prev,
        allowed_ips: [...prev.allowed_ips, ipInput.trim()]
      }));
      setIpInput('');
    }
  };

  const removeIpAddress = (ip) => {
    setFormData(prev => ({
      ...prev,
      allowed_ips: prev.allowed_ips.filter(item => item !== ip)
    }));
  };

  const addSource = () => {
    if (sourceInput.trim() && !formData.allowed_sources.includes(sourceInput.trim())) {
      setFormData(prev => ({
        ...prev,
        allowed_sources: [...prev.allowed_sources, sourceInput.trim()]
      }));
      setSourceInput('');
    }
  };

  const removeSource = (source) => {
    setFormData(prev => ({
      ...prev,
      allowed_sources: prev.allowed_sources.filter(item => item !== source)
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (token) => {
    if (!token.is_active) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-600 text-gray-300">Inactive</span>;
    }
    if (token.is_expired) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-600 text-white">Expired</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-cerberus-green text-white">Active</span>;
  };

  // Check if user has permission to manage tokens
  const canManageTokens = user && ['manager', 'admin'].includes(user.role);

  if (!canManageTokens) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cerberus-dark">
        <div className="card-glass max-w-md mx-auto text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-4">
            You need Manager or Admin privileges to manage API tokens.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">API Token Management</h1>
        <p className="text-gray-400">
          Manage endpoint tokens for external systems to access the Cerberus IR platform.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="card-glass mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <input
              type="text"
              placeholder="Search tokens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
            />
            
            <label className="flex items-center space-x-2 text-white">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="rounded border-gray-600 bg-gray-700 text-cerberus-green"
              />
              <span>Active only</span>
            </label>
          </div>

          {/* Create Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="button-primary"
            disabled={loading}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Token
          </button>
        </div>
      </div>

      {/* Tokens Table */}
      <div className="card-glass">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="loading-spinner"></div>
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No tokens found</h3>
            <p className="text-gray-400 mb-4">Create your first API token to get started.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="button-primary"
            >
              Create Token
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Prefix</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Permissions</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Rate Limit</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Expires</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Last Used</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr key={token.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-white">{token.token_name}</div>
                        {token.description && (
                          <div className="text-sm text-gray-400">{token.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <code className="bg-gray-800 px-2 py-1 rounded text-sm text-gray-300">
                        {token.token_prefix}...
                      </code>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(token)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {token.can_create_alerts && (
                          <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded">Create</span>
                        )}
                        {token.can_update_alerts && (
                          <span className="px-2 py-1 text-xs bg-yellow-600 text-white rounded">Update</span>
                        )}
                        {token.can_read_alerts && (
                          <span className="px-2 py-1 text-xs bg-green-600 text-white rounded">Read</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {token.rate_limit_per_minute}/min
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {formatDate(token.expires_at)}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {formatDate(token.last_used_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(token)}
                          className="text-blue-400 hover:text-blue-300"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        
                        <button
                          onClick={() => handleToggleStatus(token.id, token.is_active)}
                          className={`${token.is_active ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                          title={token.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {token.is_active ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleDeleteToken(token.id)}
                          className="text-red-400 hover:text-red-300"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-700 pt-4">
            <div className="text-sm text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Previous
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNumber = i + Math.max(1, currentPage - 2);
                if (pageNumber > totalPages) return null;
                
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      pageNumber === currentPage
                        ? 'bg-cerberus-green text-white'
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Token Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-cerberus-dark-light rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Create API Token</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateToken} className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Token Name *</label>
                    <input
                      type="text"
                      value={formData.token_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, token_name: e.target.value }))}
                      className="input-field w-full"
                      required
                      placeholder="e.g., SIEM Integration"
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Rate Limit (per minute)</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={formData.rate_limit_per_minute}
                      onChange={(e) => setFormData(prev => ({ ...prev, rate_limit_per_minute: parseInt(e.target.value) }))}
                      className="input-field w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="input-field w-full"
                    rows="3"
                    placeholder="Describe the purpose of this token..."
                  />
                </div>

                {/* Permissions */}
                <div>
                  <label className="form-label">Permissions</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 text-white">
                      <input
                        type="checkbox"
                        checked={formData.can_create_alerts}
                        onChange={(e) => setFormData(prev => ({ ...prev, can_create_alerts: e.target.checked }))}
                        className="rounded border-gray-600 bg-gray-700 text-cerberus-green"
                      />
                      <span>Create Alerts</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 text-white">
                      <input
                        type="checkbox"
                        checked={formData.can_update_alerts}
                        onChange={(e) => setFormData(prev => ({ ...prev, can_update_alerts: e.target.checked }))}
                        className="rounded border-gray-600 bg-gray-700 text-cerberus-green"
                      />
                      <span>Update Alerts</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 text-white">
                      <input
                        type="checkbox"
                        checked={formData.can_read_alerts}
                        onChange={(e) => setFormData(prev => ({ ...prev, can_read_alerts: e.target.checked }))}
                        className="rounded border-gray-600 bg-gray-700 text-cerberus-green"
                      />
                      <span>Read Alerts</span>
                    </label>
                  </div>
                </div>

                {/* Expiration */}
                <div>
                  <label className="form-label">Expiration (optional)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={formData.expires_in_days || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, expires_in_days: e.target.value ? parseInt(e.target.value) : null }))}
                    className="input-field w-full"
                    placeholder="Days until expiration (leave empty for no expiration)"
                  />
                </div>

                {/* IP Restrictions */}
                <div>
                  <label className="form-label">Allowed IP Addresses (optional)</label>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={ipInput}
                        onChange={(e) => setIpInput(e.target.value)}
                        className="input-field flex-1"
                        placeholder="e.g., 192.168.1.0/24 or 10.0.0.1"
                      />
                      <button
                        type="button"
                        onClick={addIpAddress}
                        className="button-secondary"
                      >
                        Add
                      </button>
                    </div>
                    
                    {formData.allowed_ips.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.allowed_ips.map((ip, index) => (
                          <span
                            key={index}
                            className="flex items-center space-x-1 bg-gray-700 text-white px-2 py-1 rounded text-sm"
                          >
                            <span>{ip}</span>
                            <button
                              type="button"
                              onClick={() => removeIpAddress(ip)}
                              className="text-red-400 hover:text-red-300 ml-1"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Source Restrictions */}
                <div>
                  <label className="form-label">Allowed Sources (optional)</label>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={sourceInput}
                        onChange={(e) => setSourceInput(e.target.value)}
                        className="input-field flex-1"
                        placeholder="e.g., splunk, qradar, sentinel"
                      />
                      <button
                        type="button"
                        onClick={addSource}
                        className="button-secondary"
                      >
                        Add
                      </button>
                    </div>
                    
                    {formData.allowed_sources.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.allowed_sources.map((source, index) => (
                          <span
                            key={index}
                            className="flex items-center space-x-1 bg-gray-700 text-white px-2 py-1 rounded text-sm"
                          >
                            <span>{source}</span>
                            <button
                              type="button"
                              onClick={() => removeSource(source)}
                              className="text-red-400 hover:text-red-300 ml-1"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading || !formData.token_name.trim()}
                    className="button-primary flex-1"
                  >
                    {loading ? 'Creating...' : 'Create Token'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="button-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Token Modal */}
      {showEditModal && editingToken && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-cerberus-dark-light rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Edit Token: {editingToken.token_name}</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingToken(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleUpdateToken} className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Token Name *</label>
                    <input
                      type="text"
                      value={formData.token_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, token_name: e.target.value }))}
                      className="input-field w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Rate Limit (per minute)</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={formData.rate_limit_per_minute}
                      onChange={(e) => setFormData(prev => ({ ...prev, rate_limit_per_minute: parseInt(e.target.value) }))}
                      className="input-field w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="input-field w-full"
                    rows="3"
                  />
                </div>

                {/* Permissions */}
                <div>
                  <label className="form-label">Permissions</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 text-white">
                      <input
                        type="checkbox"
                        checked={formData.can_create_alerts}
                        onChange={(e) => setFormData(prev => ({ ...prev, can_create_alerts: e.target.checked }))}
                        className="rounded border-gray-600 bg-gray-700 text-cerberus-green"
                      />
                      <span>Create Alerts</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 text-white">
                      <input
                        type="checkbox"
                        checked={formData.can_update_alerts}
                        onChange={(e) => setFormData(prev => ({ ...prev, can_update_alerts: e.target.checked }))}
                        className="rounded border-gray-600 bg-gray-700 text-cerberus-green"
                      />
                      <span>Update Alerts</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 text-white">
                      <input
                        type="checkbox"
                        checked={formData.can_read_alerts}
                        onChange={(e) => setFormData(prev => ({ ...prev, can_read_alerts: e.target.checked }))}
                        className="rounded border-gray-600 bg-gray-700 text-cerberus-green"
                      />
                      <span>Read Alerts</span>
                    </label>
                  </div>
                </div>

                {/* Extend Expiration */}
                <div>
                  <label className="form-label">Extend Expiration</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={formData.expires_in_days || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, expires_in_days: e.target.value ? parseInt(e.target.value) : null }))}
                    className="input-field w-full"
                    placeholder="Extend expiration by X days from now"
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    Current expiration: {formatDate(editingToken.expires_at)}
                  </p>
                </div>

                {/* IP Restrictions */}
                <div>
                  <label className="form-label">Allowed IP Addresses</label>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={ipInput}
                        onChange={(e) => setIpInput(e.target.value)}
                        className="input-field flex-1"
                        placeholder="e.g., 192.168.1.0/24"
                      />
                      <button
                        type="button"
                        onClick={addIpAddress}
                        className="button-secondary"
                      >
                        Add
                      </button>
                    </div>
                    
                    {formData.allowed_ips.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.allowed_ips.map((ip, index) => (
                          <span
                            key={index}
                            className="flex items-center space-x-1 bg-gray-700 text-white px-2 py-1 rounded text-sm"
                          >
                            <span>{ip}</span>
                            <button
                              type="button"
                              onClick={() => removeIpAddress(ip)}
                              className="text-red-400 hover:text-red-300 ml-1"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Source Restrictions */}
                <div>
                  <label className="form-label">Allowed Sources</label>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={sourceInput}
                        onChange={(e) => setSourceInput(e.target.value)}
                        className="input-field flex-1"
                        placeholder="e.g., splunk, qradar"
                      />
                      <button
                        type="button"
                        onClick={addSource}
                        className="button-secondary"
                      >
                        Add
                      </button>
                    </div>
                    
                    {formData.allowed_sources.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.allowed_sources.map((source, index) => (
                          <span
                            key={index}
                            className="flex items-center space-x-1 bg-gray-700 text-white px-2 py-1 rounded text-sm"
                          >
                            <span>{source}</span>
                            <button
                              type="button"
                              onClick={() => removeSource(source)}
                              className="text-red-400 hover:text-red-300 ml-1"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading || !formData.token_name.trim()}
                    className="button-primary flex-1"
                  >
                    {loading ? 'Updating...' : 'Update Token'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingToken(null);
                      resetForm();
                    }}
                    className="button-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Token Display Modal */}
      {showTokenModal && createdToken && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-cerberus-dark-light rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-cerberus-green rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Token Created Successfully!</h2>
                <p className="text-gray-400 text-sm">
                  Please copy this token now. You won't be able to see it again!
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="form-label">Token Name</label>
                  <div className="input-field bg-gray-800 text-gray-300">
                    {createdToken.token_info.token_name}
                  </div>
                </div>

                <div>
                  <label className="form-label">API Token</label>
                  <div className="space-y-2">
                    <div className="bg-gray-800 text-gray-300 font-mono text-sm p-3 rounded-lg border border-gray-700 break-all max-h-32 overflow-y-auto">
                      {createdToken.token}
                    </div>
                    <button
                      onClick={() => copyToClipboard(createdToken.token)}
                      className="button-secondary w-full"
                      title="Copy to clipboard"
                    >
                      <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Token to Clipboard
                    </button>
                  </div>
                </div>

                <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h4 className="text-yellow-400 font-medium mb-1">Important Security Notice</h4>
                      <p className="text-yellow-200 text-sm">
                        Store this token securely. It provides access to your API and cannot be recovered if lost.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4 mt-6">
                <button
                  onClick={() => {
                    setShowTokenModal(false);
                    setCreatedToken(null);
                  }}
                  className="button-primary flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenManagement;