import { createContext, useContext, useState, useEffect } from 'react';
import config from '../config/env';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Get stored tokens
  const getStoredTokens = () => {
    const accessToken = localStorage.getItem(config.STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = localStorage.getItem(config.STORAGE_KEYS.REFRESH_TOKEN);
    const userData = localStorage.getItem(config.STORAGE_KEYS.USER_DATA);
    
    return {
      accessToken,
      refreshToken,
      userData: userData ? JSON.parse(userData) : null
    };
  };

  // Store tokens
  const storeTokens = (accessToken, refreshToken, userData) => {
    localStorage.setItem(config.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(config.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    localStorage.setItem(config.STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  };

  // Clear tokens
  const clearTokens = () => {
    localStorage.removeItem(config.STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(config.STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(config.STORAGE_KEYS.USER_DATA);
  };

  // API call helper
  const apiCall = async (endpoint, options = {}) => {
    const { accessToken } = getStoredTokens();
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    };

    const response = await fetch(`${config.API_BASE_URL}${endpoint}`, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.detail || errorData.error || 'Request failed');
    }

    return response.json();
  };

  // Refresh token
  const refreshAccessToken = async () => {
    try {
      const { refreshToken } = getStoredTokens();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiCall(config.API_ENDPOINTS.REFRESH, {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      storeTokens(response.access_token, response.refresh_token, response.user_info);
      setUser(response.user_info);
      setIsAuthenticated(true);
      
      return response.access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      throw error;
    }
  };

  // Login
  const login = async (username, password) => {
    try {
      setIsLoading(true);
      
      const response = await apiCall(config.API_ENDPOINTS.LOGIN, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      storeTokens(response.access_token, response.refresh_token, response.user_info);
      setUser(response.user_info);
      setIsAuthenticated(true);
      
      return { success: true, data: response };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async (logoutAll = false) => {
    try {
      const endpoint = logoutAll 
        ? config.API_ENDPOINTS.LOGOUT_ALL 
        : config.API_ENDPOINTS.LOGOUT;
      
      await apiCall(endpoint, { method: 'POST' });
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      clearTokens();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Get current user
  const getCurrentUser = async () => {
    try {
      const response = await apiCall(config.API_ENDPOINTS.ME);
      setUser(response);
      setIsAuthenticated(true);
      
      // Update stored user data
      const { accessToken, refreshToken } = getStoredTokens();
      storeTokens(accessToken, refreshToken, response);
      
      return response;
    } catch (error) {
      console.error('Get current user failed:', error);
      await logout();
      throw error;
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await apiCall(config.API_ENDPOINTS.CHANGE_PASSWORD, {
        method: 'PUT',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      
      return { success: true };
    } catch (error) {
      console.error('Password change failed:', error);
      return { success: false, error: error.message };
    }
  };

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { accessToken, userData } = getStoredTokens();
        
        if (!accessToken) {
          setIsLoading(false);
          return;
        }

        // Try to get current user to validate token
        try {
          await getCurrentUser();
        } catch (error) {
          // If getting current user fails, try to refresh token
          try {
            await refreshAccessToken();
          } catch (refreshError) {
            // If refresh fails, clear everything
            clearTokens();
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        clearTokens();
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Setup token refresh timer
  useEffect(() => {
    if (!isAuthenticated) return;

    const setupTokenRefresh = () => {
      // Refresh token every 25 minutes (tokens expire in 30 minutes)
      const refreshInterval = setInterval(async () => {
        try {
          await refreshAccessToken();
        } catch (error) {
          console.error('Automatic token refresh failed:', error);
          clearInterval(refreshInterval);
        }
      }, 25 * 60 * 1000); // 25 minutes

      return refreshInterval;
    };

    const refreshInterval = setupTokenRefresh();

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isAuthenticated]);

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    getCurrentUser,
    changePassword,
    refreshAccessToken,
    apiCall,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};