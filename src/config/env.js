// Environment configuration
const config = {
    // Backend API URL - reads from environment variable
    API_BASE_URL: import.meta.env.VITE_BACKEND_BASEURL || 'http://localhost:8000',
    
    // API endpoints
    API_ENDPOINTS: {
      LOGIN: '/api/v1/auth/login',
      REFRESH: '/api/v1/auth/refresh',
      LOGOUT: '/api/v1/auth/logout',
      LOGOUT_ALL: '/api/v1/auth/logout-all',
      ME: '/api/v1/auth/me',
      CHANGE_PASSWORD: '/api/v1/auth/me/password',
      USERS: '/api/v1/auth/users',
      HEALTH: '/health',
    },
  
    // App configuration
    APP_NAME: 'Cerberus IR',
    APP_VERSION: '1.0.0',
    
    // Token storage keys
    STORAGE_KEYS: {
      ACCESS_TOKEN: 'cerberus_access_token',
      REFRESH_TOKEN: 'cerberus_refresh_token',
      USER_DATA: 'cerberus_user_data',
    },
  
    // Token expiry buffer (refresh token 5 minutes before expiry)
    TOKEN_REFRESH_BUFFER: 5 * 60 * 1000, // 5 minutes in milliseconds
  };
  
  export default config;