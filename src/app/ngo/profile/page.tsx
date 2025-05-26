"use client";

import { useEffect, useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getUser, updateUser, getNGODashboard, uploadProfilePicture, deleteUserAccount } from "@/lib/firestore";
import { User, NGODashboard } from "@/lib/types";
import { generateAvatar } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { 
  Building, 
  Globe, 
  MapPin, 
  Edit,
  Save,
  Trophy,
  Users,
  FolderOpen,
  AlertCircle,
  Heart,
  X,
  Upload,
  Trash2,
  Loader2
} from "lucide-react";

export default function NGOProfilePage() {
  const { data: session, update } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<NGODashboard | null>(null);
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
    website: "",
    location: "",
    focusAreas: [] as string[]
  });
  const [newFocusArea, setNewFocusArea] = useState("");

  useEffect(() => {
    if (session?.user?.id) {
      loadUserData();
    }
  }, [session]);

  const loadUserData = async () => {
    try {
      const [userData, dashboardData] = await Promise.all([
        getUser(session!.user!.id),
        getNGODashboard(session!.user!.id)
      ]);
      
      setUser(userData);
      setDashboard(dashboardData);
      
      if (userData) {
        setEditForm({
          name: userData.name,
          bio: userData.profile?.bio || "",
          website: userData.profile?.website || "",
          location: userData.profile?.location || "",
          focusAreas: userData.profile?.focusAreas || []
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
          website: editForm.website,
          location: editForm.location,
          focusAreas: editForm.focusAreas
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
        description: "Your organization profile has been successfully updated.",
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

  const handleAddFocusArea = () => {
    if (newFocusArea.trim() && !editForm.focusAreas.includes(newFocusArea.trim())) {
      setEditForm({
        ...editForm,
        focusAreas: [...editForm.focusAreas, newFocusArea.trim()]
      });
      setNewFocusArea("");
    }
  };

  const handleRemoveFocusArea = (area: string) => {
    setEditForm({
      ...editForm,
      focusAreas: editForm.focusAreas.filter(a => a !== area)
    });
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
        description: "Your organization logo has been successfully updated.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your image.",
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
        description: "Your organization account has been successfully deleted.",
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
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner" />
        </div>
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
              <AlertDialogTitle>Delete Organization Account</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>Are you sure you want to delete your organization's account? This action cannot be undone.</p>
                <p className="font-medium text-red-600">
                  This will permanently delete your organization's account and all associated projects.
                </p>
                <p>
                  • Projects with active participants will be archived<br />
                  • Projects without participants will be permanently deleted<br />
                  • Your organization's information will be removed
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
            <h1 className="text-3xl font-bold text-gray-900">Organization Profile</h1>
            <p className="text-gray-600 mt-2">
              Manage your organization information and impact data 🏢
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
                  <Building className="w-5 h-5 text-purple-600" />
                  <span>Organization Information</span>
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
                        className="text-2xl font-bold bg-transparent border-b border-gray-300 focus:border-purple-500 outline-none w-full"
                        placeholder="Organization Name"
                      />
                    ) : (
                      <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
                    )}
                    <p className="text-gray-500">{user?.email}</p>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-2">
                      NGO Organization
                    </span>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Bio
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={4}
                      placeholder="Introduce your organization's mission, vision, and main work..."
                    />
                  ) : (
                    <p className="text-gray-700">
                      {user?.profile?.bio || "No organization bio added yet"}
                    </p>
                  )}
                </div>

                {/* Website and Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Official Website
                    </label>
                    {isEditing ? (
                      <input
                        type="url"
                        value={editForm.website}
                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="https://yourorganization.org"
                      />
                    ) : (
                      <p className="text-gray-700 flex items-center">
                        <Globe className="w-4 h-4 mr-2 text-gray-500" />
                        {user?.profile?.website ? (
                          <a 
                            href={user.profile.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:underline"
                          >
                            {user.profile.website}
                          </a>
                        ) : "Not set"}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., Haidian District, Beijing"
                      />
                    ) : (
                      <p className="text-gray-700 flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                        {user?.profile?.location || "Not set"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Focus Areas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Focus Areas
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {editForm.focusAreas.map((area, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                        <Heart className="w-3 h-3 mr-1" />
                        {area}
                        {isEditing && (
                          <button
                            onClick={() => handleRemoveFocusArea(area)}
                            className="ml-2 text-green-600 hover:text-green-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  
                  {isEditing && (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newFocusArea}
                        onChange={(e) => setNewFocusArea(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddFocusArea()}
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Add focus area..."
                      />
                      <Button onClick={handleAddFocusArea} variant="outline">
                        Add
                      </Button>
                    </div>
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
                    Delete Organization Account
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    This will permanently delete your organization account. Active projects will be archived.
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
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  <span>Impact Statistics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <FolderOpen className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600">
                    {dashboard?.publishedProjects || 0}
                  </div>
                  <div className="text-sm text-gray-600">Published Projects</div>
                </div>

                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">
                    {dashboard?.totalParticipants || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Participants</div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Trophy className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">
                    {dashboard?.completedProjects || 0}
                  </div>
                  <div className="text-sm text-gray-600">Completed Projects</div>
                </div>

                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-600">
                    {dashboard?.pendingReviews || 0}
                  </div>
                  <div className="text-sm text-gray-600">Pending Reviews</div>
                </div>
              </CardContent>
            </Card>

            {/* Project Performance */}
            {dashboard?.projectStats && dashboard.projectStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dashboard.projectStats.slice(0, 3).map((stat) => (
                    <div key={stat.projectId} className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 text-sm mb-2 truncate">
                        {stat.projectTitle}
                      </h4>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Participation Rate</span>
                          <span>{stat.participants} participants</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Completion Rate</span>
                          <span>{Math.round(stat.completionRate)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div
                            className="bg-purple-500 h-1 rounded-full"
                            style={{ width: `${stat.averageProgress}%` }}
                          />
                        </div>
                      </div>
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