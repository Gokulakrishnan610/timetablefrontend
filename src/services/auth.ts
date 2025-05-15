import { api } from './api';

/**
 * Authentication service functions
 */
export const authService = {
  /**
   * Login user with email and password
   * @param credentials - User login credentials
   * @returns Login response
   */
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/api/auth/login/', credentials);
    
    // Extract token and user data based on response structure
    if (response.data) {
      // Store token
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      } else if (response.data.data && response.data.data.token) {
        localStorage.setItem('token', response.data.data.token);
      }
      
      // Handle different user data formats
      if (response.data.user) {
        // Case: { token, user: {...} }
        localStorage.setItem('user', JSON.stringify(response.data.user));
      } else if (response.data.data && response.data.data.user) {
        // Case: { message, data: { user: {...} } }
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      } else if (response.data.id) {
        // Case: Direct user object
        localStorage.setItem('user', JSON.stringify(response.data));
      }
    }
    
    return response;
  },

  /**
   * Log out the current user
   * @returns Logout response
   */
  logout: async () => {
    try {
      const response = await api.post('/api/auth/logout/');
      
      // Always clean up local storage regardless of response
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      return response;
    } catch (error) {
      // Clean up even if the API call fails
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw error;
    }
  },

  /**
   * Get the current user's profile
   * @returns Current user data
   */
  getCurrentUser: async () => {
    return api.get('/api/auth/profile/');
  },

  /**
   * Update the user's password
   * @param data - Password change data
   * @returns Response
   */
  changePassword: async (data: { current_password: string; new_password: string }) => {
    return api.post('/api/auth/password/change/', data);
  },

  /**
   * Request a password reset
   * @param email - User's email
   * @returns Response
   */
  requestPasswordReset: async (email: string) => {
    return api.post('/api/auth/password/reset/', { email });
  },

  /**
   * Reset password with token
   * @param data - Reset data with token and new password
   * @returns Response
   */
  resetPassword: async (data: { token: string; new_password: string }) => {
    return api.post('/api/auth/password/reset/confirm/', data);
  },
}; 