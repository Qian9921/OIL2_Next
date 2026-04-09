import { NGODashboard, Participation, Project, ProjectStats, Submission, TeacherDashboard } from "./types";

type TimestampLike = {
  toMillis(): number;
};

type DashboardProject = Pick<Project, "id" | "title" | "status" | "currentParticipants">;
type DashboardParticipation = Pick<Participation, "projectId" | "studentId" | "status" | "progress">;
type DashboardSubmission = Pick<Submission, "projectId" | "status">;

type TeacherProject = Pick<Project, "id">;
type TeacherParticipation = Pick<Participation, "projectId" | "studentId">;
type SubmissionWithTimestamp = Submission & {
  submittedAt: TimestampLike;
};

export function sortSubmissionsNewestFirst<T extends { submittedAt: TimestampLike }>(submissions: T[]): T[] {
  return [...submissions].sort((left, right) => right.submittedAt.toMillis() - left.submittedAt.toMillis());
}

export function buildNGODashboardData(input: {
  projects: DashboardProject[];
  participations: DashboardParticipation[];
  submissions: DashboardSubmission[];
}): NGODashboard {
  const projectIds = new Set(input.projects.map((project) => project.id));

  const projectStats: ProjectStats[] = input.projects.map((project) => {
    const projectParticipations = input.participations.filter(
      (participation) => participation.projectId === project.id
    );
    const completedCount = projectParticipations.filter(
      (participation) => participation.status === "completed"
    ).length;

    return {
      projectId: project.id,
      projectTitle: project.title,
      participants: project.currentParticipants,
      completionRate:
        projectParticipations.length > 0 ? (completedCount / projectParticipations.length) * 100 : 0,
      averageProgress:
        projectParticipations.length > 0
          ? projectParticipations.reduce((sum, participation) => sum + participation.progress, 0) /
            projectParticipations.length
          : 0,
    };
  });

  return {
    publishedProjects: input.projects.filter((project) => project.status === "published").length,
    totalParticipants: input.projects.reduce(
      (sum, project) => sum + project.currentParticipants,
      0
    ),
    completedProjects: input.projects.filter((project) => project.status === "completed").length,
    pendingReviews: input.submissions.filter(
      (submission) => submission.status === "pending" && projectIds.has(submission.projectId)
    ).length,
    projectStats,
  };
}

export function buildTeacherDashboardData(input: {
  projects: TeacherProject[];
  participations: TeacherParticipation[];
  submissions: SubmissionWithTimestamp[];
}): TeacherDashboard {
  return {
    studentsSupervised: new Set(input.participations.map((participation) => participation.studentId)).size,
    projectsSupervised: input.projects.length,
    pendingReviews: input.submissions.filter((submission) => submission.status === "pending").length,
    recentSubmissions: sortSubmissionsNewestFirst(input.submissions).slice(0, 10),
  };
}
