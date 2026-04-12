"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { getCertificates } from "@/lib/firestore";
import { Certificate } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { 
  Award,
  Download,
  Eye,
  Calendar,
  School,
  FileText,
  Loader2,
  GraduationCap
} from "lucide-react";

function StudentCertificatesPageContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const focusedProjectId = searchParams.get("projectId");
  
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);
  const [previewingCertId, setPreviewingCertId] = useState<string | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      loadCertificates();
    }
  }, [session]);

  const loadCertificates = async () => {
    try {
      const data = await getCertificates({ studentId: session!.user!.id });
      setCertificates(data);
    } catch (error) {
      console.error("Error loading certificates:", error);
      toast({ 
        title: "Loading Error", 
        description: "Failed to load certificates", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewCertificate = async (certificate: Certificate) => {
    setPreviewingCertId(certificate.id);
    setShowPreviewDialog(true);
    
    try {
      const response = await fetch('/api/certificates/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ certificateId: certificate.id })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPreviewPdfUrl(url);
      } else {
        throw new Error('Failed to generate preview');
      }
    } catch (error) {
      console.error("Error generating preview:", error);
      toast({ 
        title: "Preview Error", 
        description: "Failed to generate certificate preview", 
        variant: "destructive" 
      });
    } finally {
      setPreviewingCertId(null);
    }
  };

  const handleDownloadCertificate = async (certificate: Certificate) => {
    setDownloadingCertId(certificate.id);
    
    try {
      const response = await fetch('/api/certificates/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ certificateId: certificate.id })
      });

      if (!response.ok) {
        throw new Error(`Certificate generation failed: ${response.status}`);
      }

      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `certificate_${certificate.projectTitle.replace(/\s+/g, '_')}_${certificate.certificateNumber}.pdf`;
      link.click();

      URL.revokeObjectURL(link.href);

      toast({ 
        title: "Certificate Downloaded", 
        description: "Your certificate has been downloaded successfully!", 
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
      setDownloadingCertId(null);
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

  const handleClosePreview = () => {
    setShowPreviewDialog(false);
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(null);
    }
  };

  const orderedCertificates = useMemo(() => {
    if (!focusedProjectId) {
      return certificates;
    }

    return [...certificates].sort((left, right) => {
      if (left.projectId === focusedProjectId && right.projectId !== focusedProjectId) {
        return -1;
      }

      if (right.projectId === focusedProjectId && left.projectId !== focusedProjectId) {
        return 1;
      }

      return right.issuedAt.toMillis() - left.issuedAt.toMillis();
    });
  }, [certificates, focusedProjectId]);

  useEffect(() => {
    if (!focusedProjectId || isLoading) {
      return;
    }

    window.requestAnimationFrame(() => {
      document
        .getElementById(`certificate-${focusedProjectId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [focusedProjectId, isLoading, orderedCertificates]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading your certificates...</span>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Certificate Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={handleClosePreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Certificate Preview</DialogTitle>
            </DialogHeader>
            
            {previewPdfUrl ? (
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  src={previewPdfUrl}
                  className="w-full h-96"
                  title="Certificate Preview"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading preview...</span>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClosePreview}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Certificates</h1>
            <p className="text-gray-600 mt-2">
              View and download your earned certificates 🏆
            </p>
          </div>
        </div>

        {/* Stats Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Award className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{certificates.length}</p>
                <p className="text-sm text-gray-600">Total Certificates Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certificates List */}
        {orderedCertificates.length > 0 ? (
          <div className="space-y-4">
            {orderedCertificates.map((certificate) => {
              const isFocused = certificate.projectId === focusedProjectId;

              return (
              <Card
                key={certificate.id}
                id={`certificate-${certificate.projectId}`}
                className={`overflow-hidden transition-all ${isFocused ? "border-blue-400 ring-2 ring-blue-200 shadow-lg" : ""}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-yellow-100 rounded-full">
                        <GraduationCap className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {certificate.projectTitle}
                        </h3>
                        <p className="text-gray-600">Issued by {certificate.ngoName}</p>
                        <p className="text-sm text-gray-500 flex items-center mt-1">
                          <Calendar className="w-4 h-4 mr-1" />
                          Completed on {formatDate(certificate.completionDate)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Award className="w-3 h-3 mr-1 inline" />
                        Certified
                      </span>
                      {isFocused && (
                        <p className="text-xs font-medium text-blue-600 mt-2">
                          Opened from My Projects
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Certificate #{certificate.certificateNumber}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Certificate Info */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Certificate Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Student Name:</span>
                        <p className="font-medium">{certificate.studentName}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Issuing Organization:</span>
                        <p className="font-medium">{certificate.ngoName}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Project Completed:</span>
                        <p className="font-medium">{certificate.projectTitle}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Issue Date:</span>
                        <p className="font-medium">{formatDate(certificate.issuedAt)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <Button
                      onClick={() => handlePreviewCertificate(certificate)}
                      disabled={previewingCertId === certificate.id}
                      variant="outline"
                      className="flex-1"
                    >
                      {previewingCertId === certificate.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading Preview...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Preview Certificate
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={() => handleDownloadCertificate(certificate)}
                      disabled={downloadingCertId === certificate.id}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {downloadingCertId === certificate.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )})}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Certificates Yet
              </h3>
              <p className="text-gray-600 mb-6">
                Complete projects and earn certificates issued by partner NGOs.
              </p>
              <Button onClick={() => window.location.href = '/student/projects'}>
                <School className="w-4 h-4 mr-2" />
                Browse Projects
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

export default function StudentCertificatesPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading your certificates...</span>
          </div>
        </MainLayout>
      }
    >
      <StudentCertificatesPageContent />
    </Suspense>
  );
}
