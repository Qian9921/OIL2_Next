"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { PageHero } from "@/components/layout/page-hero";
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
        <PageHero
          eyebrow="Teacher workspace"
          icon={GraduationCap}
          title="My Classes"
          description="Manage your classes, invite students, and keep the classroom experience organized and easy to navigate."
          actions={
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Class
            </Button>
          }
        />

        {/* Classes Grid */}
        {classes.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {classes.map((classData) => (
              <Card key={classData.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-700 shadow-sm">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-lg leading-6">{classData.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {classData.studentIds.length} enrolled students
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(classData)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(classData)}
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                    {classData.description}
                  </p>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Invite code</p>
                        <p className="mt-1 font-mono text-sm font-medium text-slate-800">{classData.inviteCode}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => copyInviteCode(classData.inviteCode)}>
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        Copy
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-blue-50 p-3 text-center">
                      <div className="text-lg font-semibold text-blue-700">{classData.studentIds.length}</div>
                      <div className="text-xs text-slate-500">Students</div>
                    </div>
                    <div className="rounded-xl bg-green-50 p-3 text-center">
                      <div className="text-lg font-semibold text-green-700">{classData.maxStudents || '∞'}</div>
                      <div className="text-xs text-slate-500">Max Students</div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Link href={`/teacher/classes/${classData.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <Users className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </Link>
                  </div>

                  <div className="border-t border-slate-200 pt-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
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