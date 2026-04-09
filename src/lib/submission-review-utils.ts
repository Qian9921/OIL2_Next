import { Certificate, Participation, Project, Submission, User } from "./types";

type TimestampLike = {
  toMillis(): number;
};

type SubmissionUpdateData = Partial<Submission>;

type SubmissionWithTimestamp = Pick<Submission, "status"> & {
  submittedAt: TimestampLike;
};

export function buildSubmissionUpdateData<TReviewedAt>(
  submissionData: SubmissionUpdateData,
  now: TReviewedAt,
): Omit<SubmissionUpdateData, "reviewedAt"> & { reviewedAt: TReviewedAt } {
  return {
    ...Object.fromEntries(
      Object.entries(submissionData).filter(([, value]) => value !== undefined)
    ),
    reviewedAt: now,
  };
}

export function selectLatestApprovedSubmission<T extends SubmissionWithTimestamp>(
  submissions: T[],
): T | null {
  const approvedSubmissions = submissions
    .filter((submission) => submission.status === "approved")
    .sort((left, right) => right.submittedAt.toMillis() - left.submittedAt.toMillis());

  return approvedSubmissions[0] ?? null;
}

export function buildCompletedProjectRecord(input: {
  participation: Participation;
  project: Project;
  student: User | null;
  submissions: Submission[];
  certificates: Certificate[];
}): {
  participation: Participation;
  project: Project;
  student: User;
  submission: Submission;
  hasCertificate: boolean;
  certificate: Certificate | null;
} | null {
  if (input.participation.status !== "completed" || !input.student) {
    return null;
  }

  const latestApprovedSubmission = selectLatestApprovedSubmission(input.submissions);
  if (!latestApprovedSubmission) {
    return null;
  }

  return {
    participation: input.participation,
    project: input.project,
    student: input.student,
    submission: latestApprovedSubmission,
    hasCertificate: input.certificates.length > 0,
    certificate: input.certificates[0] ?? null,
  };
}
