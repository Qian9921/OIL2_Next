"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUser, getClass, leaveClass } from "@/lib/firestore";
import { User, Class } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { generateAvatar } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  Users, 
  UserPlus, 
  AlertCircle,
  CheckCircle,
  Calendar,
  GraduationCap,
  BookOpen,
  User as UserIcon,
  LogOut,
  Copy
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/loading-state";

export default function StudentClassPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [classData, setClassData] = useState<Class | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    loadUserAndClass();
  }, [session]);

  const loadUserAndClass = async () => {
    if (!session?.user?.id) return;
    
    try {
      const userData = await getUser(session.user.id);
      setUser(userData);
      
      if (userData?.classId) {
        const classInfo = await getClass(userData.classId);
        setClassData(classInfo);
      }
    } catch (error) {
      console.error("Error loading user and class data:", error);
      toast({
        title: "Error",
        description: "Failed to load class information. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveClass = async () => {
    if (!user?.classId || !session?.user?.id) return;
    
    setIsLeaving(true);
    try {
      const result = await leaveClass(session.user.id, user.classId);
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
          variant: "default"
        });
        // Reload data
        await loadUserAndClass();
      } else {
        toast({
          title: "Failed to Leave",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error leaving class:", error);
      toast({
        title: "Error",
        description: "Failed to leave class. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLeaving(false);
      setShowLeaveDialog(false);
    }
  };

  const copyInviteCode = async (inviteCode: string) => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      toast({
        title: "Copied",
        description: "Invite code copied to clipboard!",
        variant: "default"
      });
    } catch (error) {
      console.error("Error copying invite code:", error);
      toast({
        title: "Error",
        description: "Failed to copy invite code.",
        variant: "destructive"
      });
    }
  };

  const formatDate = (timestamp: any) => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingState text="Loading class information..." />
      </MainLayout>
    );
  }

  // If user hasn't joined a class
  if (!user?.classId || !classData) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">My Class</h1>
            <p className="text-gray-600 mt-2">
              You haven't joined any class yet 👥
            </p>
          </div>

          <Card>
            <CardContent className="p-12 text-center">
              <UserPlus className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Class Yet
              </h3>
              <p className="text-gray-600 mb-6">
                Use the invite code provided by your teacher to join a class and get personalized guidance and project reviews
              </p>
              <Link href="/student/join-class">
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Class
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Why join a class?</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>• Get personalized guidance and feedback from teachers</p>
                    <p>• Teachers can review your project submissions</p>
                    <p>• Learn and communicate with classmates</p>
                    <p>• Better learning experience and support</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">My Class</h1>
          <p className="text-gray-600 mt-2">
            Class information and teacher details 🎓
          </p>
        </div>

        {/* Class Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <span>Class Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{classData.name}</h3>
                <p className="text-gray-600 mb-4">
                  {classData.description || "No description provided"}
                </p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">{formatDate(classData.createdAt)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Students:</span>
                    <span className="font-medium">{classData.studentIds.length}</span>
                    {classData.maxStudents && (
                      <span className="text-gray-500">/ {classData.maxStudents}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium text-green-600">Active</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Invite Code</h4>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-700 mb-1">Share with friends</p>
                      <p className="text-xl font-mono font-bold text-blue-800">{classData.inviteCode}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInviteCode(classData.inviteCode)}
                      className="border-blue-200 text-blue-700 hover:bg-blue-100"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teacher Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserIcon className="w-5 h-5 text-purple-600" />
              <span>Teacher Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Avatar
                src={generateAvatar(classData.teacherId)}
                alt={classData.teacherName}
                size="lg"
              />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{classData.teacherName}</h3>
                <p className="text-gray-600">Class Teacher</p>
                <p className="text-sm text-gray-500 mt-1">
                  Provides guidance and reviews your project submissions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common learning and project-related actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/student/projects">
                <Button variant="outline" className="w-full h-auto p-4">
                  <div className="text-center">
                    <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <div className="font-medium">Browse Projects</div>
                    <div className="text-sm text-gray-600">Find interesting projects</div>
                  </div>
                </Button>
              </Link>
              
              <Link href="/student/my-projects">
                <Button variant="outline" className="w-full h-auto p-4">
                  <div className="text-center">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <div className="font-medium">My Projects</div>
                    <div className="text-sm text-gray-600">View project progress</div>
                  </div>
                </Button>
              </Link>

              <Link href="/student/certificates">
                <Button variant="outline" className="w-full h-auto p-4">
                  <div className="text-center">
                    <Users className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                    <div className="font-medium">My Certificates</div>
                    <div className="text-sm text-gray-600">View earned certificates</div>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Leave Class Section */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Danger Zone</CardTitle>
            <CardDescription>
              Actions that cannot be undone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Leave Class</h4>
                <p className="text-sm text-gray-600">
                  Remove yourself from this class. You'll need the invite code to rejoin.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowLeaveDialog(true)}
                className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave Class
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Leave Class Confirmation Dialog */}
        <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave Class</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to leave the class "{classData.name}"?
                <br />
                <br />
                This action will:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Remove you from the class</li>
                  <li>Remove the teacher's ability to review your submissions</li>
                  <li>You'll need the invite code to rejoin the class</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLeaving}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLeaveClass}
                disabled={isLeaving}
                className="bg-red-600 hover:bg-red-700"
              >
                {isLeaving ? "Leaving..." : "Leave Class"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
} 