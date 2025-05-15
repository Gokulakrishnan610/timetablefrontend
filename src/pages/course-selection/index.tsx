import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Filter, Check, AlertCircle, ExternalLink, Bug } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { studentCourseApi, debugApi } from '@/services/api';

interface Course {
  id: number;
  course_id: number;
  course_semester: number;
  course_year: number;
  elective_type: string;
  for_dept_id: number;
  teaching_dept_id: number;
  lab_type: string;
  need_assist_teacher: boolean;
  teaching_status: string;
  // Additional fields we get from joins/related data
  course_name?: string;
  course_code?: string;
  dept_name?: string;
  raw_data?: any;
}

interface Teacher {
  id: number;
  name: string;
  department: string;
  available_slots: string[];
  teacher_name?: string; // For API response compatibility
  dept_id?: number; // For API response compatibility
  raw_data?: any; // For debugging
}

interface Slot {
  id: number;
  name: string;
  day: string;
  start_time: string;
  end_time: string;
  slot_name?: string; // For API response compatibility
  room: string;
  is_from_timetable: boolean;
}

interface CourseSelection {
  id?: number;
  course_id: number;
  teacher_id: number;
  slot_id: number;
}

interface Department {
  id: number;
  name: string;
  dept_name?: string; // For API response compatibility
}

interface ApiResponse {
  data: any;
  status?: number;
  headers?: any;
  config?: {
    baseURL?: string;
    url?: string;
  };
}

