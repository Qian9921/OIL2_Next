import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCcw,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  StudentProjectActionState,
  StudentProjectPrimaryActionKind,
} from "@/lib/student-project-actions";
import { Project, Submission, Subtask } from "@/lib/types";
import { formatDeadline, generateAvatar } from "@/lib/utils";

interface StudentProjectActionCardProps {
  cardId: string;
  project: Project;
  actionState: StudentProjectActionState;
  submission?: Submission;
  progress: number;
  completedTaskCount: number;
  totalTaskCount: number;
  nextSubtask?: Subtask;
  reviewComment?: string;
  isFocused?: boolean;
  isPrimaryActionBusy?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  onPrimaryAction: () => void;
}

function getActionToneClasses(tone: StudentProjectActionState["badgeTone"]) {
  switch (tone) {
    case "amber":
      return "bg-amber-100 text-amber-800";
    case "blue":
      return "bg-blue-100 text-blue-800";
    case "green":
      return "bg-green-100 text-green-800";
    case "red":
      return "bg-red-100 text-red-800";
    case "slate":
      return "bg-slate-100 text-slate-700";
  }
}

function getPrimaryActionIcon(actionKind: StudentProjectPrimaryActionKind) {
  switch (actionKind) {
    case "continue":
      return <ArrowRight className="w-4 h-4 mr-2" />;
    case "submit":
      return <CheckCircle2 className="w-4 h-4 mr-2" />;
    case "resubmit":
      return <RefreshCcw className="w-4 h-4 mr-2" />;
    case "view_certificate":
      return <Award className="w-4 h-4 mr-2" />;
    case "accept_exit":
      return <AlertCircle className="w-4 h-4 mr-2" />;
    case "browse_more":
      return <ArrowRight className="w-4 h-4 mr-2" />;
  }
}

function getPrimaryActionButtonClasses(actionKind: StudentProjectPrimaryActionKind) {
  switch (actionKind) {
    case "submit":
    case "resubmit":
      return "bg-green-600 hover:bg-green-700 text-white";
    case "accept_exit":
      return "bg-red-600 hover:bg-red-700 text-white";
    case "view_certificate":
      return "bg-yellow-500 hover:bg-yellow-600 text-white";
    case "continue":
      return "bg-purple-600 hover:bg-purple-700 text-white";
    case "browse_more":
      return "bg-slate-900 hover:bg-slate-800 text-white";
  }
}

function getStatusBadge(
  actionState: StudentProjectActionState,
  submission?: Submission,
) {
  if (submission) {
    return <StatusBadge status={submission.status} />;
  }

  if (actionState.state === "completed_with_certificate") {
    return <StatusBadge status="certificate" />;
  }

  if (actionState.state === "completed_awaiting_certificate") {
    return <StatusBadge status="certificate_pending" />;
  }

  if (actionState.state === "ready_to_submit") {
    return <StatusBadge status="pending" text="Not Submitted" />;
  }

  if (actionState.state === "expired_incomplete") {
    return <StatusBadge status="dropped" text="Expired" />;
  }

  return <StatusBadge status="active" text="In Progress" />;
}

export function StudentProjectActionCard({
  cardId,
  project,
  actionState,
  submission,
  progress,
  completedTaskCount,
  totalTaskCount,
  nextSubtask,
  reviewComment,
  isFocused = false,
  isPrimaryActionBusy = false,
  secondaryActionLabel,
  onSecondaryAction,
  onPrimaryAction,
}: StudentProjectActionCardProps) {
  return (
    <Card
      id={cardId}
      className={`border transition-all ${isFocused ? "border-purple-400 ring-2 ring-purple-200 shadow-lg" : "border-gray-200"}`}
    >
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getActionToneClasses(actionState.badgeTone)}`}
              >
                {actionState.badgeLabel}
              </span>
              {getStatusBadge(actionState, submission)}
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/projects/${project.id}`}
                className="text-lg font-semibold text-gray-900 hover:text-purple-700 transition-colors"
              >
                {project.title}
              </Link>
              <Avatar src={generateAvatar(project.ngoId)} alt={project.ngoName} size="sm" />
            </div>
            <p className="text-sm text-gray-500 mt-1">{project.ngoName}</p>
          </div>
        </div>

        <div>
          <p className="text-base font-medium text-gray-900">{actionState.headline}</p>
          <p className="text-sm text-gray-600 mt-1">{actionState.supportingText}</p>
        </div>

        <ProgressBar
          progress={progress}
          completedTasks={completedTaskCount}
          totalTasks={totalTaskCount}
        />

        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            Due {formatDeadline(project.deadline)}
          </span>
          {nextSubtask && actionState.state === "continue_next_task" && (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
              <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
              Next: {nextSubtask.title}
            </span>
          )}
          {submission?.submittedAt && actionState.state === "under_review" && (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
              <Clock3 className="w-3.5 h-3.5 mr-1.5" />
              Submitted {submission.submittedAt.toDate().toLocaleDateString("en-US")}
            </span>
          )}
          {actionState.state === "completed_with_certificate" && (
            <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-green-700">
              <Award className="w-3.5 h-3.5 mr-1.5" />
              Certificate available
            </span>
          )}
        </div>

        {actionState.showFeedbackSnippet && reviewComment && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center text-xs font-medium text-gray-700 mb-1.5">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Review Feedback
            </div>
            <p className="text-sm text-gray-700 line-clamp-3">{reviewComment}</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          {secondaryActionLabel && onSecondaryAction ? (
            <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          ) : (
            <div />
          )}
          <Button
            onClick={onPrimaryAction}
            disabled={isPrimaryActionBusy}
            className={getPrimaryActionButtonClasses(actionState.primaryActionKind)}
          >
            {getPrimaryActionIcon(actionState.primaryActionKind)}
            {isPrimaryActionBusy ? "Working..." : actionState.primaryActionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
