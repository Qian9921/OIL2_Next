"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Confetti from "react-confetti";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  LucideIcon,
} from "lucide-react";

import { MainLayout } from "@/components/layout/main-layout";
import { SubmitProjectDialog } from "@/components/project/submit-project-dialog";
import { StudentProjectActionCard } from "@/components/student/student-project-action-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { useToast } from "@/hooks/use-toast";
import { useWindowSize } from "@/hooks/use-window-size";
import {
  buildStudentProjectActionState,
  groupStudentProjectActionItems,
  StudentProjectActionState,
  StudentProjectSectionKey,
} from "@/lib/student-project-actions";
import {
  deleteParticipation,
  handleRejectedProject,
} from "@/lib/firestore";
import { fromIsoTimestamp } from "@/lib/timestamp-serialization";
import { Certificate, Participation, Project, Submission, Subtask } from "@/lib/types";
import { isProjectExpired } from "@/lib/utils";

interface LoadedProjectWithDetails extends Participation {
  project: Project;
  submission?: Submission;
  nextSubtask?: Subtask;
}

interface StudentMyProjectsResponse {
  projects: Array<
    Omit<LoadedProjectWithDetails, "joinedAt" | "createdAt" | "updatedAt" | "completedAt" | "project" | "submission"> & {
      joinedAt: string;
      createdAt: string;
      updatedAt: string;
      completedAt?: string | null;
      project: Omit<Project, "createdAt" | "updatedAt" | "deadline"> & {
        createdAt: string;
        updatedAt: string;
        deadline?: string | null;
      };
      submission?: (Omit<Submission, "submittedAt" | "reviewedAt"> & {
        submittedAt: string;
        reviewedAt?: string | null;
      }) | null;
    }
  >;
  certificates: Array<
    Omit<Certificate, "issuedAt" | "completionDate"> & {
      issuedAt: string;
      completionDate: string;
    }
  >;
}

type SerializedProjectRecord = StudentMyProjectsResponse["projects"][number];
type SerializedCertificateRecord = StudentMyProjectsResponse["certificates"][number];

interface StudentProjectActionItem extends LoadedProjectWithDetails {
  certificate?: Certificate | null;
  actionState: StudentProjectActionState;
  completedTaskCount: number;
  totalTaskCount: number;
  isFocused: boolean;
  cardId: string;
}

const SECTION_META: Record<
  StudentProjectSectionKey,
  {
    title: string;
    description: string;
  }
> = {
  needs_attention: {
    title: "Needs Your Attention",
    description: "Things blocking progress or waiting for your decision.",
  },
  continue_learning: {
    title: "Continue Learning",
    description: "Projects you can still move forward right now.",
  },
  waiting_review: {
    title: "Waiting on Review",
    description: "Submitted work that is currently in the NGO review queue.",
  },
  completed: {
    title: "Completed",
    description: "Approved projects, finished work, and certificates.",
  },
};

const SUMMARY_META: Array<{
  key: StudentProjectSectionKey;
  label: string;
  icon: LucideIcon;
  colorClass: string;
}> = [
  {
    key: "needs_attention",
    label: "Needs Action",
    icon: AlertCircle,
    colorClass: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    key: "continue_learning",
    label: "In Progress",
    icon: ArrowRight,
    colorClass: "text-blue-700 bg-blue-50 border-blue-200",
  },
  {
    key: "waiting_review",
    label: "Waiting Review",
    icon: Clock3,
    colorClass: "text-purple-700 bg-purple-50 border-purple-200",
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle2,
    colorClass: "text-green-700 bg-green-50 border-green-200",
  },
];

function deserializeSubmission(
  submission: SerializedProjectRecord["submission"],
): Submission | undefined {
  if (!submission) {
    return undefined;
  }

  const {
    submittedAt,
    reviewedAt,
    ...submissionFields
  } = submission;

  return {
    ...submissionFields,
    submittedAt: fromIsoTimestamp(submittedAt)!,
    ...(reviewedAt ? { reviewedAt: fromIsoTimestamp(reviewedAt)! } : {}),
  };
}

