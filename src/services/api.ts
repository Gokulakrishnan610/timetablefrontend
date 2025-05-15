// Augment the AxiosInstance type to include our custom methods
declare module 'axios' {
  interface AxiosInstance {
    setBaseUrl(newBaseUrl: string): string;
  }
}

import axios from 'axios';

// Determine the base URL based on the environment
const getBaseUrl = () => {
  // Get from environment variable if available (highest priority)
  const envBaseUrl = import.meta.env.VITE_API_URL;
  if (envBaseUrl) return envBaseUrl;
  
  // Get from localStorage if available (allows manual override)
  const storedBaseUrl = localStorage.getItem('api_base_url');
  if (storedBaseUrl) return storedBaseUrl;
  
  // Determine based on hostname
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // If it's localhost, use localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  
  // Try multiple options for production/port-forwarded environments
  // Option 1: Same hostname but port 8000
  const portBasedUrl = `${protocol}//${hostname}:8000`;
  
  // Return the first option by default, client code should handle failures
  return portBasedUrl;
};

// Create an axios instance with default config
export const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add a helper function to change the base URL at runtime
api.setBaseUrl = (newBaseUrl: string): string => {
  api.defaults.baseURL = newBaseUrl;
  localStorage.setItem('api_base_url', newBaseUrl);
  console.log(`API base URL changed to: ${newBaseUrl}`);
  return newBaseUrl;
};

