"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { getSubmissions, updateSubmission, updateParticipation } from "@/lib/firestore";
import { Submission } from "@/lib/types";
import { generateAvatar, getStatusColor } from "@/lib/utils";
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
  Download
} from "lucide-react";
import { Timestamp } from "firebase/firestore";

export default function TeacherSubmissionsPage() {
  const { data: session } = useSession();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [reviewingSubmission, setReviewingSubmission] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [processingSubmission, setProcessingSubmission] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    loadSubmissions();
  }, []);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 5000); // 5秒后清除消息
      
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const loadSubmissions = async () => {
    try {
      // Get all submissions using the new function
      const submissionsData = await getSubmissions({});
      setSubmissions(submissionsData);
    } catch (error) {
      console.error("Error loading submissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewSubmission = async (submissionId: string, status: 'approved' | 'rejected' | 'needs_revision', rating?: number, comment?: string) => {
    setProcessingSubmission(submissionId);
    
    try {
      const updateData: any = {
        status,
        reviewComment: comment
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
      setFeedback({ message: "Submission reviewed successfully!", type: 'success' });
    } catch (error) {
      console.error("Error reviewing submission:", error);
      setFeedback({ message: "Error reviewing submission. Please try again.", type: 'error' });
    } finally {
      setProcessingSubmission(null);
    }
  };

  const handleQuickApproval = async (submissionId: string) => {
    setProcessingSubmission(submissionId);
    setFeedback(null);
    
    try {
      const updateData = {
        status: 'approved' as const,
        reviewedBy: session?.user?.id,
        reviewComment: 'Quick approval',
        rating: 5
      };

      await updateSubmission(submissionId, updateData);
      
      // Update local state
      setSubmissions(prev => prev.map(sub => 
        sub.id === submissionId 
          ? { ...sub, ...updateData }
          : sub
      ));
      
      setFeedback({ 
        message: "Submission approved successfully!", 
        type: 'success' 
      });
    } catch (error) {
      console.error("Error approving submission:", error);
      setFeedback({ 
        message: "Failed to approve submission. Please try again.", 
        type: 'error' 
      });
    } finally {
      setProcessingSubmission(null);
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = submission.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (submission.studentName && submission.studentName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && submission.status === statusFilter;
  }).sort((a, b) => {
    if (sortBy === "newest") {
      return b.submittedAt.toDate().getTime() - a.submittedAt.toDate().getTime();
    } else if (sortBy === "oldest") {
      return a.submittedAt.toDate().getTime() - b.submittedAt.toDate().getTime();
    }
    return 0;
  });

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    
    if (hours < 1) return 'Less than 1 hour ago';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    return `${Math.floor(days / 7)} weeks ago`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'needs_revision': return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default: return <FileText className="w-4 h-4 text-gray-600" />;
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
              {filteredSubmissions.length} submissions
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

        {/* Feedback Message */}
        {feedback && (
          <div className={`p-4 rounded-lg border ${
            feedback.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              {feedback.type === 'success' ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-2" />
              )}
              {feedback.message}
            </div>
          </div>
        )}

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
                Showing {filteredSubmissions.length} of {submissions.length}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submissions List */}
        {filteredSubmissions.length > 0 ? (
          <div className="space-y-4">
            {filteredSubmissions.map((submission) => (
              <Card key={submission.id} className="card-hover">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar
                        src={generateAvatar(submission.studentId)}
                        alt="Student"
                        size="md"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Student Submission
                        </h3>
                        <p className="text-sm text-gray-600 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatTimeAgo(submission.submittedAt)}
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
                  {/* Submission Content */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-800 leading-relaxed">
                      {submission.content}
                    </p>
                  </div>

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
                        onClick={() => handleQuickApproval(submission.id)}
                        disabled={processingSubmission === submission.id}
                      >
                        {processingSubmission === submission.id ? (
                          <div className="w-3 h-3 mr-1 loading-spinner" />
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
                            <div className="w-4 h-4 mr-2 loading-spinner" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          {processingSubmission === submission.id ? 'Processing...' : 'Approve'}
                        </Button>
                        <Button
                          onClick={() => handleReviewSubmission(submission.id, 'needs_revision', undefined, reviewComment)}
                          variant="outline"
                          className="border-orange-300 text-orange-700 hover:bg-orange-50"
                          disabled={processingSubmission === submission.id}
                        >
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Needs Revision
                        </Button>
                        <Button
                          onClick={() => handleReviewSubmission(submission.id, 'rejected', undefined, reviewComment)}
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
                            setFeedback(null);
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