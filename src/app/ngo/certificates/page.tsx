"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { getCompletedProjectsForNGO, getUser, createCertificate } from "@/lib/firestore";
import { generateAvatar } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { 
  Award,
  Star,
  Download,
  CheckCircle,
  Clock,
  FileText,
  AlertTriangle,
  Loader2,
  Eye,
  Send
} from "lucide-react";

interface CompletedProject {
  participation: any;
  project: any;
  student: any;
  submission: any;
  hasCertificate: boolean;
  certificate: any;
}

interface CertificatePreview {
  studentName: string;
  ngoSignature: string;
  ngoName: string;
  contents: string;
  date: string;
}

export default function NGOCertificatesPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [completedProjects, setCompletedProjects] = useState<CompletedProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingCertificate, setGeneratingCertificate] = useState<string | null>(null);
  const [ngoSignature, setNgoSignature] = useState("");
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<CompletedProject | null>(null);
  const [certificatePreview, setCertificatePreview] = useState<CertificatePreview | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    try {
      // Load completed projects
      const data = await getCompletedProjectsForNGO(session!.user!.id);
      setCompletedProjects(data);
      
      // Load NGO signature from profile
      const ngoUser = await getUser(session!.user!.id);
      if (ngoUser?.profile?.signature) {
        setNgoSignature(ngoUser.profile.signature);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ 
        title: "Loading Error", 
        description: "Failed to load certificate data", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewCertificate = async (completedProject: CompletedProject) => {
    if (!ngoSignature.trim()) {
      toast({
        title: "Signature Required",
        description: "Please set your signature in your profile before generating certificates",
        variant: "destructive"
      });
      return;
    }

    setSelectedProject(completedProject);
    
    // Format completion date
    const completionDate = completedProject.participation.completedAt?.toDate 
      ? completedProject.participation.completedAt.toDate() 
      : new Date(completedProject.participation.completedAt);
    
    const formattedDate = completionDate.toISOString().split('T')[0];

    const preview: CertificatePreview = {
      studentName: completedProject.student.name,
      ngoSignature: ngoSignature,
      ngoName: session!.user!.name || 'NGO',
      contents: completedProject.project.title,
      date: formattedDate
    };

    setCertificatePreview(preview);
    setShowPreviewDialog(true);

    try {
      // Generate preview PDF
      const response = await fetch('/api/certificates/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preview)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPreviewPdfUrl(url);
      }
    } catch (error) {
      console.error("Error generating preview:", error);
    }
  };

  const handleConfirmAward = () => {
    setShowPreviewDialog(false);
    setShowConfirmDialog(true);
  };

  const handleAwardCertificate = async () => {
    if (!selectedProject || !certificatePreview) return;

    setGeneratingCertificate(selectedProject.participation.id);
    setShowConfirmDialog(false);
    
    try {
      // Create certificate record in database
      const certificateResult = await createCertificate({
        studentId: selectedProject.student.id,
        studentName: selectedProject.student.name,
        ngoId: session!.user!.id,
        ngoName: session!.user!.name || 'NGO',
        ngoSignature: ngoSignature,
        projectId: selectedProject.project.id,
        projectTitle: selectedProject.project.title,
        participationId: selectedProject.participation.id,
        completionDate: selectedProject.participation.completedAt
      });

      // Reload data to reflect the new certificate
      await loadData();

      toast({ 
        title: "Certificate Awarded!", 
        description: `Certificate ${certificateResult.certificateNumber} has been awarded to ${selectedProject.student.name}. They can now view and download it from their dashboard.`, 
        variant: "default" 
      });

    } catch (error) {
      console.error("Error awarding certificate:", error);
      toast({ 
        title: "Award Failed", 
        description: "Failed to award certificate. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setGeneratingCertificate(null);
      setSelectedProject(null);
      setCertificatePreview(null);
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
        setPreviewPdfUrl(null);
      }
    }
  };

  const handleDownloadCertificate = async (completedProject: CompletedProject) => {
    if (!completedProject.certificate) return;

    setGeneratingCertificate(completedProject.participation.id);
    
    try {
      // Format completion date
      const completionDate = completedProject.participation.completedAt?.toDate 
        ? completedProject.participation.completedAt.toDate() 
        : new Date(completedProject.participation.completedAt);
      
      const formattedDate = completionDate.toISOString().split('T')[0];

      const certificateData = {
        studentName: completedProject.student.name,
        ngoSignature: ngoSignature,
        ngoName: session!.user!.name || 'NGO',
        contents: completedProject.project.title,
        date: formattedDate
      };

      // Call the certificate generation API
      const response = await fetch('/api/certificates/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(certificateData)
      });

      if (!response.ok) {
        throw new Error(`Certificate generation failed: ${response.status}`);
      }

      // Handle the PDF blob response
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `certificate_${completedProject.student.name.replace(/\s+/g, '_')}_${completedProject.project.title.replace(/\s+/g, '_')}.pdf`;
      link.click();

      // Clean up the URL object
      URL.revokeObjectURL(link.href);

      toast({ 
        title: "Certificate Downloaded", 
        description: "Certificate has been downloaded successfully!", 
        variant: "default" 
      });

    } catch (error) {
      console.error("Error downloading certificate:", error);
      toast({ 
        title: "Download Failed", 
        description: "Failed to download certificate. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setGeneratingCertificate(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getStats = () => {
    const totalCompleted = completedProjects.length;
    const certificatesGenerated = completedProjects.filter(p => p.hasCertificate).length;
    const pendingCertificates = totalCompleted - certificatesGenerated;
    
    return { totalCompleted, certificatesGenerated, pendingCertificates };
  };

  const stats = getStats();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading certificate data...</span>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Certificate Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Certificate Preview</DialogTitle>
              <DialogDescription>
                Preview the certificate before awarding it to {selectedProject?.student.name}
              </DialogDescription>
            </DialogHeader>
            
            {certificatePreview && (
              <div className="space-y-4">
                {/* Certificate Details */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Student Name</label>
                    <p className="text-gray-900">{certificatePreview.studentName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Project Title</label>
                    <p className="text-gray-900">{certificatePreview.contents}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Completion Date</label>
                    <p className="text-gray-900">{new Date(certificatePreview.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Your Signature</label>
                    <p className="text-gray-900">{certificatePreview.ngoSignature}</p>
                  </div>
                </div>

                {/* PDF Preview */}
                {previewPdfUrl && (
                  <div className="border rounded-lg overflow-hidden">
                    <iframe
                      src={previewPdfUrl}
                      className="w-full h-96"
                      title="Certificate Preview"
                    />
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmAward} className="bg-green-600 hover:bg-green-700">
                <Send className="w-4 h-4 mr-2" />
                Award Certificate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Award Certificate</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to award this certificate to {selectedProject?.student.name}? 
                Once awarded, they will be able to view and download it from their dashboard.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleAwardCertificate}
                className="bg-green-600 hover:bg-green-700"
              >
                Award Certificate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Certificate Management</h1>
            <p className="text-gray-600 mt-2">
              Award and manage certificates for students who completed your projects 🏆
            </p>
          </div>
        </div>

        {/* Signature Warning */}
        {!ngoSignature && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
                <div>
                  <h4 className="font-medium text-orange-900">Signature Required</h4>
                  <p className="text-sm text-orange-700">
                    Please set your signature in your profile to generate certificates.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-auto"
                  onClick={() => window.open('/ngo/profile', '_blank')}
                >
                  Go to Profile
                </Button>
              </div>
            </CardContent>
          </Card>
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
                  <p className="text-2xl font-bold text-gray-900">{stats.certificatesGenerated}</p>
                  <p className="text-sm text-gray-600">Certificates Awarded</p>
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
                  <p className="text-sm text-gray-600">Ready for Award</p>
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
                        {completedProject.certificate && (
                          <p className="text-xs text-green-600 font-medium">
                            Certificate: {completedProject.certificate.certificateNumber}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {completedProject.hasCertificate ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Award className="w-3 h-3 mr-1 inline" />
                          Certificate Awarded
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <Clock className="w-3 h-3 mr-1 inline" />
                          Ready for Award
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
                        <span className="text-sm text-gray-600 mr-2">Review Rating:</span>
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

                  {/* Certificate Actions */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900">
                          {completedProject.hasCertificate ? 'Certificate Management' : 'Award Certificate'}
                        </h4>
                        <p className="text-sm text-blue-700">
                          {completedProject.hasCertificate 
                            ? 'Download the awarded certificate'
                            : 'Preview and award a certificate for this student'
                          }
                        </p>
                        {ngoSignature && (
                          <p className="text-xs text-blue-600 mt-1">
                            Signature: {ngoSignature}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {completedProject.hasCertificate ? (
                          <Button
                            onClick={() => handleDownloadCertificate(completedProject)}
                            disabled={generatingCertificate === completedProject.participation.id}
                            variant="outline"
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                          >
                            {generatingCertificate === completedProject.participation.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handlePreviewCertificate(completedProject)}
                            disabled={generatingCertificate === completedProject.participation.id || !ngoSignature}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {generatingCertificate === completedProject.participation.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-2" />
                                Preview & Award
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
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
                Students who complete your projects and meet the completion criteria will appear here for certificate awarding.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
} 
