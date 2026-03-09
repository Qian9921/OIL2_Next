"use client";

import { useEffect, useState, Fragment } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { getSubmissions, updateSubmission, updateParticipation, getProject, getParticipation, getSubmissionsForTeacher } from "@/lib/firestore";
import { Submission, Project, Participation } from "@/lib/types";
import { generateAvatar, getStatusColor } from "@/lib/utils";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { 
  FileText, 
  Clock, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Calendar,
  MessageSquare,
  Star,
  Send,
  Download,
  ExternalLink,
  Target,
  Github,
  User,
  BarChart3
} from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/loading-state";
import Link from "next/link";

// Enhanced submission type with additional details
interface EnhancedSubmission extends Submission {
  projectTitle?: string;
  subtaskTitle?: string;
  participationProgress?: number;
  githubRepo?: string;
}

export default function TeacherSubmissionsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<EnhancedSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [reviewingSubmission, setReviewingSubmission] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [processingSubmission, setProcessingSubmission] = useState<string | null>(null);
  const [submissionToQuickApprove, setSubmissionToQuickApprove] = useState<EnhancedSubmission | null>(null);
  const [submissionToReject, setSubmissionToReject] = useState<EnhancedSubmission | null>(null);
  const [submissionToNeedsRevision, setSubmissionToNeedsRevision] = useState<EnhancedSubmission | null>(null);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      // Get submissions for this teacher's classes only
      const submissionsData = await getSubmissionsForTeacher(session?.user?.id || "");
      
      // 并行增强提交数据，获取项目和参与详细信息
      const enhancementPromises = submissionsData.map(async (submission) => {
        try {
          const [project, participation] = await Promise.all([
            getProject(submission.projectId),
            getParticipation(submission.participationId)
          ]);
          
          const enhanced: EnhancedSubmission = {
            ...submission,
            projectTitle: project?.title || "Unknown Project",
            participationProgress: participation?.progress || 0,
            githubRepo: participation?.studentGitHubRepo,
          };
          
          return enhanced;
        } catch (error) {
          console.error(`Error enhancing submission ${submission.id}:`, error);
          // Return submission without enhancement if there's an error
          return submission as EnhancedSubmission;
        }
      });
      
      const enhancedSubmissions = await Promise.all(enhancementPromises);
      
      setSubmissions(enhancedSubmissions);
    } catch (error) {
      console.error("Error loading submissions:", error);
      toast({
        title: "Error",
        description: "Failed to load submissions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewSubmission = async (submissionId: string, status: 'approved' | 'rejected' | 'needs_revision', rating?: number, comment?: string) => {
    setProcessingSubmission(submissionId);
    
    try {
      const updateData: any = {
        status,
        reviewComment: comment,
        reviewedBy: session?.user?.id,
        reviewedAt: Timestamp.now()
      };
      
      // Only include rating for approved submissions
      if (status === 'approved' && rating !== undefined) {
        updateData.rating = rating;
      }
      
      await updateSubmission(submissionId, updateData);
      
      // If approved, update participation status to completed
      if (status === 'approved') {
        const submission = submissions.find(s => s.id === submissionId);
        if (submission) {
          await updateParticipation(submission.participationId, {
            status: 'completed',
            completedAt: Timestamp.now()
          });
        }
      }
      
      // Reload submissions
      await loadSubmissions();
      showSuccessToast(toast, "Review Success", {
        description: "Submission reviewed successfully!"
      });
    } catch (error) {
      console.error("Error reviewing submission:", error);
      showErrorToast(toast, "Review Failed", {
        description: "Error reviewing submission. Please try again."
      });
    } finally {
      setProcessingSubmission(null);
      setReviewingSubmission(null);
      setReviewComment("");
      setReviewRating(5);
    }
  };

  const handleQuickApprovalIntent = (submission: EnhancedSubmission) => {
    setSubmissionToQuickApprove(submission);
  };

  const handleRejectIntent = (submission: EnhancedSubmission) => {
    setSubmissionToReject(submission);
  };

  const handleNeedsRevisionIntent = (submission: EnhancedSubmission) => {
    setSubmissionToNeedsRevision(submission);
  };

  const handleQuickApproval = async (submissionId: string) => {
    await handleReviewSubmission(submissionId, 'approved', 5, 'Quick approval - good work!');
    setSubmissionToQuickApprove(null);
  };

  const handleReject = async (submissionId: string, comment?: string) => {
    await handleReviewSubmission(submissionId, 'rejected', undefined, comment || 'Submission rejected');
    setSubmissionToReject(null);
  };

  const handleNeedsRevision = async (submissionId: string, comment?: string) => {
    await handleReviewSubmission(submissionId, 'needs_revision', undefined, comment || 'Revision needed');
    setSubmissionToNeedsRevision(null);
  };

  // Filter and sort submissions
  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = !searchTerm || 
      submission.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.projectTitle?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || submission.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    if (sortBy === "newest") {
      return b.submittedAt.toDate().getTime() - a.submittedAt.toDate().getTime();
    } else {
      return a.submittedAt.toDate().getTime() - b.submittedAt.toDate().getTime();
    }
  });

  const formatTimeAgo = (timestamp: any) => {
    const now = new Date();
    const date = timestamp.toDate();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return `${Math.floor(diffInHours / 24)} days ago`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-3 h-3" />;
      case 'approved':
        return <CheckCircle className="w-3 h-3" />;
      case 'rejected':
        return <XCircle className="w-3 h-3" />;
      case 'needs_revision':
        return <AlertCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingState text="Loading submissions..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* AlertDialog for quick approval */}
        <AlertDialog open={!!submissionToQuickApprove} onOpenChange={(open) => !open && setSubmissionToQuickApprove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Quick Approve Submission</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to approve this submission from {submissionToQuickApprove?.studentName}? This will mark the student's project as completed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => submissionToQuickApprove && handleQuickApproval(submissionToQuickApprove.id)}
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={!!processingSubmission}
              >
                {processingSubmission ? 'Approving...' : 'Approve Submission'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* AlertDialog for rejection */}
        <AlertDialog open={!!submissionToReject} onOpenChange={(open) => !open && setSubmissionToReject(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject Submission</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>Are you sure you want to reject this submission from {submissionToReject?.studentName}?</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason (optional)
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={3}
                    placeholder="Explain why this submission is being rejected..."
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => submissionToReject && handleReject(submissionToReject.id, reviewComment)}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={!!processingSubmission}
              >
                {processingSubmission ? 'Rejecting...' : 'Reject Submission'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* AlertDialog for needs revision */}
        <AlertDialog open={!!submissionToNeedsRevision} onOpenChange={(open) => !open && setSubmissionToNeedsRevision(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Request Revision</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>Request revisions for this submission from {submissionToNeedsRevision?.studentName}. The student will need to resubmit their work.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Revision Instructions
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    rows={3}
                    placeholder="Explain what needs to be revised..."
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => submissionToNeedsRevision && handleNeedsRevision(submissionToNeedsRevision.id, reviewComment)}
                className="bg-orange-600 hover:bg-orange-700 text-white"
                disabled={!!processingSubmission}
              >
                {processingSubmission ? 'Processing...' : 'Request Revision'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Submission Reviews</h1>
            <p className="text-gray-600 mt-2">
              Review and provide feedback on student submissions 📝
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {sortedSubmissions.length} submissions
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', count: submissions.length, color: 'blue' },
            { label: 'Pending', count: submissions.filter(s => s.status === 'pending').length, color: 'yellow' },
            { label: 'Approved', count: submissions.filter(s => s.status === 'approved').length, color: 'green' },
            { label: 'Needs Review', count: submissions.filter(s => s.status === 'rejected' || s.status === 'needs_revision').length, color: 'red' }
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold text-${stat.color}-600`}>
                    {stat.count}
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search submissions..."
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
                <option value="all">All Status</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="needs_revision">Needs Revision</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>

              {/* Stats */}
              <div className="flex items-center text-sm text-gray-600">
                <Filter className="w-4 h-4 mr-2" />
                Showing {sortedSubmissions.length} of {submissions.length}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submissions List */}
        {sortedSubmissions.length > 0 ? (
          <div className="space-y-4">
            {sortedSubmissions.map((submission) => (
              <Card key={submission.id} className="card-hover">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar
                        src={generateAvatar(submission.studentId)}
                        alt={submission.studentName || "Student"}
                        size="md"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {submission.studentName || "Anonymous Student"}
                          </h3>
                          <Link 
                            href={`/projects/${submission.projectId}`}
                            className="text-blue-600 hover:text-blue-800 text-sm underline flex items-center"
                          >
                            View Project
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Link>
                        </div>
                        <p className="text-sm text-gray-600 font-medium">{submission.projectTitle}</p>
                        <p className="text-xs text-gray-500 flex items-center mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          Submitted {formatTimeAgo(submission.submittedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${getStatusColor(submission.status)}`}>
                        {getStatusIcon(submission.status)}
                        <span className="ml-1 capitalize">{submission.status.replace('_', ' ')}</span>
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Project Progress Info */}
                  {submission.participationProgress !== undefined && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600 flex items-center">
                          <BarChart3 className="w-4 h-4 mr-1" />
                          Student Progress:
                        </span>
                        <span className="font-medium text-gray-900">{submission.participationProgress}% Complete</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${submission.participationProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Submission Content */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Submission Content</h4>
                    <div className="max-h-40 overflow-y-auto">
                      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {submission.content}
                      </p>
                    </div>
                  </div>

                  {/* GitHub Repository Link */}
                  {submission.githubRepo && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                        <Github className="w-4 h-4 mr-2" />
                        GitHub Repository
                      </h4>
                      <Link 
                        href={submission.githubRepo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-sm flex items-center"
                      >
                        {submission.githubRepo}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Link>
                    </div>
                  )}

                  {/* Previous Review */}
                  {submission.reviewComment && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Previous Review</h4>
                      <p className="text-blue-800 text-sm">{submission.reviewComment}</p>
                      {submission.rating && (
                        <div className="flex items-center mt-2">
                          <span className="text-sm text-blue-700 mr-2">Rating:</span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < submission.rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {submission.status === 'pending' && (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewingSubmission(submission.id)}
                        disabled={processingSubmission === submission.id}
                      >
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Review
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickApprovalIntent(submission)}
                        disabled={processingSubmission === submission.id}
                      >
                        {processingSubmission === submission.id ? (
                          <Clock className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        )}
                        {processingSubmission === submission.id ? 'Processing...' : 'Quick Approve'}
                      </Button>
                    </div>
                  )}

                  {/* Review Form */}
                  {reviewingSubmission === submission.id && (
                    <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                      <h4 className="font-medium text-gray-900 mb-3">Review Submission</h4>
                      
                      {/* Rating */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rating (for approved submissions)
                        </label>
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setReviewRating(star)}
                              className="p-1"
                            >
                              <Star
                                className={`w-6 h-6 ${star <= reviewRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Comment */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Review Comment
                        </label>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                          placeholder="Provide feedback to the student..."
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleReviewSubmission(submission.id, 'approved', reviewRating, reviewComment)}
                          className="bg-green-600 hover:bg-green-700"
                          disabled={processingSubmission === submission.id}
                        >
                          {processingSubmission === submission.id ? (
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          {processingSubmission === submission.id ? 'Processing...' : 'Approve'}
                        </Button>
                        <Button
                          onClick={() => handleNeedsRevisionIntent(submission)}
                          variant="outline"
                          className="border-orange-300 text-orange-700 hover:bg-orange-50"
                          disabled={processingSubmission === submission.id}
                        >
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Needs Revision
                        </Button>
                        <Button
                          onClick={() => handleRejectIntent(submission)}
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-50"
                          disabled={processingSubmission === submission.id}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setReviewingSubmission(null);
                            setReviewComment("");
                            setReviewRating(5);
                          }}
                          disabled={processingSubmission === submission.id}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm || statusFilter !== "all" 
                  ? "No submissions found" 
                  : "No submissions yet"}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search criteria or filters"
                  : "Student submissions will appear here when available"}
              </p>
              {(searchTerm || statusFilter !== "all") && (
                <Button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                  variant="outline"
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
} 