"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinClass } from "@/lib/firestore";
import { 
  UserPlus, 
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function JoinClassPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinClass = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Login Required",
        description: "Please log in to join a class",
        variant: "destructive"
      });
      return;
    }

    if (!inviteCode.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter an invite code",
        variant: "destructive"
      });
      return;
    }

    setIsJoining(true);
    try {
      const result = await joinClass(session.user.id, inviteCode.trim().toUpperCase());
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
          variant: "default"
        });
        router.push('/student/class');
      } else {
        toast({
          title: "Failed to Join",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error joining class:", error);
      toast({
        title: "Error",
        description: "Failed to join class. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoinClass();
    }
  };

  return (
    <MainLayout>
      <div className="max-w-md mx-auto space-y-6">
        {/* Page Title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Join Class</h1>
          <p className="text-gray-600 mt-2">
            Enter the invite code provided by your teacher 👥
          </p>
        </div>

        {/* Join Class Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle>Enter Invite Code</CardTitle>
            <CardDescription>
              Get the 6-digit invite code from your teacher to join the class
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invite Code
              </label>
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="text-center text-lg font-mono tracking-wider"
                disabled={isJoining}
              />
            </div>
            
            <Button 
              onClick={handleJoinClass}
              disabled={!inviteCode.trim() || isJoining}
              className="w-full"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining Class...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Class
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Need Help?</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• Get the invite code from your teacher</p>
                  <p>• Invite codes are usually 6-character combinations of letters and numbers</p>
                  <p>• Each student can only join one class</p>
                  <p>• After joining a class, you can participate in projects and receive teacher guidance</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => router.push('/student')}
          >
            Back to Student Dashboard
          </Button>
        </div>
      </div>
    </MainLayout>
  );
} 