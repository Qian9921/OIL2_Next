import { Certificate, Participation, Project, Submission, Subtask } from "./types";

type TimestampLike = {
  toMillis(): number;
};

export type StudentProjectWorkflowState =
  | "needs_revision"
  | "ready_to_submit"
  | "rejected_exit"
  | "continue_next_task"
  | "under_review"
  | "completed_with_certificate"
  | "completed_awaiting_certificate"
  | "expired_incomplete";

export type StudentProjectSectionKey =
  | "needs_attention"
  | "continue_learning"
  | "waiting_review"
  | "completed";

export type StudentProjectPrimaryActionKind =
  | "continue"
  | "submit"
  | "resubmit"
  | "view_certificate"
  | "accept_exit"
  | "browse_more";

export interface StudentProjectActionState {
  state: StudentProjectWorkflowState;
  section: StudentProjectSectionKey;
  primaryActionLabel: string;
  primaryActionKind: StudentProjectPrimaryActionKind;
  primaryActionTarget: string;
  headline: string;
  supportingText: string;
  badgeLabel: string;
  badgeTone: "amber" | "blue" | "green" | "red" | "slate";
  showFeedbackSnippet: boolean;
}

export interface StudentProjectSection<T> {
  key: StudentProjectSectionKey;
  items: T[];
}

export interface StudentProjectActionInput {
  participation: Participation;
  project: Project;
  submission?: Submission;
  certificate?: Certificate | null;
  nextSubtask?: Subtask;
  isExpired: boolean;
  totalTaskCount: number;
  completedTaskCount: number;
}

export const STUDENT_PROJECT_SECTION_ORDER: StudentProjectSectionKey[] = [
  "needs_attention",
  "continue_learning",
  "waiting_review",
  "completed",
];

const STATE_PRIORITY: Record<StudentProjectWorkflowState, number> = {
  needs_revision: 0,
  ready_to_submit: 1,
  rejected_exit: 2,
  continue_next_task: 0,
  expired_incomplete: 1,
  under_review: 0,
  completed_with_certificate: 0,
  completed_awaiting_certificate: 1,
};

