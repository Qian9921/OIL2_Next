"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getClassesByTeacher, createClass, updateClass, deleteClass, getClassDashboard } from "@/lib/firestore";
import { Class, ClassDashboard } from "@/lib/types";
import { 
  Users, 
  Plus, 
  Settings, 
  Copy, 
  Trash2, 
  Eye,
  BookOpen,
  FileText,
  Clock,
  Edit,
  CheckCircle,
  AlertCircle,
  Calendar,
  UserPlus,
  GraduationCap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/loading-state";
import Link from "next/link";

export default function TeacherClassesPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [classDashboards, setClassDashboards] = useState<{ [classId: string]: ClassDashboard }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states
  const [className, setClassName] = useState("");
  const [classDescription, setClassDescription] = useState("");
  const [maxStudents, setMaxStudents] = useState<number | "">("");

  useEffect(() => {
    if (session?.user?.id) {
      loadClasses();
    }
  }, [session]);

  const loadClasses = async () => {
    if (!session?.user?.id) return;
    
    try {
      const teacherClasses = await getClassesByTeacher(session.user.id);
      setClasses(teacherClasses);
      
      // 并行加载每个班级的仪表板数据
      const dashboardPromises = teacherClasses.map(async (classItem) => {
        try {
          const dashboard = await getClassDashboard(classItem.id);
          return { classId: classItem.id, dashboard };
        } catch (error) {
          console.error(`Error loading dashboard for class ${classItem.id}:`, error);
          return { classId: classItem.id, dashboard: null };
        }
      });
      
      const dashboardResults = await Promise.all(dashboardPromises);
      const dashboards: { [classId: string]: ClassDashboard } = {};
      
      dashboardResults.forEach(({ classId, dashboard }) => {
        if (dashboard) {
          dashboards[classId] = dashboard;
        }
      });
      
      setClassDashboards(dashboards);
    } catch (error) {
      console.error("Error loading classes:", error);
      toast({
        title: "Error",
        description: "Failed to load classes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClass = async () => {
    if (!session?.user?.id || !session?.user?.name) return;
    
    setIsSubmitting(true);
    try {
      await createClass({
        name: className,
        description: classDescription,
        teacherId: session.user.id,
        teacherName: session.user.name,
        isActive: true,
        maxStudents: maxStudents === "" ? undefined : Number(maxStudents)
      });
      
      await loadClasses();
      setShowCreateDialog(false);
      resetForm();
      toast({
        title: "Success",
        description: "Class created successfully!",
        variant: "default"
      });
    } catch (error) {
      console.error("Error creating class:", error);
      toast({
        title: "Error",
        description: "Failed to create class. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClass = async () => {
    if (!selectedClass) return;
    
    setIsSubmitting(true);
    try {
      await updateClass(selectedClass.id, {
        name: className,
        description: classDescription,
        maxStudents: maxStudents === "" ? undefined : Number(maxStudents)
      });
      
      await loadClasses();
      setShowEditDialog(false);
      resetForm();
      toast({
        title: "Success",
        description: "Class updated successfully!",
        variant: "default"
      });
    } catch (error) {
      console.error("Error updating class:", error);
      toast({
        title: "Error",
        description: "Failed to update class. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClass) return;
    
    setIsSubmitting(true);
    try {
      await deleteClass(selectedClass.id);
      await loadClasses();
      setShowDeleteDialog(false);
      setSelectedClass(null);
      toast({
        title: "Success",
        description: "Class deleted successfully!",
        variant: "default"
      });
    } catch (error) {
      console.error("Error deleting class:", error);
      toast({
        title: "Error",
        description: "Failed to delete class. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
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

  const openEditDialog = (classData: Class) => {
    setSelectedClass(classData);
    setClassName(classData.name);
    setClassDescription(classData.description || "");
    setMaxStudents(classData.maxStudents || "");
    setShowEditDialog(true);
  };

  const openDeleteDialog = (classData: Class) => {
    setSelectedClass(classData);
    setShowDeleteDialog(true);
  };

  const resetForm = () => {
    setClassName("");
    setClassDescription("");
    setMaxStudents("");
    setSelectedClass(null);
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
        <LoadingState text="Loading classes..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Classes</h1>
            <p className="text-gray-600 mt-2">
              Manage your classes and students 🎓
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Class
          </Button>
        </div>

        {/* Classes Grid */}
        {classes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classData) => (
              <Card key={classData.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{classData.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {classData.studentIds.length} students
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(classData)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(classData)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {classData.description}
                  </p>
                  
                  {/* Invite Code */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Invite Code</p>
                        <p className="font-mono text-sm font-medium">{classData.inviteCode}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyInviteCode(classData.inviteCode)}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </div>

                  {/* Class Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {classData.studentIds.length}
                      </div>
                      <div className="text-xs text-gray-600">Students</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {classData.maxStudents || "∞"}
                      </div>
                      <div className="text-xs text-gray-600">Max Students</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Link href={`/teacher/classes/${classData.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <Users className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                  </div>

                  {/* Creation Date */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="w-3 h-3 mr-1" />
                      Created {formatDate(classData.createdAt)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <GraduationCap className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No classes yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first class to start managing students and reviewing their submissions
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Class
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create Class Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Class</DialogTitle>
              <DialogDescription>
                Create a new class and get an invite code to share with your students
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class Name *
                </label>
                <Input
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g., Web Development 101"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <Textarea
                  value={classDescription}
                  onChange={(e) => setClassDescription(e.target.value)}
                  placeholder="Brief description of the class..."
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Students (Optional)
                </label>
                <Input
                  type="number"
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Leave empty for unlimited"
                  min="1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateClass}
                disabled={!className.trim() || isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Class"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Class Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Class</DialogTitle>
              <DialogDescription>
                Update your class information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class Name *
                </label>
                <Input
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g., Web Development 101"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <Textarea
                  value={classDescription}
                  onChange={(e) => setClassDescription(e.target.value)}
                  placeholder="Brief description of the class..."
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Students (Optional)
                </label>
                <Input
                  type="number"
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Leave empty for unlimited"
                  min="1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditClass}
                disabled={!className.trim() || isSubmitting}
              >
                {isSubmitting ? "Updating..." : "Update Class"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Class Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Class</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedClass?.name}"? This action cannot be undone.
                All students will be removed from this class.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteClass}
                className="bg-red-600 hover:bg-red-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Deleting..." : "Delete Class"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
} 