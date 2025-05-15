import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  
  // Check for token directly to handle initial page load
  const hasToken = !!localStorage.getItem('token');
  
  // Show loading state while checking authentication, but only if we have a token
  if (isLoading && hasToken) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated and no token
  if (!isAuthenticated && !hasToken) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }
  
  // Render children if authenticated or has token (during initial load)
  return <>{children}</>;
}; 