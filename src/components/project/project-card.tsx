import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Plus,
  Target,
  Trash2,
  Users,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { ShineBorder } from "@/components/ui/shine-border";
import { Project } from "@/lib/types";
import {
  calculateEstimatedHours,
  formatDeadline,
  generateAvatar,
  getDifficultyColor,
  getExpiredProjectClasses,
  getStatusColor,
  isProjectExpired,
} from "@/lib/utils";

export interface ProjectCardProps {
  project: Project;
  showJoinButton?: boolean;
  isJoined?: boolean;
  isCompleted?: boolean;
  showAdminActions?: boolean;
  isFull?: boolean;
  isExpired?: boolean;
  isJoining?: boolean;
  onJoinClick?: (project: Project) => void;
  onEditClick?: (project: Project) => void;
  onDeleteClick?: (project: Project) => void;
  customActions?: React.ReactNode;
  additionalContent?: React.ReactNode;
  statusLabel?: string;
}

export function ProjectCard({
  project,
  showJoinButton = false,
  isJoined = false,
  isCompleted = false,
  showAdminActions = false,
  isFull = false,
  isExpired = false,
  isJoining = false,
  onJoinClick,
  onEditClick,
  onDeleteClick,
  customActions,
  additionalContent,
  statusLabel,
}: ProjectCardProps) {
  const projectIsExpired = isExpired || isProjectExpired(project.deadline);
  const estimatedHours = calculateEstimatedHours(project);

  const difficultyLabel =
    project.difficulty === "beginner"
      ? "Beginner"
      : project.difficulty === "intermediate"
        ? "Intermediate"
        : "Advanced";

  return (
    <div className="group relative h-full rounded-[1.9rem]">
      <ShineBorder borderWidth={1} duration={14} />

      <Card
        className={`relative flex h-full flex-col overflow-hidden rounded-[1.9rem] border-white/70 bg-white/88 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.35)] backdrop-blur-xl ${getExpiredProjectClasses(projectIsExpired)}`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-fuchsia-100/70 via-transparent to-cyan-100/70 opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-violet-100/40 to-transparent" />

        <CardHeader className="relative pb-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${getDifficultyColor(project.difficulty)}`}
            >
              {difficultyLabel}
            </span>

            {project.status && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${getStatusColor(project.status)}`}
              >
                {statusLabel ||
                  (project.status === "draft"
                    ? "Draft"
                    : project.status === "published"
                      ? "Published"
                      : project.status === "completed"
                        ? "Completed"
                        : project.status === "archived"
                          ? "Archived"
                          : project.status)}
              </span>
            )}

            {isFull && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 shadow-sm">
                Full
              </span>
            )}
            {isJoined && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
                Joined
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm">
                <CheckCircle className="mr-1 h-3.5 w-3.5" />
                Completed
              </span>
            )}
            {projectIsExpired && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                <Clock className="mr-1 h-3.5 w-3.5" />
                Expired
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="line-clamp-2 text-2xl leading-8">{project.title}</CardTitle>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {project.shortDescription || project.description}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Avatar
                src={generateAvatar(project.ngoId)}
                alt={project.ngoName}
                size="md"
                className="ring-2 ring-white/90 shadow-md"
              />
              <span className="rounded-full border border-white/70 bg-white/75 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                NGO
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Users className="h-4 w-4 text-violet-500" />
            <span className="truncate font-medium">Led by {project.ngoName}</span>
          </div>
        </CardHeader>

        <CardContent className="relative flex flex-1 flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                <Users className="h-3.5 w-3.5" />
                Capacity
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                {project.currentParticipants}/{project.maxParticipants || "∞"} learners
              </p>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                Effort
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                {estimatedHours > 0 ? `${estimatedHours} hrs est.` : "Hours TBD"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                <Target className="h-3.5 w-3.5" />
                Workflow
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                {project.subtasks?.length || 0} tasks
              </p>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                Deadline
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                {project.deadline ? `Due ${formatDeadline(project.deadline)}` : "No deadline"}
              </p>
            </div>
          </div>

          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {project.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/70 bg-slate-100/80 px-2.5 py-1 text-xs font-medium text-slate-600"
                >
                  {tag}
                </span>
              ))}
              {project.tags.length > 4 && (
                <span className="rounded-full border border-white/70 bg-slate-100/80 px-2.5 py-1 text-xs font-medium text-slate-600">
                  +{project.tags.length - 4}
                </span>
              )}
            </div>
          )}

          {isCompleted && (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                <span>
                  You’ve completed this project successfully. Your certificate status is waiting below.
                </span>
              </div>
            </div>
          )}

          {additionalContent}

          <div className="mt-auto space-y-2.5 pt-1">
            <Link href={`/projects/${project.id}`} className="block w-full">
              <Button variant="outline" className="w-full justify-between rounded-2xl border-white/70 bg-white/80">
                <span className="inline-flex items-center">
                  <BookOpen className="mr-2 h-4 w-4" />
                  View Details
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            {customActions}

            {showJoinButton && !isJoined && (
              <Button
                onClick={() => onJoinClick?.(project)}
                disabled={isFull || isJoining || projectIsExpired}
                className="w-full rounded-2xl"
              >
                {isJoining ? (
                  <LoadingState size="sm" className="mr-2 h-4 w-4" fullHeight={false} />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {projectIsExpired
                  ? "Project Expired"
                  : isFull
                    ? "Project Full"
                    : isJoining
                      ? "Joining..."
                      : "Join Project"}
              </Button>
            )}

            {showJoinButton && isJoined && !isCompleted && (
              <Link href="/student/my-projects" className="block w-full">
                <Button className="w-full rounded-2xl">
                  <Target className="mr-2 h-4 w-4" />
                  Continue
                </Button>
              </Link>
            )}

            {showJoinButton && isJoined && isCompleted && (
              <div className="grid gap-2">
                <Link href="/student/certificates" className="block w-full">
                  <Button
                    variant="outline"
                    className="w-full rounded-2xl border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100"
                  >
                    <Award className="mr-2 h-4 w-4" />
                    View Certificate
                  </Button>
                </Link>
                <Link href="/student/my-projects" className="block w-full">
                  <Button variant="outline" className="w-full rounded-2xl border-white/70 bg-white/80">
                    <BookOpen className="mr-2 h-4 w-4" />
                    View Project
                  </Button>
                </Link>
              </div>
            )}

            {showAdminActions && (
              <div className="grid grid-cols-2 gap-2">
                {onEditClick && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditClick(project)}
                    className="rounded-2xl border-white/70 bg-white/80"
                  >
                    <Edit className="mr-1.5 h-4 w-4" />
                    Edit
                  </Button>
                )}
                {onDeleteClick && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDeleteClick(project)}
                    className="rounded-2xl border-red-200 bg-red-50/70 text-red-600 hover:bg-red-100 hover:text-red-700"
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
