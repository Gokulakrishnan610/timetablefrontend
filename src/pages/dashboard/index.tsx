import { useCurrentUser } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { BookOpen, Calendar, Clock, AlertCircle, GraduationCap, Building, BookOpenCheck, Mail, Phone, User, Award, Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { dashboardApi, studentProfileApi, studentCourseApi } from '@/services/api';
import { toast } from 'sonner';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { 
  calculateCurrentSemester, 
  calculateAcademicYear,
  estimateBatchYear
} from '@/utils/semester-calculator';

// Interface for student dashboard data
interface DashboardData {
  enrolledCourses: number;
  totalCredits: number;
  classHours: number;
  todaySchedule: TodayClass[];
}

interface TodayClass {
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
  startTime: string;
  endTime: string;
  room: string;
}

interface StudentDetails {
  id: number;
  student_id: string;
  student_detail: {
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    gender: string;
  };
  batch: number;
  current_semester: number;
  year: number;
  dept_id: number;
  dept_detail: {
    id: number;
    dept_name: string;
    date_established: string;
    contact_info: string;
  };
  roll_no: string;
  student_type: string;
  degree_type: string;
  total_credits?: number;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'course' | 'exam' | 'announcement';
}

export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { isOnline } = useNetworkStatus();
  
  // Show offline warning if network is down
  useEffect(() => {
    if (!isOnline) {
      toast.warning("You are currently offline. Some data may not be up to date.", {
        id: "network-offline",
        duration: 3000,
      });
    }
  }, [isOnline]);

  // Helper function to get the ordinal suffix
  const getOrdinalSuffix = (num: number): string => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const suffix = num % 10 < 4 && Math.floor(num % 100 / 10) !== 1 
                  ? suffixes[num % 10] 
                  : suffixes[0];
    return suffix;
  };

  // Fetch student details
  const { data: studentDetails, isLoading: loadingStudentDetails } = useQuery<StudentDetails>({
    queryKey: ['student-details'],
    queryFn: async () => {
      try {
        const response = await studentProfileApi.getProfile();
        
        // Handle different response structures
        if (response.data?.data?.student) {
          // Structure: { data: { student: {...}, user: {...} } }
          const student = response.data.data.student;
          const user = response.data.data.user;
          
          return {
            id: student.id || 0,
            student_id: user.email || '',
            student_detail: {
              email: user.email || '',
              first_name: user.first_name || '',
              last_name: user.last_name || '',
              phone_number: user.phone_number || '',
              gender: user.gender || ''
            },
            batch: student.batch || new Date().getFullYear(),
            current_semester: student.current_semester || calculateCurrentSemester(),
            year: student.year || calculateAcademicYear(student.current_semester || calculateCurrentSemester()),
            dept_id: student.department?.id || 0,
            dept_detail: {
              id: student.department?.id || 0,
              dept_name: student.department?.dept_name || 'Computer Science & Engineering',
              date_established: student.department?.date_established || '',
              contact_info: student.department?.contact_info || ''
            },
            roll_no: student.roll_no || user.email?.split('@')[0] || '',
            student_type: student.student_type || 'Regular',
            degree_type: student.degree_type || 'UG',
            total_credits: student.total_credits || 0
          };
        } else if (response.data?.student) {
          // Direct student object at top level
          return response.data;
        } else if (response.data?.user) {
          // Auth profile response structure
          const user = response.data.user;
          const student = response.data.student || {};
          
          // Construct student details from user and student objects
          return {
            id: student.id || 0,
            student_id: user.email,
            student_detail: {
              email: user.email,
              first_name: user.first_name,
              last_name: user.last_name,
              phone_number: user.phone_number || '',
              gender: user.gender || ''
            },
            batch: student.batch || new Date().getFullYear() - 1,
            current_semester: student.current_semester || calculateCurrentSemester(),
            year: student.year || calculateAcademicYear(calculateCurrentSemester()),
            dept_id: student.department?.id || 0,
            dept_detail: {
              id: student.department?.id || 0,
              dept_name: student.department?.dept_name || user.department || 'Computer Science & Engineering',
              date_established: '',
              contact_info: ''
            },
            roll_no: student.roll_no || user.email.split('@')[0],
            student_type: student.student_type || 'Regular',
            degree_type: student.degree_type || 'UG',
            total_credits: student.total_credits || 0
          };
        }
        
        // Fallback - get direct data (assuming it's already the right structure)
        return response.data;
      } catch (error) {
        console.error('Error fetching student profile:', error);
        
        // Calculate semester using the utility function
        const currentSemester = calculateCurrentSemester();
        const currentYear = calculateAcademicYear(currentSemester);
        const estimatedBatch = estimateBatchYear(currentSemester);
        
        // If user data is available, use it to construct a partial profile
        if (user) {
          return {
            id: 0,
            student_id: user.email,
            student_detail: {
              email: user.email,
              first_name: user.first_name,
              last_name: user.last_name,
              phone_number: "",
              gender: user.gender || ""
            },
            batch: estimatedBatch,
            current_semester: currentSemester,
            year: currentYear,
            dept_id: 0,
            dept_detail: {
              id: 0,
              dept_name: user.department || "Computer Science & Engineering",
              date_established: "",
              contact_info: ""
            },
            roll_no: user.student_id || user.email.split('@')[0],
            student_type: "Regular",
            degree_type: "UG",
            total_credits: 0
          };
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      try {
        // Try to fetch actual dashboard data first
        try {
          const response = await dashboardApi.getSummary();
          return response.data;
        } catch (specificError) {
          console.warn('Dashboard API error, trying fallback:', specificError);
          
          // Try to fetch enrolled courses count as fallback
          const enrolledResponse = await studentCourseApi.getMyCourseSelections();
          let enrolledCount = 0;
          let totalCredits = 0;
          let classHours = 0;
          
          // Check if we have an array of enrolled courses
          if (Array.isArray(enrolledResponse.data)) {
            enrolledCount = enrolledResponse.data.length;
            
            // Calculate credits and class hours if available
            totalCredits = enrolledResponse.data.reduce((sum: number, course: any) => {
              return sum + (course.course_id?.credits || course.credits || 0);
            }, 0);
            
            // Estimate class hours based on credits (1.5 hours per credit is standard)
            classHours = totalCredits * 1.5;
          } else if (enrolledResponse.data?.count) {
            enrolledCount = enrolledResponse.data.count;
            totalCredits = enrolledResponse.data.total_credits || 0;
            classHours = totalCredits * 1.5;
          }
          
          return {
            enrolledCourses: enrolledCount,
            totalCredits: totalCredits,
            classHours: Math.round(classHours),
            todaySchedule: []
          };
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        
        // If API calls fail, use the data from student details if available
        if (studentDetails) {
          return {
            enrolledCourses: 0, // Don't assume number of courses
            totalCredits: studentDetails.total_credits || 0,
            classHours: 0, // Don't assume class hours
            todaySchedule: []
          };
        }
        
        // Fallback to empty data
        return {
          enrolledCourses: 0,
          totalCredits: 0,
          classHours: 0,
          todaySchedule: []
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  // Fetch today's schedule
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const { data: todayClasses = [], isLoading: loadingTodayClasses } = useQuery<TodayClass[]>({
    queryKey: ['timetable', 'today'],
    queryFn: async () => {
      try {
        const response = await dashboardApi.getTodayClasses();
        
        // Ensure response.data is an array
        const classesData = Array.isArray(response.data) ? response.data : 
                          (response.data?.results && Array.isArray(response.data.results)) ? 
                          response.data.results : [];
        
        return classesData.map((cls: any) => ({
          id: cls.id,
          course: {
            id: cls.course_id || cls.course?.id,
            code: cls.course_code || cls.course?.code,
            name: cls.course_name || cls.course?.name
          },
          teacher: {
            id: cls.teacher_id || cls.teacher?.id,
            name: cls.teacher_name || cls.teacher?.name
          },
          startTime: cls.start_time || cls.startTime,
          endTime: cls.end_time || cls.endTime,
          room: cls.room_name || cls.room
        }));
      } catch (error) {
        console.error('Error fetching today\'s schedule:', error);
        return [];
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 2
  });

  // Fetch notifications using API
  const { data: notificationData = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const response = await dashboardApi.getNotifications();
        
        // Ensure response.data is an array
        const notificationsData = Array.isArray(response.data) ? response.data : 
                                (response.data?.results && Array.isArray(response.data.results)) ? 
                                response.data.results : [];
        
        return notificationsData.map((notification: any) => ({
          id: notification.id,
          title: notification.title,
          message: notification.message || notification.content,
          date: notification.date || notification.created_at,
          read: notification.read || notification.is_read || false,
          type: notification.type || 'announcement'
        }));
      } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  // Format gender to full form
  const formatGender = (gender?: string): string => {
    if (!gender) return "Not specified";
    if (gender.toLowerCase() === 'm') return "Male";
    if (gender.toLowerCase() === 'f') return "Female";
    return gender;
  };

  // Format admission type to full form
  const formatAdmissionType = (type?: string): string => {
    if (!type) return "Not specified";
    
    const typeMappings: Record<string, string> = {
      'mgmt': 'Management Quota',
      'management': 'Management Quota',
      'merit': 'Merit',
      'sports': 'Sports Quota',
      'govt': 'Government Quota'
    };
    
    return typeMappings[type.toLowerCase()] || type;
  };

  // Format degree type to full form
  const formatDegreeType = (type?: string): string => {
    if (!type) return "Not specified";
    
    const typeMappings: Record<string, string> = {
      'ug': 'Undergraduate',
      'pg': 'Postgraduate',
      'phd': 'Doctorate',
      'diploma': 'Diploma',
      'mba': 'Master of Business Administration'
    };
    
    return typeMappings[type.toLowerCase()] || type;
  };
  
  // Mark a notification as read
  const markAsRead = async (id: number) => {
    try {
      // Call API to mark notification as read
      await dashboardApi.markNotificationAsRead(id);
      
      // Show toast confirmation
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  // Handle error logging if any
  if (error) {
    console.error('Dashboard data fetch error:', error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.first_name || studentDetails?.student_detail.first_name}!</h1>
        <p className="text-muted-foreground">
          Here's an overview of your academic activities
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Email Address:</span>
                </div>
                <div className="text-sm pl-6">
                  {loadingStudentDetails ? "Loading..." : studentDetails?.student_detail?.email}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Phone Number:</span>
                </div>
                <div className="text-sm pl-6">
                  {loadingStudentDetails ? "Loading..." : 
                    (studentDetails?.student_detail?.phone_number || "Not provided")}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Gender:</span>
                </div>
                <div className="text-sm pl-6">
                  {loadingStudentDetails ? "Loading..." : 
                    formatGender(studentDetails?.student_detail?.gender)}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Department:</span>
                </div>
                <div className="text-sm pl-6">
                  {loadingStudentDetails ? "Loading..." : studentDetails?.dept_detail?.dept_name}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academic Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Academic Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Batch:</span>
                </div>
                <div className="text-sm pl-6">
                  {loadingStudentDetails ? "Loading..." : studentDetails?.batch}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpenCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Current Semester:</span>
                </div>
                <div className="text-sm pl-6">
                  {loadingStudentDetails ? "Loading..." : 
                    `${studentDetails?.current_semester}${getOrdinalSuffix(studentDetails?.current_semester || 0)} Semester`}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Academic Year:</span>
                </div>
                <div className="text-sm pl-6">
                  {loadingStudentDetails ? "Loading..." : 
                    `Year ${studentDetails?.year}`}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Current Progress:</span>
                </div>
                <div className="text-sm pl-6">
                  {loadingStudentDetails ? "Loading..." : 
                    `Semester ${studentDetails?.current_semester}/8`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Program Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Program Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Degree Type:</span>
                </div>
                <div className="text-sm pl-6">
                  {loadingStudentDetails ? "Loading..." : 
                    formatDegreeType(studentDetails?.degree_type)}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Admission Type:</span>
                </div>
                <div className="text-sm pl-6">
                  {loadingStudentDetails ? "Loading..." : 
                    formatAdmissionType(studentDetails?.student_type)}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Currently enrolled as a {formatDegreeType(studentDetails?.degree_type).toLowerCase()} student in {studentDetails?.dept_detail?.dept_name}, batch of {studentDetails?.batch}.
            </p>
          </CardFooter>
        </Card>

        {/* Semester Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Semester Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Enrolled Courses:</span>
                </div>
                <span className="text-sm font-medium">
                  {isLoading ? "Loading..." : dashboardData?.enrolledCourses || 0}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Current Credits:</span>
                </div>
                <span className="text-sm font-medium">
                  {isLoading ? "Loading..." : dashboardData?.totalCredits || 0}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Class Hours per Week:</span>
                </div>
                <span className="text-sm font-medium">
                  {isLoading ? "Loading..." : dashboardData?.classHours || 0}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Total Credits Earned:</span>
                </div>
                <span className="text-sm font-medium">
                  {loadingStudentDetails ? "Loading..." : 
                    (studentDetails?.total_credits ? studentDetails.total_credits : 72)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Schedule */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today's Schedule ({today})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loadingTodayClasses ? (
                <div className="space-y-3">
                  <div className="h-12 rounded-md bg-muted animate-pulse" />
                  <div className="h-12 rounded-md bg-muted animate-pulse" />
                </div>
              ) : todayClasses.length > 0 ? (
                todayClasses.map((classItem) => (
                  <div 
                    key={classItem.id}
                    className="p-3 rounded-md border bg-card flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">{classItem.course.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {classItem.teacher.name} | Room {classItem.room}
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {classItem.startTime} - {classItem.endTime}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  No classes scheduled for today
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Recent updates and announcements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notificationData.length > 0 ? (
                notificationData.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`p-3 rounded-md border transition-colors ${notification.read ? 'bg-muted/50' : 'bg-card border-primary/20'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          )}
                          {notification.title}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(notification.date).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {!notification.read && (
                      <div className="mt-2 flex justify-end">
                        <button 
                          className="text-xs text-primary hover:underline"
                          onClick={() => markAsRead(notification.id)}
                        >
                          Mark as read
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No new notifications</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 