import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error } = useAuth();
  
  // Get the intended destination from location state or default to dashboard
  const from = (location.state?.from?.pathname as string) || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(''); // Clear previous errors
    
    // Add basic form validation
    if (!email.trim()) {
      setErrorMessage('Email is required');
      return;
    }
    
    if (!password.trim()) {
      setErrorMessage('Password is required');
      return;
    }
    
    try {
      console.log('Attempting login with:', email);
      
      // Call the login function from auth context
      await login(email, password);
      
      console.log('Login successful, navigation should happen automatically');
      
      // As a fallback, navigate manually if auth context didn't redirect
      setTimeout(() => {
        if (window.location.pathname.includes('/auth/login')) {
          console.log('Fallback navigation to: ', from);
          navigate(from, { replace: true });
        }
      }, 1000);
      
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Provide more specific error messages
      if (error.response?.status === 401) {
        setErrorMessage('Invalid credentials. Please check your email and password.');
      } else if (error.response?.status === 403) {
        setErrorMessage('Your account has been disabled. Please contact administrator.');
      } else if (error.response?.data?.detail) {
        setErrorMessage(error.response.data.detail);
      } else if (error.message) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Login failed. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Student Portal Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the university portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(errorMessage || error) && (
            <Alert variant="destructive" className="mb-4 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription className="ml-2">
                {errorMessage || (error instanceof Error ? error.message : 'An error occurred')}
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link 
                  to="/auth/forgot-password" 
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-4">
          <p className="text-sm text-muted-foreground">
            Having trouble? Contact{" "}
            <a 
              href="mailto:support@university.edu" 
              className="text-primary hover:underline"
            >
              IT Support
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
} 