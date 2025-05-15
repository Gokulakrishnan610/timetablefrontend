import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentProfileApi } from '@/services/api';
import { 
  calculateCurrentSemester, 
  formatSemester,
  calculateAcademicYear,
  estimateBatchYear
} from '@/utils/semester-calculator';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  GraduationCap, 
  School, 
  BookOpen, 
  Award, 
  Clock, 
  Shield, 
  Edit, 
  Save, 
  X, 
  Building
} from 'lucide-react';

interface StudentProfile {
  id: number;
  student_id: string;
  roll_no: string;
  student_detail: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    gender: string;
  };
  dept_detail: {
    id: number;
    dept_name: string;
  };
  current_semester: number;
  batch: number;
  total_credits: number;
  year: number;
}

// Mock education history data
const educationHistory = [
  {
    id: 1,
    institution: "City High School",
    degree: "High School Diploma",
    field: "Science",
    startYear: 2018,
    endYear: 2020,
    grade: "A"
  },
  {
    id: 2,
    institution: "University of Technology",
    degree: "Bachelor of Engineering",
    field: "Computer Science",
    startYear: 2020,
    endYear: 2024,
    grade: "Current"
  }
];

export default function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  
  // Fetch student profile data
  const { data: studentProfile, isLoading: loadingProfile } = useQuery<StudentProfile>({
    queryKey: ['student-profile'],
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
            roll_no: student.roll_no || user.email?.split('@')[0] || '',
            student_detail: {
              email: user.email || '',
              first_name: user.first_name || '',
              last_name: user.last_name || '',
              phone_number: user.phone_number || '',
              gender: user.gender || ''
            },
            dept_detail: {
              id: student.department?.id || 0,
              dept_name: student.department?.dept_name || 'Computer Science & Engineering'
            },
            current_semester: student.current_semester || calculateCurrentSemester(),
            batch: student.batch || new Date().getFullYear() - 1,
            total_credits: student.total_credits || 0,
            year: student.year || calculateAcademicYear(student.current_semester || calculateCurrentSemester())
          };
        } else if (response.data?.student) {
          // Direct student object at top level
          return response.data;
        } else if (response.data?.user) {
          // Auth profile response structure
          const user = response.data.user;
          const student = response.data.student || {};
          
          return {
            id: student.id || 0,
            student_id: user.email,
            roll_no: student.roll_no || user.email.split('@')[0],
            student_detail: {
              email: user.email,
              first_name: user.first_name,
              last_name: user.last_name,
              phone_number: user.phone_number || '',
              gender: user.gender || ''
            },
            dept_detail: {
              id: student.department?.id || 0,
              dept_name: student.department?.dept_name || user.department || 'Computer Science & Engineering'
            },
            current_semester: student.current_semester || calculateCurrentSemester(),
            batch: student.batch || estimateBatchYear(calculateCurrentSemester()),
            total_credits: student.total_credits || 0,
            year: student.year || calculateAcademicYear(calculateCurrentSemester())
          };
        }
        
        // Fallback - direct data structure
        return response.data;
      } catch (error) {
        console.error('Error fetching student profile:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
  
  // Use auth context as fallback only if API fails
  const fallbackProfile = useMemo(() => {
    if (!user) return null;
    
    // Calculate semester using the utility function
    const semester = calculateCurrentSemester();
    
    // Convert id to string if it's a number
    const userId = typeof user.id === 'number' ? String(user.id) : user.id;
    
    return {
      id: user.id,
      student_id: userId || user.email,
      roll_no: typeof userId === 'string' ? userId.split('@')[0] || '' : '',
      student_detail: {
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: userId || '',
        phone_number: '',
        gender: user.gender || '',
      },
      dept_detail: {
        id: 0,
        dept_name: user.department || 'Computer Science & Engineering'
      },
      current_semester: semester,
      batch: estimateBatchYear(semester),
      total_credits: 72,
      year: calculateAcademicYear(semester)
    };
  }, [user]);
  
  // Use API data or fallback if API failed
  const profileData = studentProfile || fallbackProfile;
  
  // Prepare form data from student profile
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: ''
  });
  
  // Update form data when student profile loads
  useEffect(() => {
    if (profileData) {
      setFormData({
        first_name: profileData.student_detail.first_name,
        last_name: profileData.student_detail.last_name,
        email: profileData.student_detail.email,
        phone_number: profileData.student_detail.phone_number || ''
      });
    }
  }, [profileData]);
  
  // Mutation to update profile
  const { mutate: updateProfile, isPending } = useMutation({
    mutationFn: (data: any) => {
      // Use the auth API update endpoint which works
      return studentProfileApi.updateProfile(data);
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
      setIsEditing(false);
      // Invalidate cached user and profile data
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
    },
    onError: (error) => {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile. Please try again.');
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Just submit the basic profile data
    const data = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone_number: formData.phone_number
    };
    
    updateProfile(data);
  };
  
  // Format gender to full form
  const formatGender = (gender?: string): string => {
    if (!gender) return "Not specified";
    if (gender.toLowerCase() === 'm') return "Male";
    if (gender.toLowerCase() === 'f') return "Female";
    return gender;
  };
  
  // Calculate progress percentage for academic journey
  const calculateProgress = () => {
    if (!profileData) return 0;
    
    const totalSemesters = 8; // Assuming a 4-year degree with 8 semesters
    const currentSemester = profileData.current_semester || 1;
    return Math.min(Math.round((currentSemester / totalSemesters) * 100), 100);
  };
  
  // Calculate expected graduation year
  const calculateGraduationYear = () => {
    if (!profileData) return "";
    
    const batch = profileData.batch || new Date().getFullYear();
    return batch + 4; // Assuming a 4-year undergraduate program
  };

  return (
    <div className="space-y-6">
      {/* Profile Cover and Header */}
      <div className="relative h-64 bg-gradient-to-r from-primary/20 to-primary/5 rounded-lg overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/campus.jpg')] bg-cover bg-center opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-transparent to-black/40"></div>
        
        <div className="absolute bottom-0 left-0 right-0 px-8 py-6 bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
            <div className="relative group bg-gradient-to-br from-primary/20 to-primary/10 p-1 rounded-full border-4 border-background shadow-lg overflow-hidden">
              <Avatar className="h-28 w-28 shadow-md overflow-hidden">
                <div className="aspect-square h-full w-full flex items-center justify-center">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl h-full w-full flex items-center justify-center">
                    {profileData?.student_detail?.first_name?.[0]?.toUpperCase() || ''}
                    {profileData?.student_detail?.last_name?.[0]?.toUpperCase() || ''}
                  </AvatarFallback>
                </div>
              </Avatar>
              
              {isEditing && (
                <label 
                  htmlFor="avatar-upload" 
                  className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-not-allowed"
                >
                  <div className="text-white text-sm font-medium">Cannot change</div>
                  <input 
                    id="avatar-upload"
                    type="file"
                    disabled
                    className="sr-only"
                  />
                </label>
              )}
            </div>
            
            <div className="flex-1 text-white z-10">
              <h1 className="text-3xl font-bold text-white drop-shadow-md">
                {profileData?.student_detail?.first_name || ''} {profileData?.student_detail?.last_name || ''}
              </h1>
              <div className="flex flex-wrap gap-3 mt-2">
                <Badge variant="secondary" className="bg-white/90 text-primary font-medium shadow-sm">
                  <GraduationCap className="h-3 w-3 mr-1" /> 
                  Student
                </Badge>
                <Badge variant="outline" className="text-white border-white/70 bg-black/30 backdrop-blur-sm shadow-sm">
                  <Building className="h-3 w-3 mr-1" /> 
                  {profileData?.dept_detail?.dept_name || 'Not specified'}
                </Badge>
                <Badge variant="outline" className="text-white border-white/70 bg-black/30 backdrop-blur-sm shadow-sm">
                  <Calendar className="h-3 w-3 mr-1" /> 
                  Batch of {profileData?.batch || '2023'}
                </Badge>
              </div>
            </div>
            
            <div className="z-10">
              {isEditing ? (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => {
                    setIsEditing(false);
                  }}
                  className="shadow-md"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel Editing
                </Button>
              ) : (
                <Button onClick={() => setIsEditing(true)} className="shadow-md bg-white/90 text-primary hover:bg-white/100">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {loadingProfile ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="education">Education History</TabsTrigger>
          </TabsList>
          
          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Manage your personal details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} id="profile-form" className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="first_name" className="text-sm font-medium flex items-center">
                        <User className="h-4 w-4 mr-1 text-muted-foreground" />
                        First Name
                      </label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) =>
                          setFormData({ ...formData, first_name: e.target.value })
                        }
                        disabled={!isEditing}
                        className={!isEditing ? "bg-muted" : ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="last_name" className="text-sm font-medium flex items-center">
                        <User className="h-4 w-4 mr-1 text-muted-foreground" />
                        Last Name
                      </label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) =>
                          setFormData({ ...formData, last_name: e.target.value })
                        }
                        disabled={!isEditing}
                        className={!isEditing ? "bg-muted" : ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium flex items-center">
                        <Mail className="h-4 w-4 mr-1 text-muted-foreground" />
                        Email
                      </label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        disabled={!isEditing}
                        className={!isEditing ? "bg-muted" : ""}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="phone_number" className="text-sm font-medium flex items-center">
                        <Phone className="h-4 w-4 mr-1 text-muted-foreground" />
                        Phone Number
                      </label>
                      <Input
                        id="phone_number"
                        type="text"
                        value={formData.phone_number}
                        onChange={(e) =>
                          setFormData({ ...formData, phone_number: e.target.value })
                        }
                        disabled={!isEditing}
                        className={!isEditing ? "bg-muted" : ""}
                      />
                    </div>
                  </form>
                </CardContent>
                <CardFooter className="border-t pt-6">
                  {isEditing && (
                    <Button type="submit" form="profile-form" disabled={isPending} className="w-full">
                      {isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Student Information
                  </CardTitle>
                  <CardDescription>
                    Your student identification details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center text-muted-foreground">
                      <GraduationCap className="h-4 w-4 mr-1" />
                      Student ID
                    </label>
                    <div className="font-medium text-foreground">
                      {profileData?.student_id || profileData?.roll_no || 'Not available'}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center text-muted-foreground">
                      <Building className="h-4 w-4 mr-1" />
                      Department
                    </label>
                    <div className="font-medium text-foreground">
                      {profileData?.dept_detail?.dept_name || 'Not specified'}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      Batch
                    </label>
                    <div className="font-medium text-foreground">
                      {profileData?.batch || '2023'}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center text-muted-foreground">
                      <User className="h-4 w-4 mr-1" />
                      Gender
                    </label>
                    <div className="font-medium text-foreground">
                      {formatGender(profileData?.student_detail?.gender)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Academic Tab */}
          <TabsContent value="academic">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BookOpen className="h-5 w-5 mr-2" />
                    Academic Progress
                  </CardTitle>
                  <CardDescription>
                    Current academic status and progress
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <div className="text-sm font-medium">
                        {formatSemester(profileData?.current_semester || 1)}
                      </div>
                      <div className="text-sm font-medium">
                        {calculateProgress()}% Complete
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full bg-primary"
                        style={{ width: `${calculateProgress()}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>1st Semester</span>
                      <span>Expected Graduation: {calculateGraduationYear()}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted/40 rounded-lg p-4">
                      <div className="text-xl font-bold text-foreground">{profileData?.year || 2}</div>
                      <div className="text-sm text-muted-foreground">Current Year</div>
                    </div>
                    
                    <div className="bg-muted/40 rounded-lg p-4">
                      <div className="text-xl font-bold text-foreground">{profileData?.current_semester || 1}</div>
                      <div className="text-sm text-muted-foreground">Current Semester</div>
                    </div>
                    
                    <div className="bg-muted/40 rounded-lg p-4">
                      <div className="text-xl font-bold text-foreground">{profileData?.total_credits || 72}</div>
                      <div className="text-sm text-muted-foreground">Total Credits</div>
                    </div>
                    
                    <div className="bg-muted/40 rounded-lg p-4">
                      <div className="text-xl font-bold text-foreground">3.75</div>
                      <div className="text-sm text-muted-foreground">Current GPA</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="h-5 w-5 mr-2" />
                    Academic Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <div className="font-medium text-foreground">Dean's List</div>
                      <div className="text-sm text-muted-foreground">Fall 2023</div>
                    </div>
                    
                    <div className="rounded-lg border p-4">
                      <div className="font-medium text-foreground">Programming Competition</div>
                      <div className="text-sm text-muted-foreground">2nd Place, University Hackathon 2022</div>
                    </div>
                    
                    <div className="rounded-lg border p-4">
                      <div className="font-medium text-foreground">Perfect Attendance</div>
                      <div className="text-sm text-muted-foreground">Spring 2023</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Course History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium mb-3 text-foreground">Current Semester</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                          <div>
                            <div className="font-medium text-foreground">CS301: Database Systems</div>
                            <div className="text-sm text-muted-foreground">3 Credits</div>
                          </div>
                          <Badge variant="outline">In Progress</Badge>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                          <div>
                            <div className="font-medium text-foreground">CS302: Operating Systems</div>
                            <div className="text-sm text-muted-foreground">4 Credits</div>
                          </div>
                          <Badge variant="outline">In Progress</Badge>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                          <div>
                            <div className="font-medium text-foreground">CS303: Software Engineering</div>
                            <div className="text-sm text-muted-foreground">3 Credits</div>
                          </div>
                          <Badge variant="outline">In Progress</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-3 text-foreground">Previous Semester</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                          <div>
                            <div className="font-medium text-foreground">CS201: Data Structures</div>
                            <div className="text-sm text-muted-foreground">4 Credits</div>
                          </div>
                          <Badge variant="secondary">A</Badge>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                          <div>
                            <div className="font-medium text-foreground">CS202: Algorithm Analysis</div>
                            <div className="text-sm text-muted-foreground">3 Credits</div>
                          </div>
                          <Badge variant="secondary">A-</Badge>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                          <div>
                            <div className="font-medium text-foreground">MATH201: Linear Algebra</div>
                            <div className="text-sm text-muted-foreground">3 Credits</div>
                          </div>
                          <Badge variant="secondary">B+</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Education History Tab */}
          <TabsContent value="education">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <School className="h-5 w-5 mr-2" />
                  Education History
                </CardTitle>
                <CardDescription>
                  Your previous educational qualifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {educationHistory.map((education) => (
                    <div key={education.id} className="flex border-l-2 border-primary pl-4 pb-6 relative">
                      <div className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-primary"></div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-foreground">{education.institution}</h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge variant="secondary">
                            {education.startYear} - {education.endYear}
                          </Badge>
                          <Badge variant="outline">
                            {education.degree}
                          </Badge>
                          {education.grade !== "Current" && (
                            <Badge variant="outline" className="bg-primary/10">
                              Grade: {education.grade}
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground">
                          {education.field}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
} 