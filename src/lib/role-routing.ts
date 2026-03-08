import { UserRole } from "@/lib/types";

type SessionRole = UserRole | string | undefined;

export type SignupRole = Exclude<UserRole, "teacher">;
export type CollaborationRole = "student" | "ngo";

export function getCollaborationRole(role: SessionRole): CollaborationRole | null {
  switch (role) {
    case "student":
      return "student";
    case "ngo":
      return "ngo";
    default:
      return null;
  }
}

export function isStudentWorkspaceRole(role: SessionRole): boolean {
  return getCollaborationRole(role) === "student";
}

export function getDefaultRouteForRole(role: SessionRole): string {
  const collaborationRole = getCollaborationRole(role);

  switch (collaborationRole) {
    case "ngo":
      return "/ngo";
    case "student":
      return "/student";
    default:
      return "/";
  }
}

export function getProjectWorkspaceRoute(role: SessionRole): string {
  return getCollaborationRole(role) === "ngo" ? "/ngo/projects" : "/student/projects";
}

export function isSignupRole(role: UserRole): role is SignupRole {
  return role === "student" || role === "ngo";
}
