import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Loader2, SendHorizonal } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { updateParticipation, createSubmission } from '@/lib/firestore';
import { Project, Participation } from '@/lib/types';

interface SubmitProjectDialogProps {
  project: Project | null;
  participation: Participation | null;
  showDialog: boolean;
  setShowDialog: (show: boolean) => void;
  onSuccess?: () => void;
  buttonClassName?: string;
  hideFloatingButton?: boolean;
}

export function SubmitProjectDialog({
  project,
  participation,
  showDialog,
  setShowDialog,
  onSuccess,
  buttonClassName = "shadow-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium px-4 py-2",
  hideFloatingButton = false
}: SubmitProjectDialogProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [projectSubmissionSummary, setProjectSubmissionSummary] = useState('');
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);

  // Handle submit project for review
  const handleSubmitProject = async () => {
    if (!participation || !project || !session?.user) return;
    
    if (!projectSubmissionSummary.trim()) {
      toast({ title: "Missing Summary", description: "Please write a submission summary before submitting.", variant: "destructive" });
      return;
    }
    
    setIsSubmittingProject(true);
    
    try {
      // Call the API to create submission
      await createSubmission({
        participationId: participation.id,
        projectId: project.id,
        studentId: participation.studentId,
        studentName: session.user.name || 'Student',
        content: projectSubmissionSummary.trim(),
        status: 'pending'
      });
      
      // Update participation status
      await updateParticipation(participation.id, {
        status: 'completed',
        completedAt: Timestamp.now()
      });
      
      showSuccessToast(toast, "Project Submitted", { description: "Your project has been submitted for review!" });
      setShowDialog(false);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Redirect to my-projects page after submission
      setTimeout(() => {
        router.push('/student/my-projects');
      }, 1500);
      
    } catch (error) {
      console.error('Error submitting project:', error);
      showErrorToast(toast, "Submission Error", { description: "Failed to submit project. Please try again." });
    } finally {
      setIsSubmittingProject(false);
    }
  };

  return (
    <>
      {/* Project Submission Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              Congratulations! Submit Your Project
            </DialogTitle>
            <DialogDescription>
              You've completed all tasks in this project! Please provide a summary of what you've learned and accomplished.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={projectSubmissionSummary}
              onChange={(e) => setProjectSubmissionSummary(e.target.value)}
              placeholder="Describe what you've accomplished, challenges you faced, and what you've learned..."
              className="min-h-[150px]"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDialog(false)}
            >
              Later
            </Button>
            <Button 
              onClick={handleSubmitProject}
              disabled={isSubmittingProject}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              {isSubmittingProject ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <SendHorizonal className="w-4 h-4 mr-2" />
                  Submit Project for Review
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Submit Button (conditionally rendered) */}
      {!hideFloatingButton && !showDialog && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            onClick={() => setShowDialog(true)}
            className={buttonClassName}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Submit Project
          </Button>
        </div>
      )}
    </>
  );
} 