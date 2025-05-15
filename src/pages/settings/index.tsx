import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { studentProfileApi, api } from '@/services/api';
import { Sun, Moon, Bell, BellOff, Eye, EyeOff, Globe, Server } from 'lucide-react';
import { ApiConnectionTester } from '@/components/global/ApiConnectionTester';

// Preferences interface
interface UserPreferences {
  theme: 'light' | 'dark';
  emailNotifications: boolean;
  appNotifications: boolean;
  enableAnimations: boolean;
}

export default function SettingsPage() {
  // Password state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // Get stored preferences or defaults
  const getStoredPreferences = (): UserPreferences => {
    // Try to get from localStorage
    const storedPrefs = localStorage.getItem('user-preferences');
    if (storedPrefs) {
      try {
        return JSON.parse(storedPrefs);
      } catch (e) {
        console.error('Error parsing stored preferences:', e);
      }
    }
    
    // Return defaults
    return {
      theme: 'light',
      emailNotifications: true,
      appNotifications: true,
      enableAnimations: true
    };
  };
  
  // Initialize state with stored preferences
  const [preferences, setPreferences] = useState<UserPreferences>(getStoredPreferences());
  
  // Apply theme when component mounts or theme changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', preferences.theme === 'dark');
  }, [preferences.theme]);
  
  // Save preferences to localStorage
  const savePreferences = (newPrefs: UserPreferences) => {
    try {
      localStorage.setItem('user-preferences', JSON.stringify(newPrefs));
    } catch (e) {
      console.error('Error saving preferences:', e);
    }
  };

  const toggleTheme = () => {
    const newTheme = preferences.theme === 'light' ? 'dark' : 'light' as 'light' | 'dark';
    const newPrefs = { ...preferences, theme: newTheme };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
    toast.success(`Theme changed to ${newTheme} mode`);
  };

  const toggleSetting = (setting: keyof UserPreferences) => {
    if (typeof preferences[setting] === 'boolean') {
      const newPrefs = { 
        ...preferences, 
        [setting]: !preferences[setting as keyof UserPreferences] 
      };
      setPreferences(newPrefs);
      savePreferences(newPrefs);
      toast.success(`Setting updated`);
    }
  };

  // Password change mutation
  const { mutate: changePassword, isPending: isChangingPassword } = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) => 
      studentProfileApi.updatePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    },
    onError: (error: any) => {
      console.error('Password change error:', error);
      
      // Handle specific error messages from server
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Failed to change password. Please check your current password and try again.');
      }
    }
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.new_password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    
    // Submit password change
    changePassword({
      current_password: passwordData.current_password,
      new_password: passwordData.new_password
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize how the application looks on your device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Select light or dark theme
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={toggleTheme}
                >
                  {preferences.theme === 'light' ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="animations">Animations</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable animations
                  </p>
                </div>
                <Switch 
                  id="animations"
                  checked={preferences.enableAnimations}
                  onCheckedChange={() => toggleSetting('enableAnimations')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Configure how you want to be notified
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label 
                    htmlFor="email-notifications"
                    className="flex items-center gap-2"
                  >
                    <Bell className="h-4 w-4" />
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch 
                  id="email-notifications"
                  checked={preferences.emailNotifications}
                  onCheckedChange={() => toggleSetting('emailNotifications')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label 
                    htmlFor="app-notifications"
                    className="flex items-center gap-2"
                  >
                    <BellOff className="h-4 w-4" />
                    App Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive in-app notifications
                  </p>
                </div>
                <Switch 
                  id="app-notifications"
                  checked={preferences.appNotifications}
                  onCheckedChange={() => toggleSetting('appNotifications')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Account Security</CardTitle>
            <CardDescription>
              Manage your account security settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="relative">
                  <Label htmlFor="current_password">Current Password</Label>
                  <div className="relative mt-1">
                    <Input 
                      id="current_password"
                      type={showPassword.current ? "text" : "password"}
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({
                        ...passwordData,
                        current_password: e.target.value
                      })}
                      className="pr-10"
                      placeholder="••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword({...showPassword, current: !showPassword.current})}
                    >
                      {showPassword.current ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <Label htmlFor="new_password">New Password</Label>
                  <div className="relative mt-1">
                    <Input 
                      id="new_password"
                      type={showPassword.new ? "text" : "password"}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({
                        ...passwordData,
                        new_password: e.target.value
                      })}
                      className="pr-10"
                      placeholder="••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword({...showPassword, new: !showPassword.new})}
                    >
                      {showPassword.new ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="relative md:col-span-2">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <div className="relative mt-1">
                    <Input 
                      id="confirm_password"
                      type={showPassword.confirm ? "text" : "password"}
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({
                        ...passwordData,
                        confirm_password: e.target.value
                      })}
                      className="pr-10"
                      placeholder="••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword({...showPassword, confirm: !showPassword.confirm})}
                    >
                      {showPassword.confirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? 'Changing Password...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Add API Connection Settings Card */}
        <Card className="md:col-span-2 mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              API Connection Settings
            </CardTitle>
            <CardDescription>
              Configure and test connections to the university API server
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Globe className="h-4 w-4" />
                <span>Current API URL: {api.defaults.baseURL}</span>
              </div>
              <ApiConnectionTester />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 