// Test API connection and data consistency
export const testApiConnection = async (urlsToTest: string[]) => {
  const results: Record<string, { success: boolean; status?: number; duration?: number; error?: string }> = {};
  let bestUrl: string | null = null;
  let bestResponseTime = Infinity;

  for (const url of urlsToTest) {
    const startTime = performance.now();
    try {
      // Test basic endpoint (e.g., health check or version)
      const response = await axios.get(`${url}/api/health/`, {
        timeout: 5000,
        headers: {
          'Accept': 'application/json'
        }
      });

      const duration = Math.round(performance.now() - startTime);
      
      results[url] = {
        success: true,
        status: response.status,
        duration
      };

      // Track the fastest successful response
      if (duration < bestResponseTime) {
        bestResponseTime = duration;
        bestUrl = url;
      }
    } catch (error: any) {
      results[url] = {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  return {
    results,
    bestUrl
  };
};

// Function to validate data consistency
export const validateDataConsistency = async () => {
  try {
    // Test a few key endpoints that should return consistent data
    const endpoints = [
      '/api/courses/',
      '/api/profile/',
      '/api/timetable/'
    ];

    const results = await Promise.all(endpoints.map(async (endpoint) => {
      const response = await api.get(endpoint);
      return {
        endpoint,
        status: response.status,
        dataSize: JSON.stringify(response.data).length,
        hasData: Array.isArray(response.data) ? response.data.length > 0 : Object.keys(response.data).length > 0
      };
    }));

    return {
      success: true,
      results
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add to headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Enhanced request logging
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
      headers: config.headers,
      data: config.data,
      params: config.params,
      timestamp: new Date().toISOString()
    });
    
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Enhanced response logging
    console.log(`[API Response] ${response.status} - ${response.config.url}`, {
      data: response.data,
      headers: response.headers,
      timestamp: new Date().toISOString(),
      responseTime: response.headers['x-response-time']
    });
    
    // Check for data inconsistencies
    if (response.data && typeof response.data === 'object') {
      console.log('[API Data Validation]', {
        url: response.config.url,
        dataSize: JSON.stringify(response.data).length,
        hasData: Array.isArray(response.data) ? response.data.length > 0 : Object.keys(response.data).length > 0
      });
    }
    
    return response;
  },
  (error) => {
    // Enhanced error logging
    console.error('[API Error]', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      timestamp: new Date().toISOString(),
      headers: error.response?.headers,
      message: error.message
    });
    
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      if (!window.location.pathname.includes('/auth/login')) {
        const isInitialPageLoad = !document.referrer || document.referrer.includes(window.location.origin);
        
        if (!isInitialPageLoad) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/auth/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Authentication API
export const authApi = {
  // Login
  login: (data: { email: string; password: string }) => api.post('/api/auth/login/', data),
  
  // Register
  register: (data: any) => api.post('/api/auth/register/', data),
  
  // Logout
  logout: () => api.post('/api/auth/logout/'),
  
  // Get current user profile
  getProfile: () => api.get('/api/auth/profile/'),
  
  // Update password
  updatePassword: (data: { current_password: string; new_password: string }) => 
    api.post('/api/auth/password/change/', data),
    
  // Request password reset
  requestPasswordReset: (data: { email: string }) => 
    api.post('/api/auth/password/reset/', data),
    
  // Reset password with token
  resetPassword: (data: { token: string; new_password: string }) => 
    api.post('/api/auth/password/reset/confirm/', data),
};

// Student Profile API
export const studentProfileApi = {
  // Get student profile details
  getProfile: async () => {
    try {
      // Try the student-specific endpoint first
      return await api.get('/api/students/profile/');
    } catch (error) {
      console.warn('Student profile API failed, falling back to auth profile:', error);
      // Fall back to the auth profile endpoint which works
      return api.get('/api/auth/profile/');
    }
  },
  
  // Update student profile details
  updateProfile: (data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
  }) => api.post('/api/auth/profile/update/', data),
  
  // Update password
  updatePassword: (data: { current_password: string; new_password: string }) => 
    api.post('/api/auth/change-password/', data),
  
  // Get academic information
  getAcademicInfo: async () => {
    try {
      return await api.get('/api/students/academic-info/');
    } catch (error) {
      console.warn('Academic info API failed:', error);
      // Return empty data as fallback
      return { data: { } };
    }
  },
};

// Dashboard API
export const dashboardApi = {
  // Get dashboard summary data
  getSummary: () => api.get('/api/dashboard/summary/'),
  
  // Get today's classes
  getTodayClasses: () => api.get('/api/dashboard/today-classes/'),
  
  // Get notifications
  getNotifications: () => api.get('/api/dashboard/notifications/'),
  
  // Mark notification as read
  markNotificationAsRead: (id: number) => api.post(`/api/dashboard/notifications/${id}/read/`),
};

// Debug API
export const debugApi = {
  // Check API health
  checkHealth: () => api.get('/api/health/'),
  
  // Get all debug info
  getDebugInfo: () => api.get('/api/debug/'),
  
  // Get information about current student course API status
  checkStudentCourseStatus: async () => {
    const results: Record<string, any> = {};
    
    try {
      // Try health check
      results.health = await api.get('/api/health/');
    } catch (e) {
      results.health = { error: e };
    }
    
    try {
      // Try debug info
      results.debug = await api.get('/api/debug/');
    } catch (e) {
      results.debug = { error: e };
    }
    
    try {
      // Try general courses
      results.courses = await api.get('/api/course/');
    } catch (e) {
      results.courses = { error: e };
    }
    
    try {
      // Try student course API - available_courses
      results.studentCourses = await api.get('/api/student-courses/courses/available_courses/');
    } catch (e) {
      results.studentCourses = { error: e };
    }
    
    try {
      // Try student course API - available_courses_all
      results.allCourses = await api.get('/api/student-courses/courses/available_courses_all/');
    } catch (e) {
      results.allCourses = { error: e };
    }
    
    try {
      // Check student info
      results.studentCoursesDebug = await api.get('/api/student-courses/courses/debug_info/');
    } catch (e) {
      results.studentCoursesDebug = { error: e };
    }
    
    return results;
  }
};

// Timetable API
export const timetableApi = {
  // Get student timetable
  getTimetable: () => api.get('/api/students/timetable/'),
  
  // Get timetable for specific day
  getTimetableByDay: (day: string) => api.get(`/api/students/timetable/day/${day}/`),
  
  // Get upcoming classes
  getUpcomingClasses: () => api.get('/api/students/timetable/upcoming/'),
  
  // Alias for getTimetable (used in timetable page)
  getMyTimetable: () => api.get('/api/students/timetable/'),
  
  // Get timetable statistics
  getTimetableStats: () => api.get('/api/students/timetable/stats/'),
};

// Student Course API
export const studentCourseApi = {
  // Get available courses for selection
  getAvailableCourses: async () => {
    // First try to get student profile to ensure we're authenticated
    try {
      const profileCheck = await api.get('/api/auth/profile/');
      if (!profileCheck.data) {
        throw new Error('No profile data available');
      }
      
      // Get student info for proper filtering
      const studentInfo = await api.get('/api/students/profile/');
      console.log('Student info:', studentInfo.data);
      
      // Try to get courses from the primary endpoint
      try {
        console.log('Trying primary endpoint for courses');
        const response = await api.get('/api/student-courses/courses/available_courses/');
        console.log('Primary endpoint response:', response.data);
        return response;
      } catch (primaryError) {
        console.warn('Primary endpoint failed:', primaryError);
        
        // Fall back to filtered courses endpoint
        try {
          console.log('Trying filtered courses endpoint');
          const response = await api.get('/api/student-courses/courses/filtered_courses/', {
            params: {
              department_id: studentInfo.data.dept_id,
              semester: studentInfo.data.current_semester,
              year: studentInfo.data.current_year
            }
          });
          console.log('Filtered endpoint response:', response.data);
          return response;
        } catch (filteredError) {
          console.warn('Filtered endpoint failed:', filteredError);
          
          // Last resort: Get all courses and filter client-side
          console.log('Falling back to all courses with client-side filtering');
          const allCoursesResponse = await api.get('/api/course/');
          
          // Filter courses based on student info
          const filteredCourses = allCoursesResponse.data.filter((course: any) => 
            course.for_dept_id === studentInfo.data.dept_id &&
            course.course_semester === studentInfo.data.current_semester
          );
          
          return { data: filteredCourses };
        }
      }
    } catch (error) {
      console.error('Course fetching error:', error);
      throw error;
    }
  },
  
  // Get my selected courses
  getMyCourseSelections: async () => {
    try {
      return await api.get('/api/student-courses/courses/dashboard/');
    } catch (error) {
      console.error('Failed to fetch course selections:', error);
      // Return empty array as fallback
      return { data: [] };
    }
  },
  
  // Get course details by ID
  getCourseDetails: async (courseId: number) => {
    try {
      return await api.get(`/api/course/${courseId}/`);
    } catch (error) {
      console.error(`Failed to fetch details for course ${courseId}:`, error);
      throw error;
    }
  },
  
  // Get available teachers for a course
  getAvailableTeachers: async (courseId: string) => {
    try {
      console.log('Fetching teachers for course:', courseId);
      
      // First try the primary endpoint
      try {
        const response = await api.get(`/api/student-courses/courses/available_teachers/`, {
          params: { course_id: courseId }
        });
        console.log('Primary teacher endpoint response:', response.data);
        return response;
      } catch (primaryError) {
        console.warn('Primary teacher endpoint failed:', primaryError);
        
        // Fall back to teacher-course relationships
        try {
          console.log('Trying teacher-course endpoint');
          const teacherCourses = await api.get(`/api/teacher-course/by_course/${courseId}/`);
          
          // Get full teacher details for each teacher course
          const teacherPromises = teacherCourses.data.map((tc: any) =>
            api.get(`/api/teacher/${tc.teacher_id}/`)
          );
          
          const teacherResponses = await Promise.all(teacherPromises);
          const teachers = teacherResponses.map(response => response.data);
          
          console.log('Teacher-course endpoint response:', teachers);
          return { data: teachers };
        } catch (teacherCourseError) {
          console.warn('Teacher-course endpoint failed:', teacherCourseError);
          throw teacherCourseError;
        }
      }
    } catch (error) {
      console.error('Teacher fetching error:', error);
      throw error;
    }
  },
  
  // Get available slots for a course and teacher
  getAvailableSlots: async (courseId: string, teacherId: string) => {
    // Define all possible endpoints in order of preference
    const endpoints = [
      `/api/student-courses/courses/available_slots/?course_id=${courseId}&teacher_id=${teacherId}`,
      `/api/student-courses/courses/filtered_slots/?course_id=${courseId}&teacher_id=${teacherId}`,
      `/api/timetable/timetables/?course_id=${courseId}&teacher_id=${teacherId}`,
      `/api/slot/`
    ];
    
    let lastError = null;
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying slots endpoint: ${endpoint}`);
        const response = await api.get(endpoint);
        
        // Special handling for generic slot endpoint
        if (endpoint === '/api/slot/') {
          return {
            data: {
              warning: "Using generic slots as fallback. Time conflicts may not be detected.",
              slots: response.data
            }
          };
        }
        
        return response;
      } catch (error) {
        console.warn(`Failed to fetch slots from ${endpoint}:`, error);
        lastError = error;
      }
    }
    
    console.error('All slot endpoints failed');
    throw lastError;
  },
  
  // Create course selection
  createCourseSelection: async (data: { course_id: number; teacher_id: number; slot_id: number }) => {
    try {
      return await api.post('/api/student-courses/courses/', data);
    } catch (error) {
      console.error('Failed to create course selection:', error);
      throw error;
    }
  },
  
  // Delete course selection
  deleteCourseSelection: async (id: number) => {
    try {
      return await api.delete(`/api/student-courses/courses/${id}/`);
    } catch (error) {
      console.error(`Failed to delete course selection ${id}:`, error);
      throw error;
    }
  },
  
  // Select a course (enroll)
  selectCourse: async (id: number) => {
    try {
      return await api.post(`/api/student-courses/courses/enroll/${id}/`);
    } catch (error) {
      console.error(`Failed to enroll in course ${id}:`, error);
      throw error;
    }
  },
  
  // Drop a course (unenroll)
  dropCourse: async (id: number) => {
    try {
      return await api.post(`/api/student-courses/courses/drop/${id}/`);
    } catch (error) {
      console.error(`Failed to drop course ${id}:`, error);
      throw error;
    }
  },
  
  // Get departments
  getDepartments: async () => {
    try {
      return await api.get('/api/department/');
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      return { data: [] };
    }
  },
}; 