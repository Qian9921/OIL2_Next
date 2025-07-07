"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { getParticipations, getProject, getUser, getClassesByTeacher, getStudentsByClass } from "@/lib/firestore";
import { Participation, Project, User, Class, StudentWithClass } from "@/lib/types";
import { generateAvatar, getStatusColor } from "@/lib/utils";
import { LoadingState } from "@/components/ui/loading-state";
import { 
  Users, 
  Search, 
  Filter,
  BookOpen,
  TrendingUp,
  Calendar,
  MessageSquare,
  Eye,
  Clock,
  Award,
  Target
} from "lucide-react";
import Link from "next/link";

interface StudentWithProjects {
  student: User;
  participations: (Participation & { project: Project })[];
  totalProgress: number;
  activeProjects: number;
  completedProjects: number;
}

export default function TeacherStudentsPage() {
  const { data: session } = useSession();
  const [studentsWithProjects, setStudentsWithProjects] = useState<StudentWithProjects[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<StudentWithProjects | null>(null);
  const [showMessage, setShowMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      loadStudentsData();
    }
  }, [session]);

  const loadStudentsData = async () => {
    if (!session?.user?.id) return;
    
    try {
      // Get teacher's classes first
      const teacherClasses = await getClassesByTeacher(session.user.id);
      
      if (teacherClasses.length === 0) {
        // Teacher has no classes, so no students to show
        setStudentsWithProjects([]);
        return;
      }
      
      // Get all students from all teacher's classes
      const allStudentsMap = new Map<string, StudentWithClass>();
      
      for (const teacherClass of teacherClasses) {
        const classStudents = await getStudentsByClass(teacherClass.id);
        for (const student of classStudents) {
          // Use map to avoid duplicates if student is in multiple classes
          allStudentsMap.set(student.id, student);
        }
      }
      
      const allStudents = Array.from(allStudentsMap.values());
      
      // Process students data
      const studentsData: StudentWithProjects[] = [];
      
      for (const student of allStudents) {
        try {
          // Student already has participations from getStudentsByClass
          const participations = student.participations || [];
          const participationsWithProjects = [];
          
          for (const participation of participations) {
            const project = await getProject(participation.projectId);
            if (project) {
              participationsWithProjects.push({
                ...participation,
                project
              });
            }
          }

          const activeProjects = participationsWithProjects.filter(p => p.status === 'active').length;
          const completedProjects = participationsWithProjects.filter(p => p.status === 'completed').length;
          const totalProgress = participationsWithProjects.length > 0 
            ? Math.round(participationsWithProjects.reduce((sum, p) => sum + p.progress, 0) / participationsWithProjects.length)
            : 0;

          studentsData.push({
            student,
            participations: participationsWithProjects,
            totalProgress,
            activeProjects,
            completedProjects
          });
        } catch (error) {
          console.error(`Error loading data for student ${student.id}:`, error);
        }
      }

      setStudentsWithProjects(studentsData);
    } catch (error) {
      console.error("Error loading students data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = studentsWithProjects.filter(studentData => {
    const matchesSearch = studentData.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         studentData.student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "active") return matchesSearch && studentData.activeProjects > 0;
    if (statusFilter === "completed") return matchesSearch && studentData.completedProjects > 0;
    if (statusFilter === "inactive") return matchesSearch && studentData.activeProjects === 0;
    
    return matchesSearch;
  });

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingState text="Loading students data..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Student Management</h1>
            <p className="text-gray-600 mt-2">
              Monitor and support your students' learning journey 👥
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {filteredStudents.length} students
            </span>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Students</option>
                <option value="active">Active Projects</option>
                <option value="completed">Completed Projects</option>
                <option value="inactive">No Active Projects</option>
              </select>

              {/* Stats */}
              <div className="flex items-center text-sm text-gray-600">
                <Filter className="w-4 h-4 mr-2" />
                Showing {filteredStudents.length} of {studentsWithProjects.length} students
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students Grid */}
        {filteredStudents.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredStudents.map((studentData) => (
              <Card key={studentData.student.id} className="card-hover">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar
                        src={generateAvatar(studentData.student.id)}
                        alt={studentData.student.name}
                        size="md"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {studentData.student.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {studentData.student.email}
                        </p>
                        {studentData.student.profile?.school && (
                          <p className="text-xs text-gray-500">
                            {studentData.student.profile.school}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Progress Overview */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <BookOpen className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-blue-600">
                        {studentData.activeProjects}
                      </div>
                      <div className="text-xs text-gray-600">Active</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <Award className="w-5 h-5 text-green-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-green-600">
                        {studentData.completedProjects}
                      </div>
                      <div className="text-xs text-gray-600">Completed</div>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-purple-600">
                        {studentData.totalProgress}%
                      </div>
                      <div className="text-xs text-gray-600">Avg Progress</div>
                    </div>
                  </div>

                  {/* Recent Projects */}
                  {studentData.participations.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 text-sm">Recent Projects</h4>
                      <div className="space-y-2">
                        {studentData.participations.slice(0, 2).map((participation) => (
                          <div key={participation.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <h5 className="font-medium text-gray-900 text-sm line-clamp-1">
                                {participation.project.title}
                              </h5>
                              <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(participation.status)}`}>
                                {participation.status.charAt(0).toUpperCase() + participation.status.slice(1)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{participation.project.ngoName}</span>
                              <span>{participation.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                              <div
                                className="bg-blue-500 h-1 rounded-full"
                                style={{ width: `${participation.progress}%` }}
                              />
                            </div>
                          </div>
                        ))}
                        {studentData.participations.length > 2 && (
                          <p className="text-xs text-gray-500 text-center">
                            +{studentData.participations.length - 2} more projects
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Last Activity */}
                  {studentData.participations.length > 0 && (
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Last active</span>
                      </div>
                      <span>
                        {formatTimeAgo(studentData.participations[0]?.joinedAt)}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setSelectedStudent(studentData)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setShowMessage(studentData.student.id)}
                    >
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm || statusFilter !== "all" 
                  ? "No students found" 
                  : "No students in your classes yet"}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search criteria or filters"
                  : "Create a class and share the invite code with students to get started"}
              </p>
              {(searchTerm || statusFilter !== "all") ? (
                <Button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                  variant="outline"
                >
                  Clear Filters
                </Button>
              ) : (
                <Link href="/teacher/classes">
                  <Button>
                    Create Your First Class
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Student Details Modal */}
        {selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Student Details</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStudent(null)}
                  >
                    ✕
                  </Button>
                </div>

                {/* Student Info */}
                <div className="flex items-center space-x-4 mb-6">
                  <Avatar
                    src={generateAvatar(selectedStudent.student.id)}
                    alt={selectedStudent.student.name}
                    size="lg"
                  />
                  <div>
                    <h3 className="text-xl font-semibold">{selectedStudent.student.name}</h3>
                    <p className="text-gray-600">{selectedStudent.student.email}</p>
                    {selectedStudent.student.profile?.school && (
                      <p className="text-sm text-gray-500">{selectedStudent.student.profile.school}</p>
                    )}
                  </div>
                </div>

                {/* Progress Overview */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{selectedStudent.activeProjects}</div>
                    <div className="text-sm text-gray-600">Active Projects</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{selectedStudent.completedProjects}</div>
                    <div className="text-sm text-gray-600">Completed</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{selectedStudent.totalProgress}%</div>
                    <div className="text-sm text-gray-600">Avg Progress</div>
                  </div>
                </div>

                {/* Project List */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Projects</h4>
                  {selectedStudent.participations.length > 0 ? (
                    <div className="space-y-3">
                      {selectedStudent.participations.map((participation) => (
                        <div key={participation.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium">{participation.project.title}</h5>
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(participation.status)}`}>
                              {participation.status.charAt(0).toUpperCase() + participation.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">by {participation.project.ngoName}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex-1 mr-4">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${participation.progress}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-sm font-medium">{participation.progress}%</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Joined {formatTimeAgo(participation.joinedAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No projects joined yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message Modal */}
        {showMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Send Message</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMessage(null)}
                  >
                    ✕
                  </Button>
                </div>
                
                <div className="text-center py-8">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Messaging Feature</h3>
                  <p className="text-gray-600 mb-4">
                    The messaging feature is coming soon! You'll be able to communicate directly with students.
                  </p>
                  <Button onClick={() => setShowMessage(null)}>
                    Got it
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
} 