function deserializeProjectRecord(projectRecord: SerializedProjectRecord): LoadedProjectWithDetails {
  const {
    joinedAt,
    createdAt,
    updatedAt,
    completedAt,
    project,
    submission,
    ...participationFields
  } = projectRecord;
  const {
    createdAt: projectCreatedAt,
    updatedAt: projectUpdatedAt,
    deadline,
    ...projectFields
  } = project;

  return {
    ...participationFields,
    joinedAt: fromIsoTimestamp(joinedAt)!,
    createdAt: fromIsoTimestamp(createdAt)!,
    updatedAt: fromIsoTimestamp(updatedAt)!,
    ...(completedAt ? { completedAt: fromIsoTimestamp(completedAt)! } : {}),
    project: {
      ...projectFields,
      createdAt: fromIsoTimestamp(projectCreatedAt)!,
      updatedAt: fromIsoTimestamp(projectUpdatedAt)!,
      deadline: fromIsoTimestamp(deadline ?? projectUpdatedAt)!,
    },
    submission: deserializeSubmission(submission),
  };
}

function deserializeCertificateRecord(
  certificate: SerializedCertificateRecord,
): Certificate {
  return {
    ...certificate,
    issuedAt: fromIsoTimestamp(certificate.issuedAt)!,
    completionDate: fromIsoTimestamp(certificate.completionDate)!,
  };
}

function StudentMyProjectsPageContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { width, height } = useWindowSize();
  const focusedProjectId = searchParams.get("projectId");

  const [projectsWithDetails, setProjectsWithDetails] = useState<LoadedProjectWithDetails[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [leavingProject, setLeavingProject] = useState<string | null>(null);
  const [selectedProjectToLeave, setSelectedProjectToLeave] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [selectedRejectedProject, setSelectedRejectedProject] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [projectToSubmit, setProjectToSubmit] = useState<StudentProjectActionItem | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      void loadMyProjects();
    }
  }, [session?.user?.id]);

  const loadMyProjects = async () => {
    setIsLoading(true);

    try {
      const data = await fetch("/api/student/my-projects", {
        cache: "no-store",
      });

      if (!data.ok) {
        throw new Error(`Failed to load my projects: ${data.status}`);
      }

      const payload = (await data.json()) as StudentMyProjectsResponse;

      setProjectsWithDetails(payload.projects.map(deserializeProjectRecord));
      setCertificates(payload.certificates.map(deserializeCertificateRecord));
    } catch (error) {
      console.error("Error loading my projects:", error);
      toast({
        title: "Error",
        description: "Failed to load your projects. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const actionItems = useMemo<StudentProjectActionItem[]>(() => {
    const certificateLookup = new Map(
      certificates.map((certificate) => [certificate.participationId, certificate])
    );

    return projectsWithDetails.map((projectWithDetails) => {
      const certificate =
        certificateLookup.get(projectWithDetails.id) ??
        certificates.find((item) => item.projectId === projectWithDetails.projectId) ??
        null;
      const completedTaskCount = projectWithDetails.completedSubtasks?.length ?? 0;
      const totalTaskCount = projectWithDetails.project.subtasks.length;

      return {
        ...projectWithDetails,
        certificate,
        completedTaskCount,
        totalTaskCount,
        actionState: buildStudentProjectActionState({
          participation: projectWithDetails,
          project: projectWithDetails.project,
          submission: projectWithDetails.submission,
          certificate,
          nextSubtask: projectWithDetails.nextSubtask,
          isExpired: isProjectExpired(projectWithDetails.project.deadline),
          totalTaskCount,
          completedTaskCount,
        }),
        isFocused: focusedProjectId === projectWithDetails.projectId,
        cardId: `student-project-${projectWithDetails.projectId}`,
      };
    });
  }, [certificates, focusedProjectId, projectsWithDetails]);

  const sectionedProjects = useMemo(
    () => groupStudentProjectActionItems(actionItems),
    [actionItems]
  );

  const summaryCounts = useMemo(
    () =>
      Object.fromEntries(
        sectionedProjects.map((section) => [section.key, section.items.length])
      ) as Record<StudentProjectSectionKey, number>,
    [sectionedProjects]
  );

  const nextUpProject = useMemo(() => {
    const preferredSections: StudentProjectSectionKey[] = [
      "needs_attention",
      "continue_learning",
      "waiting_review",
      "completed",
    ];

    for (const sectionKey of preferredSections) {
      const section = sectionedProjects.find((item) => item.key === sectionKey);
      if (section?.items.length) {
        return section.items[0];
      }
    }

    return null;
  }, [sectionedProjects]);

  useEffect(() => {
    if (!focusedProjectId || isLoading) {
      return;
    }

    window.requestAnimationFrame(() => {
      document
        .getElementById(`student-project-${focusedProjectId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [focusedProjectId, isLoading, sectionedProjects]);

  const openSubmitDialog = (projectItem: StudentProjectActionItem) => {
    setProjectToSubmit(projectItem);
  };

  const confirmAndLeaveProject = (participationId: string, projectTitle: string) => {
    setSelectedProjectToLeave({ id: participationId, title: projectTitle });
  };

  const handleLeaveProjectAction = async (participationId: string) => {
    setLeavingProject(participationId);

    try {
      await deleteParticipation(participationId);

      if (session?.user?.id) {
        await loadMyProjects();
      }

      toast({
        title: "Project Left",
        description: "You have successfully left the project.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error leaving project:", error);
      toast({
        title: "Error",
        description: "Failed to leave project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLeavingProject(null);
      setSelectedProjectToLeave(null);
    }
  };

  const confirmRejectedProjectExit = (participationId: string, projectTitle: string) => {
    setSelectedRejectedProject({ id: participationId, title: projectTitle });
  };

  const handleRejectedProjectExitAction = async (participationId: string) => {
    setLeavingProject(participationId);

    try {
      await handleRejectedProject(participationId);

      if (session?.user?.id) {
        await loadMyProjects();
      }

      toast({
        title: "Removed from Project",
        description: "This project has been removed from your active queue.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error handling rejected project:", error);
      toast({
        title: "Error",
        description: "Failed to remove this project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLeavingProject(null);
      setSelectedRejectedProject(null);
    }
  };

  const handlePrimaryAction = (projectItem: StudentProjectActionItem) => {
    switch (projectItem.actionState.primaryActionKind) {
      case "continue":
        router.push(projectItem.actionState.primaryActionTarget);
        return;
      case "submit":
      case "resubmit":
        openSubmitDialog(projectItem);
        return;
      case "view_certificate":
        router.push(`/student/certificates?projectId=${projectItem.projectId}`);
        return;
      case "accept_exit":
        confirmRejectedProjectExit(projectItem.id, projectItem.project.title);
        return;
      case "browse_more":
        router.push("/student/projects");
        return;
    }
  };

  const shouldOfferLeaveAction = (projectItem: StudentProjectActionItem) => {
    return projectItem.status === "active";
  };

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingState text="Loading your action queue..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {showConfetti && (
          <Confetti width={width} height={height} recycle={false} numberOfPieces={600} gravity={0.15} />
        )}

        <AlertDialog
          open={!!selectedProjectToLeave}
          onOpenChange={(open) => !open && setSelectedProjectToLeave(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to leave "{selectedProjectToLeave?.title}"? Your current
                progress on this project will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  selectedProjectToLeave && handleLeaveProjectAction(selectedProjectToLeave.id)
                }
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {leavingProject ? "Leaving..." : "Leave Project"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={!!selectedRejectedProject}
          onOpenChange={(open) => !open && setSelectedRejectedProject(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Accept Rejection and Leave</AlertDialogTitle>
              <AlertDialogDescription>
                Your submission for "{selectedRejectedProject?.title}" was rejected. You can clear
                it from your queue once you've reviewed the feedback.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  selectedRejectedProject &&
                  handleRejectedProjectExitAction(selectedRejectedProject.id)
                }
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {leavingProject ? "Removing..." : "Accept and Leave"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <SubmitProjectDialog
          project={projectToSubmit?.project ?? null}
          participation={projectToSubmit ?? null}
          showDialog={!!projectToSubmit}
          setShowDialog={(show) => !show && setProjectToSubmit(null)}
          hideFloatingButton
          onSuccess={() => {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 4500);

            toast({
              title: "Project Submitted",
              description: "Your project is now in the review queue. Check My Projects for updates.",
              variant: "default",
            });

            if (session?.user?.id) {
              void loadMyProjects();
            }
          }}
        />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
            <p className="text-gray-600 mt-2">
              Your action queue for ongoing work, review updates, and finished projects.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/student/certificates">
              <Button variant="outline">
                <Award className="w-4 h-4 mr-2" />
                My Certificates ({certificates.length})
              </Button>
            </Link>
            <Link href="/student/projects">
              <Button>
                <BookOpen className="w-4 h-4 mr-2" />
                Browse More Projects
              </Button>
            </Link>
          </div>
        </div>

        {nextUpProject && (
          <Card className="border-purple-200 bg-purple-50/80">
            <CardContent className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-purple-700">Current Focus</p>
                <h2 className="text-xl font-semibold text-gray-900">{nextUpProject.project.title}</h2>
                <p className="text-sm text-gray-700">{nextUpProject.actionState.headline}</p>
              </div>
              <Button onClick={() => handlePrimaryAction(nextUpProject)} className="bg-purple-600 hover:bg-purple-700 text-white">
                <ArrowRight className="w-4 h-4 mr-2" />
                {nextUpProject.actionState.primaryActionLabel}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SUMMARY_META.map((summaryItem) => {
            const Icon = summaryItem.icon;
            return (
              <Card key={summaryItem.key} className={`border ${summaryItem.colorClass}`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{summaryItem.label}</p>
                      <p className="text-3xl font-bold mt-1">{summaryCounts[summaryItem.key] ?? 0}</p>
                    </div>
                    <div className="rounded-full bg-white/80 p-3">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {actionItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">No projects yet</h3>
            <p className="text-gray-600 mt-2 mb-6">
              Join a project to start building your action queue here.
            </p>
            <Link href="/student/projects">
              <Button>
                <BookOpen className="w-4 h-4 mr-2" />
                Browse Projects
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {sectionedProjects.map((section) => {
              if (section.items.length === 0) {
                return null;
              }

              return (
                <section key={section.key} className="space-y-4">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {SECTION_META[section.key].title}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {SECTION_META[section.key].description}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      {section.items.length} project{section.items.length > 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {section.items.map((projectItem) => (
                      <StudentProjectActionCard
                        key={projectItem.id}
                        cardId={projectItem.cardId}
                        project={projectItem.project}
                        actionState={projectItem.actionState}
                        submission={projectItem.submission}
                        progress={projectItem.progress}
                        completedTaskCount={projectItem.completedTaskCount}
                        totalTaskCount={projectItem.totalTaskCount}
                        nextSubtask={projectItem.nextSubtask}
                        reviewComment={projectItem.submission?.reviewComment}
                        isFocused={projectItem.isFocused}
                        isPrimaryActionBusy={leavingProject === projectItem.id}
                        secondaryActionLabel={
                          shouldOfferLeaveAction(projectItem) ? "Leave Project" : undefined
                        }
                        onSecondaryAction={
                          shouldOfferLeaveAction(projectItem)
                            ? () => confirmAndLeaveProject(projectItem.id, projectItem.project.title)
                            : undefined
                        }
                        onPrimaryAction={() => handlePrimaryAction(projectItem)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default function StudentMyProjectsPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <LoadingState text="Loading your action queue..." />
        </MainLayout>
      }
    >
      <StudentMyProjectsPageContent />
    </Suspense>
  );
}