export default function CourseSelectionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [showFilter, setShowFilter] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Fetch departments for filter
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      try {
        const response = await studentCourseApi.getDepartments();
        const data = Array.isArray(response.data) ? response.data : [];
        
        // Map API response to expected format
        return data.map((dept: any) => ({
          id: dept.id,
          name: dept.dept_name || dept.name
        }));
      } catch (error) {
        console.error('Error fetching departments:', error);
        // Don't use mock data, just return empty array on error
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  // Fetch available courses
  const { data: courses = [], isLoading: isLoadingCourses } = useQuery<Course[]>({
    queryKey: ['available-courses', selectedDepartment],
    queryFn: async () => {
      try {
        console.log('Fetching available courses');
        const response: ApiResponse = await studentCourseApi.getAvailableCourses();
        
        // Log response info if available
        if (response.status && response.headers && response.config) {
          console.log('API response:', {
            status: response.status,
            headers: response.headers,
            baseURL: response.config?.baseURL,
            endpoint: response.config?.url,
            data: response.data
          });
        }
        
        // Ensure response.data is an array
        const coursesData = Array.isArray(response.data) ? response.data : 
                          (response.data?.results && Array.isArray(response.data.results)) ? 
                          response.data.results : [];
        
        // Map API response to match our interface
        return coursesData.map((course: any) => ({
          id: course.id,
          course_id: course.course_id || course.id,
          course_semester: course.course_semester || 1,
          course_year: course.course_year || 1,
          elective_type: course.elective_type || 'regular',
          for_dept_id: course.for_dept_id,
          teaching_dept_id: course.teaching_dept_id,
          lab_type: course.lab_type || 'none',
          need_assist_teacher: course.need_assist_teacher || false,
          teaching_status: course.teaching_status || 'active',
          // Additional display fields from related data
          course_name: course.course_name || course.name || `Course ${course.course_id}`,
          course_code: course.course_code || course.code || '',
          dept_name: course.dept_name || course.teaching_dept_name || '',
          raw_data: {
            course_year: course.course_year,
            course_semester: course.course_semester,
            elective_type: course.elective_type,
            teaching_dept: course.teaching_dept_name,
            for_dept: course.dept_name,
            for_dept_id: course.for_dept_id,
            course_id: course.course_id || course.id
          }
        }));
      } catch (error: any) {
        console.error('Error fetching courses:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  // Fetch teachers for selected course
  const { data: teachers = [], isLoading: isLoadingTeachers } = useQuery<Teacher[]>({
    queryKey: ['available-teachers', selectedCourse?.id],
    queryFn: async () => {
      if (!selectedCourse) return [];
      
      try {
        console.log('Fetching teachers for course:', selectedCourse);
        const response: ApiResponse = await studentCourseApi.getAvailableTeachers(selectedCourse.id.toString());
        
        // Log response info if available
        if (response.status && response.headers && response.config) {
          console.log('Teachers API response:', {
            status: response.status,
            headers: response.headers,
            baseURL: response.config?.baseURL,
            endpoint: response.config?.url,
            data: response.data
          });
        }
        
        // Ensure response.data is an array
        const teachersData = Array.isArray(response.data) ? response.data : 
                           (response.data?.results && Array.isArray(response.data.results)) ? 
                           response.data.results : [];
        
        console.log('Parsed teachers data:', {
          count: teachersData.length,
          sampleTeacher: teachersData[0]
        });
        
        if (teachersData.length === 0) {
          console.warn('No teachers found for course:', selectedCourse.id);
          toast.warning('No teachers available for this course');
          return [];
        }
        
        // Map API response to expected format
        return teachersData.map((teacher: any) => ({
          id: teacher.id || teacher.teacher_id,
          name: teacher.teacher_name || teacher.name || teacher.full_name,
          department: teacher.dept_name || teacher.department,
          available_slots: teacher.available_slots || [],
          // Add additional fields for debugging
          raw_data: {
            dept_id: teacher.dept_id,
            teacher_id: teacher.teacher_id || teacher.id,
            status: teacher.status,
            expertise: teacher.expertise,
            courses: teacher.courses
          }
        }));
      } catch (error: any) {
        console.error('Error fetching teachers:', {
          error,
          response: error.response,
          request: error.request,
          config: error.config
        });
        
        // Show specific error message
        if (error.response?.status === 401) {
          toast.error('Please log in again to view available teachers');
        } else if (error.response?.status === 403) {
          toast.error('You do not have permission to view teachers for this course');
        } else if (error.response?.data?.detail) {
          toast.error(error.response.data.detail);
        } else {
          toast.error('Failed to load teachers. Please try again.');
        }
        
        throw error;
      }
    },
    enabled: !!selectedCourse,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  // Fetch available slots for selected course and teacher
  const { data: slots = [], isLoading: isLoadingSlots } = useQuery<Slot[]>({
    queryKey: ['available-slots', selectedCourse?.id, selectedTeacher?.id],
    queryFn: async () => {
      if (!selectedCourse || !selectedTeacher) return [];
      
      try {
        const response = await studentCourseApi.getAvailableSlots(
          selectedCourse.id.toString(), 
          selectedTeacher.id.toString()
        );
        
        console.log('Slot response:', response);
        
        // Check if there's a warning message (no timetable entries)
        if (response.data?.warning) {
          toast.warning(response.data.warning);
        }
        
        // Handle both array and object with slots property
        const slotsData = Array.isArray(response.data) ? response.data : 
                         (response.data?.slots && Array.isArray(response.data.slots)) ? 
                         response.data.slots :
                         (response.data?.results && Array.isArray(response.data.results)) ? 
                         response.data.results : [];
        
        console.log('Parsed slots data:', slotsData);
        
        if (slotsData.length === 0) {
          toast.warning('No time slots are available for this teacher and course');
        }
        
        // Map API response to expected format with better handling of different formats
        return slotsData.map((slot: any) => ({
          id: slot.id,
          name: slot.slot_name || slot.name || `${slot.day_of_week || slot.day || ''} ${slot.start_time || ''}-${slot.end_time || ''}`,
          day: slot.day_of_week || slot.day || '',
          start_time: slot.start_time || '',
          end_time: slot.end_time || '',
          // Include timetable information if available
          room: slot.room_id?.room_name || slot.room?.name || '',
          is_from_timetable: !!slot.course_assignment
        }));
      } catch (error) {
        console.error('Error fetching slots:', error);
        toast.error('Failed to load time slots for this teacher.');
        return [];
      }
    },
    enabled: !!selectedCourse && !!selectedTeacher,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  // Get my course selections
  const { data: mySelections = [], isLoading: isLoadingSelections, refetch: refetchSelections } = useQuery<CourseSelection[]>({
    queryKey: ['my-selections'],
    queryFn: async () => {
      try {
        const response = await studentCourseApi.getMyCourseSelections();
        
        // Ensure response.data is an array
        const selectionsData = Array.isArray(response.data) ? response.data : 
                              (response.data?.results && Array.isArray(response.data.results)) ? 
                              response.data.results : [];
        
        // Map API response to expected format
        return selectionsData;
      } catch (error) {
        console.error('Error fetching my course selections:', error);
        toast.error('Failed to load your course selections.');
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2
  });

  // Create course selection mutation
  const { mutate: createSelection, isPending: isCreating } = useMutation({
    mutationFn: (data: { course_id: number; teacher_id: number; slot_id: number }) => 
      studentCourseApi.createCourseSelection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-selections'] });
      refetchSelections();
      toast.success('Course added to your selection!');
      setSelectedCourse(null);
      setSelectedTeacher(null);
      setSelectedSlot(null);
    },
    onError: (error) => {
      console.error('Error creating course selection:', error);
      toast.error('Failed to select course. Please try again.');
    }
  });

  // Delete course selection mutation
  const { mutate: deleteSelection, isPending: isDeleting } = useMutation({
    mutationFn: (id: number) => studentCourseApi.deleteCourseSelection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-selections'] });
      refetchSelections();
      toast.success('Course removed from your selection.');
    },
    onError: (error) => {
      console.error('Error deleting course selection:', error);
      toast.error('Failed to remove course. Please try again.');
    }
  });

  // Filter courses by search query
  const filteredCourses = courses.filter(course => 
    course.course_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.course_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handler for selecting a course
  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setSelectedTeacher(null);
    setSelectedSlot(null);
  };

  // Handler for selecting a teacher
  const handleSelectTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setSelectedSlot(null);
  };

  // Handler for selecting a slot
  const handleSelectSlot = (slot: Slot) => {
    setSelectedSlot(slot);
  };

  // Handler for submitting course selection
  const handleSubmit = () => {
    if (!selectedCourse || !selectedTeacher || !selectedSlot) {
      toast.error('Please select course, teacher, and time slot');
      return;
    }
    
    createSelection({
      course_id: selectedCourse.id,
      teacher_id: selectedTeacher.id,
      slot_id: selectedSlot.id
    });
  };

  // Function to view course details
  const handleViewCourseDetails = (course: Course) => {
    navigate(`/course-selection/${course.id}`);
  };

  // Render a slot card with selection functionality
  const renderSlotCard = (slot: Slot) => {
    return (
      <Card 
        key={slot.id}
        className={cn(
          "cursor-pointer hover:bg-secondary/50 transition-colors",
          selectedSlot?.id === slot.id ? "border-primary" : "border-border"
        )}
        onClick={() => handleSelectSlot(slot)}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">
              {slot.day} • {slot.start_time}-{slot.end_time}
            </span>
            {selectedSlot?.id === slot.id && (
              <Check className="h-5 w-5 text-primary" />
            )}
          </div>
          {slot.room && (
            <div className="mt-1 text-sm text-muted-foreground">
              Room: {slot.room}
            </div>
          )}
          {slot.is_from_timetable && (
            <div className="mt-1 text-xs text-green-600">
              ✓ From official timetable
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // In the course card rendering part, add a view details button
  const renderCourseCard = (course: Course) => {
    const isSelected = selectedCourse?.id === course.id;
    return (
      <Card 
        key={course.id}
        className={cn(
          "cursor-pointer hover:border-primary/50 transition-colors",
          isSelected && "border-primary"
        )}
        onClick={() => handleSelectCourse(course)}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base">{course.course_name}</CardTitle>
              <CardDescription>
                {course.course_code} • Year {course.course_year}, Sem {course.course_semester}
              </CardDescription>
            </div>
            {isSelected && (
              <div className="bg-primary/10 rounded-full p-1">
                <Check className="h-4 w-4 text-primary" />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p className="line-clamp-2">
            {course.elective_type !== 'regular' ? `${course.elective_type.toUpperCase()} Course • ` : ''}
            {course.lab_type !== 'none' ? `${course.lab_type.toUpperCase()} Lab • ` : ''}
            Department: {course.dept_name}
          </p>
        </CardContent>
        <CardFooter className="pt-2 flex justify-between">
          <div className="text-xs text-muted-foreground">
            {course.teaching_status === 'active' ? 
              <span className="text-green-600">Active</span> : 
              <span className="text-yellow-600">Inactive</span>
            }
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleViewCourseDetails(course);
            }}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Details
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // Debug function
  const handleRunDiagnostics = async () => {
    try {
      toast.info('Running API diagnostics...');
      const results = await debugApi.checkStudentCourseStatus();
      setDebugInfo(results);
      setShowDebug(true);
      console.log('API Diagnostics Results:', results);
      toast.success('Diagnostics completed');
    } catch (error) {
      console.error('Error running diagnostics:', error);
      toast.error('Error running diagnostics');
    }
  };

  // Render a selected course in the My Selected Courses section
  const renderSelectedCourse = (selection: CourseSelection, courses: Course[], isDeleting: boolean, onDelete: (id: number) => void) => {
    const course = courses.find(c => c.course_id === selection.course_id);
    
    return (
      <div
        key={selection.id}
        className="p-4 border rounded-md flex justify-between items-center"
      >
        <div>
          <h3 className="font-medium">
            {course ? `${course.course_code} - ${course.course_name}` : `Course ID: ${selection.course_id}`}
          </h3>
          <p className="text-sm text-muted-foreground">
            {course?.dept_name || 'Department N/A'} • Year {course?.course_year || '?'}, Sem {course?.course_semester || '?'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => selection.id && onDelete(selection.id)}
          disabled={isDeleting}
        >
          {isDeleting ? 'Removing...' : 'Remove'}
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Course Selection</h1>
          <p className="text-muted-foreground">
            Choose your courses for the upcoming semester
          </p>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRunDiagnostics}
          className="flex items-center"
        >
          <Bug className="h-4 w-4 mr-1" />
          Diagnostics
        </Button>
      </div>

      {/* Debug Info */}
      {showDebug && debugInfo && (
        <Card className="bg-muted/40 border-dashed">
          <CardHeader className="py-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium">API Diagnostics</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDebug(false)}
                className="h-8 w-8 p-0"
              >
                &times;
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-xs py-0">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <strong>Health Check:</strong> {debugInfo.health?.data?.status || 'Error'}
              </div>
              <div>
                <strong>Auth Status:</strong> {debugInfo.debug?.data?.user?.is_authenticated ? 'Authenticated' : 'Not Authenticated'}
              </div>
              <div>
                <strong>Course API:</strong> {debugInfo.courses?.status === 200 ? '✅ Working' : '❌ Error'}
              </div>
              <div>
                <strong>Student Courses API:</strong> {debugInfo.studentCourses?.status === 200 ? '✅ Working' : '❌ Error'}
              </div>
            </div>
            <div className="mt-2">
              <strong>Student Info:</strong>
              <pre className="text-xs mt-1 bg-background p-2 rounded overflow-auto max-h-20">
                {JSON.stringify(debugInfo.studentCoursesDebug?.data?.student || {}, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses by name or code..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilter(!showFilter)}
          className="md:w-auto w-full"
        >
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Filter options */}
      {showFilter && (
        <div className="p-4 border rounded-md bg-card space-y-4">
          <div>
            <Label className="text-sm font-medium">Filter by Department</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
              <Button
                variant={selectedDepartment === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDepartment('')}
                className="justify-start"
              >
                All Departments
              </Button>
              {departments.map((dept) => (
                <Button
                  key={dept.id}
                  variant={selectedDepartment === dept.name ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDepartment(dept.name)}
                  className="justify-start"
                >
                  {dept.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Available Courses */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Available Courses</CardTitle>
            <CardDescription>
              Select a course to view available teachers and time slots
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCourses ? (
              <div className="space-y-3">
                <div className="h-20 rounded-md bg-muted animate-pulse" />
                <div className="h-20 rounded-md bg-muted animate-pulse" />
                <div className="h-20 rounded-md bg-muted animate-pulse" />
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                <h3 className="font-medium">No courses found</h3>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCourses.map((course) => renderCourseCard(course))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selection Options */}
        <div className="space-y-6">
          {/* Teachers */}
          <Card>
            <CardHeader>
              <CardTitle>Available Teachers</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedCourse ? (
                <div className="text-center py-4 text-muted-foreground">
                  Select a course first
                </div>
              ) : isLoadingTeachers ? (
                <div className="space-y-2">
                  <div className="h-12 rounded-md bg-muted animate-pulse" />
                  <div className="h-12 rounded-md bg-muted animate-pulse" />
                </div>
              ) : teachers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No teachers available for this course
                </div>
              ) : (
                <div className="space-y-2">
                  {teachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className={cn(
                        "p-2 border rounded-md cursor-pointer hover:border-primary transition-colors",
                        selectedTeacher?.id === teacher.id
                          ? "border-primary bg-primary/5"
                          : ""
                      )}
                      onClick={() => handleSelectTeacher(teacher)}
                    >
                      <div className="flex justify-between items-center">
                        <span>{teacher.name}</span>
                        {selectedTeacher?.id === teacher.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Slots */}
          <Card>
            <CardHeader>
              <CardTitle>Available Time Slots</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedTeacher ? (
                <div className="text-center py-4 text-muted-foreground">
                  Select a teacher first
                </div>
              ) : isLoadingSlots ? (
                <div className="space-y-2">
                  <div className="h-12 rounded-md bg-muted animate-pulse" />
                  <div className="h-12 rounded-md bg-muted animate-pulse" />
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No time slots available with this teacher
                </div>
              ) : (
                <div className="space-y-2">
                  {slots.map((slot) => renderSlotCard(slot))}
                </div>
              )}
            </CardContent>
          </Card>

          <Button 
            className="w-full" 
            disabled={!selectedCourse || !selectedTeacher || !selectedSlot || isCreating}
            onClick={handleSubmit}
          >
            {isCreating ? 'Adding Course...' : 'Add Course'}
          </Button>
        </div>
      </div>

      {/* Selected Courses */}
      <Card>
        <CardHeader>
          <CardTitle>My Selected Courses</CardTitle>
          <CardDescription>
            Courses you have selected for the upcoming semester
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSelections ? (
            <div className="space-y-3">
              <div className="h-16 rounded-md bg-muted animate-pulse" />
              <div className="h-16 rounded-md bg-muted animate-pulse" />
            </div>
          ) : mySelections.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              You haven't selected any courses yet
            </div>
          ) : (
            <div className="space-y-3">
              {mySelections.map((selection) => 
                renderSelectedCourse(selection, courses, isDeleting, deleteSelection)
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 