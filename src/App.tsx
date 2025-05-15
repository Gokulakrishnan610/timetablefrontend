import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import LoginPage from './pages/auth/login';
import DashboardPage from './pages/dashboard';
import CourseSelectionPage from './pages/course-selection';
import CourseDetailPage from './pages/course-selection/course-detail';
import TimetablePage from './pages/timetable';
import ProfilePage from './pages/profile';
import SettingsPage from './pages/settings';
import Layout from './components/global/layout';
import { ErrorBoundary } from './components/global/error-boundary';
import { QueryErrorBoundary } from './components/global/query-error';
import { ErrorProvider } from './contexts/error-context';
import { AuthProvider } from './contexts/auth-context';
import { ProtectedRoute } from './components/auth/protected-route';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <ErrorProvider>
        <QueryClientProvider client={queryClient}>
          <Router>
            <AuthProvider>
              <Routes>
                {/* Auth routes */}
                <Route path="/auth/login" element={<LoginPage />} />
                {/* Redirect old login path to new one for backward compatibility */}
                <Route path="/login" element={<Navigate to="/auth/login" replace />} />
                
                {/* Protected routes */}
                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="course-selection" element={<CourseSelectionPage />} />
                  <Route path="course-selection/:courseId" element={<CourseDetailPage />} />
                  <Route path="timetable" element={<TimetablePage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
                
                {/* Catch all route - redirect to dashboard */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AuthProvider>
          </Router>
          <Toaster position="top-right" />
          <QueryErrorBoundary />
        </QueryClientProvider>
      </ErrorProvider>
    </ErrorBoundary>
  );
}

export default App;
