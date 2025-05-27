"use client";

import { useEffect, useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getUser, updateUser, getTeacherDashboard, uploadProfilePicture, deleteUserAccount } from "@/lib/firestore";
import { User, TeacherDashboard } from "@/lib/types";
import { generateAvatar } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/ui/loading-state";
import { 
  GraduationCap, 
  School, 
  BookOpen, 
  Edit,
  Save,
  Users,
  FileText,
  Award,
  Clock,
  Target,
  Upload,
  Trash2,
  Loader2,
  X
} from "lucide-react";

export default function TeacherProfilePage() {
  const { data: session, update } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<TeacherDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();
  
  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    institution: "",
    subject: "",
    experience: ""
  });

  useEffect(() => {
    if (session?.user?.id) {
      loadUserData();
    }
  }, [session]);

  const loadUserData = async () => {
    try {
      const [userData, dashboardData] = await Promise.all([
        getUser(session!.user!.id),
        getTeacherDashboard(session!.user!.id)
      ]);
      
      setUser(userData);
      setDashboard(dashboardData);
      
      if (userData) {
        setEditForm({
          name: userData.name,
          bio: userData.profile?.bio || "",
          institution: userData.profile?.institution || "",
          subject: userData.profile?.subject || "",
          experience: userData.profile?.experience?.toString() || ""
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      await updateUser(user.id, {
        name: editForm.name,
        profile: {
          ...user.profile,
          bio: editForm.bio,
          institution: editForm.institution,
          subject: editForm.subject,
          experience: editForm.experience ? parseInt(editForm.experience) : undefined
        }
      });
      
      // Update session
      await update({
        ...session,
        user: {
          ...session?.user,
          name: editForm.name
        }
      });
      
      await loadUserData();
      setIsEditing(false);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error updating user:", error);
      
      toast({
        title: "Update Failed",
        description: "There was an error updating your profile.",
        variant: "destructive"
      });
    }
  };
  
  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !session?.user?.id) return;
    
    const file = e.target.files[0];
    
    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 2MB.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file.",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      const avatarUrl = await uploadProfilePicture(session.user.id, file);
      
      // Update session
      await update({
        ...session,
        user: {
          ...session?.user,
          image: avatarUrl
        }
      });
      
      // Reload user data
      await loadUserData();
      
      toast({
        title: "Profile Picture Updated",
        description: "Your profile picture has been successfully updated.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your profile picture.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (!session?.user?.id) return;
    
    setIsDeleting(true);
    
    try {
      await deleteUserAccount(session.user.id);
      
      toast({
        title: "Account Deleted",
        description: "Your account has been successfully deleted.",
        variant: "default"
      });
      
      // Sign out
      await signOut({ redirect: false });
      
      // Redirect to home page
      router.push('/');
    } catch (error) {
      console.error("Error deleting account:", error);
      setIsDeleting(false);
      setShowDeleteDialog(false);
      
      toast({
        title: "Deletion Failed",
        description: "There was an error deleting your account.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingState text="Loading profile..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Delete Account Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Account</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>Are you sure you want to delete your account? This action cannot be undone.</p>
                <p className="font-medium text-red-600">
                  This will permanently delete your account, all your supervisions, and any associated data.
                </p>
                <p>
                  • Your active supervisions will be reassigned<br />
                  • Your reviews and feedback will be removed<br />
                  • Your personal information will be deleted
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Teacher Profile</h1>
            <p className="text-gray-600 mt-2">
              Manage your teacher information and supervision data 👨‍🏫
            </p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex space-x-3">
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <GraduationCap className="w-5 h-5 text-green-600" />
                  <span>Teacher Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar and Name */}
                <div className="flex items-center space-x-4">
                  <div className="relative group">
                    <Avatar
                      src={user?.avatar || generateAvatar(user?.email || "")}
                      alt={user?.name}
                      size="lg"
                      className={`cursor-pointer transition-opacity ${isUploading ? 'opacity-50' : 'group-hover:opacity-80'}`}
                      onClick={handleProfilePictureClick}
                    />
                    {isUploading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-700" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="w-5 h-5 text-white drop-shadow-md" />
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                      disabled={isUploading}
                    />
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="text-2xl font-bold bg-transparent border-b border-gray-300 focus:border-green-500 outline-none w-full"
                        placeholder="Your Name"
                      />
                    ) : (
                      <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
                    )}
                    <p className="text-gray-500">{user?.email}</p>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                      Teacher
                    </span>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows={3}
                      placeholder="Tell us about your teaching philosophy and background..."
                    />
                  ) : (
                    <p className="text-gray-700">
                      {user?.profile?.bio || "No bio added yet"}
                    </p>
                  )}
                </div>

                {/* Teaching Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Institution
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.institution}
                        onChange={(e) => setEditForm({ ...editForm, institution: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Your school or institution"
                      />
                    ) : (
                      <p className="text-gray-700 flex items-center">
                        <School className="w-4 h-4 mr-2 text-gray-500" />
                        {user?.profile?.institution || "Not set"}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.subject}
                        onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="e.g., English, Math, Science"
                      />
                    ) : (
                      <p className="text-gray-700 flex items-center">
                        <BookOpen className="w-4 h-4 mr-2 text-gray-500" />
                        {user?.profile?.subject || "Not set"}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Years of Experience
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.experience}
                      onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Years of teaching experience"
                      min="0"
                    />
                  ) : (
                    <p className="text-gray-700 flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-gray-500" />
                      {user?.profile?.experience ? `${user.profile.experience} years` : "Not set"}
                    </p>
                  )}
                </div>

                {/* Delete Account Button */}
                <div className="pt-4 border-t border-gray-200">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    This will permanently delete your account and all associated data.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Card */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span>Supervision Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">
                    {dashboard?.studentsSupervised || 0}
                  </div>
                  <div className="text-sm text-gray-600">Students Supervised</div>
                </div>

                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">
                    {dashboard?.projectsSupervised || 0}
                  </div>
                  <div className="text-sm text-gray-600">Projects Supervised</div>
                </div>

                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <FileText className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-600">
                    {dashboard?.pendingReviews || 0}
                  </div>
                  <div className="text-sm text-gray-600">Pending Reviews</div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Award className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600">
                    {dashboard?.recentSubmissions?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Recent Submissions</div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Submissions */}
            {dashboard?.recentSubmissions && dashboard.recentSubmissions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Latest Submissions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dashboard.recentSubmissions.slice(0, 3).map((submission) => (
                    <div key={submission.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-sm truncate">
                          Student Submission
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          submission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                          submission.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {submission.status === 'pending' ? 'Pending' :
                           submission.status === 'approved' ? 'Approved' :
                           submission.status === 'rejected' ? 'Rejected' : 'Needs Revision'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {submission.submittedAt.toDate().toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 