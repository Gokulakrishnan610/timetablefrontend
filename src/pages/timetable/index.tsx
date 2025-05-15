import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { timetableApi } from '@/services/api';
import { toast } from 'sonner';

interface TimetableEntry {
  id: number;
  course: {
    id: number;
    code: string;
    name: string;
  };
  teacher: {
    id: number;
    name: string;
  };
  slot: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
}

interface TimetableStats {
  totalCourses: number;
  totalClassHours: number;
  daysWithClasses: number;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

export default function TimetablePage() {
  const [view, setView] = useState<'week' | 'list'>('week');
  const [currentDay, setCurrentDay] = useState<string>(
    new Date().toLocaleDateString('en-US', { weekday: 'long' })
  );

  // Fetch timetable data
  const { data: timetableData = [], isLoading: isLoadingTimetable } = useQuery<TimetableEntry[]>({
    queryKey: ['timetable'],
    queryFn: async () => {
      try {
        const response = await timetableApi.getMyTimetable();
        
        // Ensure response.data is an array
        const timetableEntries = Array.isArray(response.data) ? response.data : 
                               (response.data?.results && Array.isArray(response.data.results)) ? 
                               response.data.results : [];
                               
        // Map API response to match our expected format
        return timetableEntries.map((entry: any) => ({
          id: entry.id,
          course: {
            id: entry.course_id || entry.course?.id || 0,
            code: entry.course_code || entry.course?.code || '',
            name: entry.course_name || entry.course?.name || '',
          },
          teacher: {
            id: entry.teacher_id || entry.teacher?.id || 0,
            name: entry.teacher_name || entry.teacher?.name || '',
          },
          slot: entry.slot_name || entry.slot || '',
          day: entry.day,
          startTime: entry.start_time || entry.startTime || '',
          endTime: entry.end_time || entry.endTime || '',
          room: entry.room_name || entry.room || '',
        }));
      } catch (error) {
        console.error('Error fetching timetable:', error);
        toast.error('Could not load timetable data.');
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Fetch timetable statistics
  const { data: timetableStats, isLoading: isLoadingStats } = useQuery<TimetableStats>({
    queryKey: ['timetable-stats'],
    queryFn: async () => {
      try {
        const response = await timetableApi.getTimetableStats();
        return response.data;
      } catch (error) {
        console.error('Error fetching timetable stats:', error);
        // Calculate from timetable data
        if (timetableData && timetableData.length > 0) {
          return {
            totalCourses: new Set(timetableData.map(entry => entry.course.id)).size,
            totalClassHours: parseFloat(getTotalClassHours(timetableData)),
            daysWithClasses: new Set(timetableData.map(entry => entry.day)).size
          };
        }
        return {
          totalCourses: 0,
          totalClassHours: 0,
          daysWithClasses: 0
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: timetableData.length > 0,
    retry: 2,
  });

  // Ensure timetable is always an array
  const timetable = Array.isArray(timetableData) ? timetableData : [];

  const nextDay = () => {
    const currentIndex = DAYS.indexOf(currentDay);
    const nextIndex = (currentIndex + 1) % DAYS.length;
    setCurrentDay(DAYS[nextIndex]);
  };

  const previousDay = () => {
    const currentIndex = DAYS.indexOf(currentDay);
    const prevIndex = (currentIndex - 1 + DAYS.length) % DAYS.length;
    setCurrentDay(DAYS[prevIndex]);
  };

  const getEntryByDayAndTime = (day: string, time: string) => {
    return timetable.find(
      entry => entry.day === day && 
        entry.startTime <= time && 
        entry.endTime > time
    );
  };
  
  const getDayEntries = (day: string) => {
    return timetable.filter(entry => entry.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // Get total courses and total class hours per week
  const getTotalCourses = (): number => {
    if (timetableStats) {
      return timetableStats.totalCourses;
    }
    // Get unique course IDs
    const courseIds = new Set(timetable.map(entry => entry.course.id));
    return courseIds.size;
  };

  const getTotalClassHours = (entries = timetable): string => {
    if (timetableStats) {
      return timetableStats.totalClassHours.toFixed(1);
    }
    
    // Calculate total hours based on start and end times
    return entries.reduce((total, entry) => {
      const start = Number(entry.startTime.split(':')[0]);
      const end = Number(entry.endTime.split(':')[0]);
      // Add fractional hours
      const startMinutes = Number(entry.startTime.split(':')[1]) / 60;
      const endMinutes = Number(entry.endTime.split(':')[1]) / 60;
      return total + (end + endMinutes) - (start + startMinutes);
    }, 0).toFixed(1);
  };

  // Color mapping for consistent course colors
  const getCourseColor = (courseId: number) => {
    const colors = [
      'bg-blue-100 border-blue-300 text-blue-800',
      'bg-green-100 border-green-300 text-green-800',
      'bg-yellow-100 border-yellow-300 text-yellow-800',
      'bg-purple-100 border-purple-300 text-purple-800',
      'bg-pink-100 border-pink-300 text-pink-800',
      'bg-indigo-100 border-indigo-300 text-indigo-800',
    ];
    return colors[courseId % colors.length];
  };

  const renderWeekView = () => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 border bg-muted font-medium text-left min-w-[80px]">Time</th>
            {DAYS.map((day) => (
              <th key={day} className="p-2 border bg-muted font-medium text-left min-w-[180px]">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIMES.map((time) => (
            <tr key={time}>
              <td className="p-2 border font-medium">{time}</td>
              {DAYS.map((day) => {
                const entry = getEntryByDayAndTime(day, time);
                return (
                  <td key={`${day}-${time}`} className="p-2 border relative h-14 align-top">
                    {entry && (
                      <div className={cn(
                        "absolute inset-1 rounded-md border p-1 text-xs overflow-hidden",
                        getCourseColor(entry.course.id)
                      )}>
                        <div className="font-medium truncate">{entry.course.name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{entry.startTime} - {entry.endTime}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          <span>Room {entry.room}</span>
                        </div>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderDayView = () => {
    const entries = getDayEntries(currentDay);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={previousDay}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <h3 className="text-lg font-medium">{currentDay}</h3>
          <Button variant="outline" size="sm" onClick={nextDay}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        
        {entries.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No classes scheduled for {currentDay}
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div 
                key={entry.id}
                className={cn(
                  "p-3 rounded-md border",
                  getCourseColor(entry.course.id)
                )}
              >
                <div className="font-medium">{entry.course.name}</div>
                <div className="text-sm">
                  <div className="flex items-center mt-1">
                    <Clock className="h-4 w-4 mr-1" />
                    {entry.startTime} - {entry.endTime}
                  </div>
                  <div className="flex items-center mt-1">
                    <MapPin className="h-4 w-4 mr-1" />
                    Room {entry.room}
                  </div>
                </div>
                <div className="text-sm mt-1">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {entry.teacher.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoadingTimetable) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Timetable</h1>
        <p className="text-muted-foreground">
          Your weekly class schedule
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingStats ? "..." : getTotalCourses()}</div>
            <p className="text-xs text-muted-foreground">Enrolled this semester</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Class Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingStats ? "..." : getTotalClassHours()}</div>
            <p className="text-xs text-muted-foreground">Hours per week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Days with Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? "..." : (timetableStats?.daysWithClasses || new Set(timetable.map(entry => entry.day)).size)}
            </div>
            <p className="text-xs text-muted-foreground">Days per week</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('week')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Week View
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('list')}
          >
            <Clock className="h-4 w-4 mr-2" />
            Day View
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {view === 'week' ? 'Weekly Schedule' : 'Daily Schedule'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {view === 'week' ? renderWeekView() : renderDayView()}
        </CardContent>
      </Card>
    </div>
  );
} 