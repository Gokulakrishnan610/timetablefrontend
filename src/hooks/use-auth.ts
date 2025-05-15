import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth';

export interface User {
  id?: number | string;
  student_id?: string;
  email: string;
  first_name: string;
  last_name: string;
  gender?: string;
  phone_number?: string;
  department?: string;
  avatar?: string;
  role?: string;
  user_type?: string;
}

/**
 * Hook to check if the user is authenticated
 * @returns True if the user is authenticated, false otherwise
 */
export function useIsAuthenticated() {
  const { data: user, isLoading } = useCurrentUser();
  
  // Consider the user authenticated if user data exists
  const isAuthenticated = !!user;
  
  return { isAuthenticated, isLoading };
}

/**
 * Hook to get the current user
 * @returns Current user data, loading state, and error state
 */
export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const response = await authService.getCurrentUser();
        if (response && response.data) {
          // Store user data in localStorage for offline/fallback access
          localStorage.setItem('user', JSON.stringify(response.data));
          return response.data;
        }
        return null;
      } catch (error) {
        console.error('Error fetching current user:', error);
        
        // Try to get user from localStorage as fallback
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            return JSON.parse(storedUser);
          } catch (e) {
            console.error('Error parsing stored user:', e);
          }
        }
        
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to handle user logout
 * @returns Logout function
 */
export function useLogout() {
  const queryClient = useQueryClient();
  
  const logout = async () => {
    try {
      // Use the authService for logout
      await authService.logout();
      
      // Invalidate all queries to clear cache
      queryClient.clear();
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if the API call fails, we should still clear local storage
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } finally {
      // Always redirect to login page - use the correct path
      window.location.href = '/auth/login';
    }
  };
  
  return { logout };
} 