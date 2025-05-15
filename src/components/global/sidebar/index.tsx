import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  X,
  LogOut,
  User,
  Settings,
  GraduationCap
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { useEffect, useState } from "react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(window.innerWidth >= 1024);
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      // No need for toast here as the logout function in auth context already shows one
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  const menuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      title: "Course Selection",
      icon: BookOpen,
      href: "/course-selection",
    },
    {
      title: "My Timetable",
      icon: Calendar,
      href: "/timetable",
    },
    {
      title: "Profile",
      icon: User,
      href: "/profile",
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/settings",
    },
  ];

  // Render the sidebar content (shared between desktop and mobile)
  const renderSidebarContent = () => (
    <div className="flex flex-col justify-between h-[calc(100%-5rem)]">
      <div className="flex-1 px-4 py-5">
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out",
                location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
                  ? "bg-primary/10 text-primary border-l-4 border-primary shadow-sm"
                  : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
              )}
              onClick={!isDesktop ? onClose : undefined}
            >
              <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
              {item.title}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t p-4 bg-muted/10">
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-background shadow-sm">
          <Avatar className="h-10 w-10 border-2 border-primary/20 overflow-hidden">
            <div className="aspect-square h-full w-full flex items-center justify-center">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold h-full w-full flex items-center justify-center">
                {user?.first_name?.[0]?.toUpperCase() || ''}
                {user?.last_name?.[0]?.toUpperCase() || ''}
              </AvatarFallback>
            </div>
          </Avatar>
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate">
              {user?.first_name || ''} {user?.last_name || ''}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email || user?.id || 'User'}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-all"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  // For desktop, render a fixed sidebar without overlay
  if (isDesktop) {
    return (
      <div className="h-full w-64 border-r bg-background shadow-sm">
        <div className="flex h-20 items-center px-4 border-b bg-muted/10">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-primary/10 p-2 rounded-md">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Student Portal</h1>
              <p className="text-xs text-muted-foreground">University Management</p>
            </div>
          </Link>
        </div>
        {renderSidebarContent()}
      </div>
    );
  }

  // For mobile, render a drawer with overlay
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 h-full border-r bg-background shadow-xl transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-20 items-center justify-between px-4 border-b bg-muted/10">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-primary/10 p-2 rounded-md">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Student Portal</h1>
              <p className="text-xs text-muted-foreground">University Management</p>
            </div>
          </Link>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-destructive/10 hover:text-destructive">
            <X className="h-5 w-5" />
          </Button>
        </div>
        {renderSidebarContent()}
      </div>
    </>
  );
} 