export function buildStudentProjectActionState(
  input: StudentProjectActionInput,
): StudentProjectActionState {
  const { submission, certificate, nextSubtask, isExpired } = input;

  if (submission?.status === "rejected") {
    return {
      state: "rejected_exit",
      section: "needs_attention",
      primaryActionLabel: "Accept and Leave",
      primaryActionKind: "accept_exit",
      primaryActionTarget: input.participation.id,
      headline: "This submission was not approved",
      supportingText:
        "Review the NGO feedback and remove this project from your active work when you're ready.",
      badgeLabel: "Rejected",
      badgeTone: "red",
      showFeedbackSnippet: true,
    };
  }

  if (submission?.status === "approved") {
    if (certificate) {
      return {
        state: "completed_with_certificate",
        section: "completed",
        primaryActionLabel: "View Certificate",
        primaryActionKind: "view_certificate",
        primaryActionTarget: "/student/certificates",
        headline: "Certificate ready",
        supportingText:
          "This project is approved and your certificate is ready to view or download.",
        badgeLabel: "Certificate Ready",
        badgeTone: "green",
        showFeedbackSnippet: false,
      };
    }

    return {
      state: "completed_awaiting_certificate",
      section: "completed",
      primaryActionLabel: "Browse More Projects",
      primaryActionKind: "browse_more",
      primaryActionTarget: "/student/projects",
      headline: "Approved, certificate on the way",
      supportingText:
        "The NGO approved your work. Your certificate has not been issued yet, so you can start another project meanwhile.",
      badgeLabel: "Approved",
      badgeTone: "green",
      showFeedbackSnippet: false,
    };
  }

  if (submission?.status === "pending") {
    return {
      state: "under_review",
      section: "waiting_review",
      primaryActionLabel: "Browse More Projects",
      primaryActionKind: "browse_more",
      primaryActionTarget: "/student/projects",
      headline: "Waiting for NGO review",
      supportingText:
        "Your submission is in review. We'll show feedback here as soon as the NGO responds.",
      badgeLabel: "Under Review",
      badgeTone: "amber",
      showFeedbackSnippet: false,
    };
  }

  if (submission?.status === "needs_revision") {
    return {
      state: "needs_revision",
      section: "needs_attention",
      primaryActionLabel: isExpired ? "Browse More Projects" : "Revise and Resubmit",
      primaryActionKind: isExpired ? "browse_more" : "resubmit",
      primaryActionTarget: isExpired ? "/student/projects" : input.participation.id,
      headline: isExpired ? "Revision requested after the deadline" : "Revision requested",
      supportingText: isExpired
        ? "The NGO requested changes, but this project deadline has already passed. Review the feedback and move on to another project."
        : "The NGO asked for a few changes before approval. Update your summary and submit again.",
      badgeLabel: isExpired ? "Expired" : "Needs Revision",
      badgeTone: isExpired ? "slate" : "amber",
      showFeedbackSnippet: true,
    };
  }

  if (isExpired) {
    return {
      state: "expired_incomplete",
      section: "continue_learning",
      primaryActionLabel: "Browse More Projects",
      primaryActionKind: "browse_more",
      primaryActionTarget: "/student/projects",
      headline: "Project deadline passed",
      supportingText:
        "This project is no longer accepting progress or submissions. Review what you learned and choose another project.",
      badgeLabel: "Expired",
      badgeTone: "slate",
      showFeedbackSnippet: false,
    };
  }

  const allTasksComplete =
    input.totalTaskCount > 0 && input.completedTaskCount >= input.totalTaskCount;
  if (allTasksComplete) {
    return {
      state: "ready_to_submit",
      section: "needs_attention",
      primaryActionLabel: "Submit for Review",
      primaryActionKind: "submit",
      primaryActionTarget: input.participation.id,
      headline: "Ready to submit for review",
      supportingText:
        "All tasks are complete. Send your summary to the NGO so they can review your work.",
      badgeLabel: "Ready to Submit",
      badgeTone: "amber",
      showFeedbackSnippet: false,
    };
  }

  return {
    state: "continue_next_task",
    section: "continue_learning",
    primaryActionLabel: "Continue Next Task",
    primaryActionKind: "continue",
    primaryActionTarget: nextSubtask
      ? `/projects/${input.project.id}/task/${nextSubtask.id}`
      : `/projects/${input.project.id}`,
    headline: nextSubtask ? "Continue your next task" : "Keep making progress",
    supportingText: nextSubtask
      ? `Next up: ${nextSubtask.title}. ${input.completedTaskCount}/${input.totalTaskCount} tasks complete.`
      : `${input.completedTaskCount}/${input.totalTaskCount} tasks complete. Open the project to keep going.`,
    badgeLabel: "In Progress",
    badgeTone: "blue",
    showFeedbackSnippet: false,
  };
}

export function groupStudentProjectActionItems<
  T extends {
    actionState: StudentProjectActionState;
    joinedAt: TimestampLike;
    isFocused?: boolean;
  },
>(items: T[]): Array<StudentProjectSection<T>> {
  return STUDENT_PROJECT_SECTION_ORDER.map((sectionKey) => ({
    key: sectionKey,
    items: items
      .filter((item) => item.actionState.section === sectionKey)
      .sort((left, right) => {
        if ((left.isFocused ?? false) !== (right.isFocused ?? false)) {
          return left.isFocused ? -1 : 1;
        }

        const statePriorityDifference =
          STATE_PRIORITY[left.actionState.state] - STATE_PRIORITY[right.actionState.state];
        if (statePriorityDifference !== 0) {
          return statePriorityDifference;
        }

        return right.joinedAt.toMillis() - left.joinedAt.toMillis();
      }),
  }));
}
