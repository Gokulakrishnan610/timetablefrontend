import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import Sidebar from './sidebar';
import { useState, useEffect } from 'react';
import { Menu, Bell, Sun, Moon, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function Layout() {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Handle responsive sidebar based on screen size
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(false);
      }
    };

    handleResize(); // Call once on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle theme toggling
  useEffect(() => {
    // Check if user has a theme preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      setTheme(prefersDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, []);
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('theme', newTheme);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar - always visible on large screens */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <Sidebar isOpen={true} onClose={() => {}} />
      </div>
      
      {/* Mobile sidebar - overlay when opened */}
      {isMobile && (
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
      )}
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
        <header className="h-16 flex items-center justify-between border-b px-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10 shadow-sm">
          <div className="flex items-center">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(true)}
                className="mr-4 rounded-full hover:bg-accent"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="font-medium">
              Welcome, {user?.first_name || 'Student'}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Theme toggle button */}
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            
            {/* Notifications button */}
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full relative"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary"></span>
            </Button>
            
            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="rounded-full h-8 w-8 p-0 overflow-hidden"
                >
                  <Avatar className="h-8 w-8 overflow-hidden">
                    <div className="aspect-square h-full w-full flex items-center justify-center">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold h-full w-full flex items-center justify-center">
                        {user?.first_name?.[0]?.toUpperCase() || ''}
                        {user?.last_name?.[0]?.toUpperCase() || ''}
                      </AvatarFallback>
                    </div>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem className="cursor-pointer" asChild>
                  <a href="/profile" className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" asChild>
                  <a href="/settings" className="flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-accent/5">
          <div className="max-w-7xl mx-auto bg-background rounded-lg shadow-sm p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
} 