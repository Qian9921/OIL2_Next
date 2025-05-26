"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { getCompletedProjectsForNGO, createCertificate } from "@/lib/firestore";
import { generateAvatar } from "@/lib/utils";
import { 
  Award,
  Star,
  Download,
  Send,
  CheckCircle,
  Clock,
  FileText
} from "lucide-react";

interface CompletedProject {
  participation: any;
  project: any;
  student: any;
  submission: any;
  hasCertificate: boolean;
  certificate: any;
}

export default function NGOCertificatesPage() {
  const { data: session } = useSession();
  const [completedProjects, setCompletedProjects] = useState<CompletedProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [issuingCertificate, setIssuingCertificate] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      loadCompletedProjects();
    }
  }, [session]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const loadCompletedProjects = async () => {
    try {
      const data = await getCompletedProjectsForNGO(session!.user!.id);
      setCompletedProjects(data);
    } catch (error) {
      console.error("Error loading completed projects:", error);
      setFeedback({ message: "Error loading completed projects", type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleIssueCertificate = async (completedProject: CompletedProject) => {
    setIssuingCertificate(completedProject.participation.id);
    
    try {
      await createCertificate({
        studentId: completedProject.student.id,
        studentName: completedProject.student.name,
        projectId: completedProject.project.id,
        projectTitle: completedProject.project.title,
        ngoId: session!.user!.id,
        ngoName: session!.user!.name || 'NGO',
        participationId: completedProject.participation.id,
        completionDate: completedProject.participation.completedAt,
        rating: completedProject.submission.rating
      });

      await loadCompletedProjects();
      setFeedback({ message: "Certificate issued successfully!", type: 'success' });
    } catch (error) {
      console.error("Error issuing certificate:", error);
      setFeedback({ message: "Error issuing certificate. Please try again.", type: 'error' });
    } finally {
      setIssuingCertificate(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getStats = () => {
    const totalCompleted = completedProjects.length;
    const certificatesIssued = completedProjects.filter(p => p.hasCertificate).length;
    const pendingCertificates = totalCompleted - certificatesIssued;
    
    return { totalCompleted, certificatesIssued, pendingCertificates };
  };

  const stats = getStats();

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
            <h1 className="text-3xl font-bold text-gray-900">Certificate Management</h1>
            <p className="text-gray-600 mt-2">
              Issue certificates to students who completed your projects 🏆
            </p>
          </div>
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
                <Clock className="w-5 h-5 mr-2" />
              )}
              {feedback.message}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCompleted}</p>
                  <p className="text-sm text-gray-600">Completed Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.certificatesIssued}</p>
                  <p className="text-sm text-gray-600">Certificates Issued</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-orange-100 rounded-full">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingCertificates}</p>
                  <p className="text-sm text-gray-600">Pending Certificates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Completed Projects List */}
        {completedProjects.length > 0 ? (
          <div className="space-y-4">
            {completedProjects.map((completedProject) => (
              <Card key={completedProject.participation.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar
                        src={generateAvatar(completedProject.student.id)}
                        alt={completedProject.student.name}
                        size="md"
                      />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {completedProject.student.name}
                        </h3>
                        <p className="text-gray-600">{completedProject.project.title}</p>
                        <p className="text-sm text-gray-500">
                          Completed on {formatDate(completedProject.participation.completedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {completedProject.hasCertificate ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Award className="w-3 h-3 mr-1 inline" />
                          Certificate Issued
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <Clock className="w-3 h-3 mr-1 inline" />
                          Pending Certificate
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Submission Info */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Final Submission
                    </h4>
                    <p className="text-sm text-gray-700 mb-3">
                      {completedProject.submission.content}
                    </p>
                    {completedProject.submission.rating && (
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600 mr-2">Teacher Rating:</span>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < completedProject.submission.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                            />
                          ))}
                          <span className="text-sm text-gray-600 ml-2">
                            ({completedProject.submission.rating}/5)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Certificate Info or Action */}
                  {completedProject.hasCertificate ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-green-900">Certificate Issued</h4>
                          <p className="text-sm text-green-700">
                            Certificate #{completedProject.certificate.certificateNumber}
                          </p>
                          <p className="text-xs text-green-600">
                            Issued on {formatDate(completedProject.certificate.issuedAt)}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-blue-900">Ready for Certificate</h4>
                          <p className="text-sm text-blue-700">
                            This student has successfully completed the project and received teacher approval.
                          </p>
                        </div>
                        <Button
                          onClick={() => handleIssueCertificate(completedProject)}
                          disabled={issuingCertificate === completedProject.participation.id}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {issuingCertificate === completedProject.participation.id ? (
                            <div className="w-4 h-4 mr-2 loading-spinner" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          {issuingCertificate === completedProject.participation.id ? 'Issuing...' : 'Issue Certificate'}
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
              <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Completed Projects Yet
              </h3>
              <p className="text-gray-600 mb-6">
                Students who complete your projects and receive teacher approval will appear here for certificate issuance.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
} 