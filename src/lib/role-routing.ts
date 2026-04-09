import { UserRole } from "@/lib/types";

type SessionRole = UserRole | string | undefined;

export type SignupRole = Exclude<UserRole, "teacher">;
export type CollaborationRole = "student" | "ngo";
export type EffectiveUserRole = CollaborationRole;

export function getEffectiveUserRole(role: SessionRole): EffectiveUserRole | null {
  switch (role) {
    case "teacher":
    case "ngo":
      return "ngo";
    case "student":
      return "student";
    default:
      return null;
  }
}

export function getCollaborationRole(role: SessionRole): CollaborationRole | null {
  return getEffectiveUserRole(role);
}

export function isStudentWorkspaceRole(role: SessionRole): boolean {
  return getEffectiveUserRole(role) === "student";
}

export function getDefaultRouteForRole(role: SessionRole): string {
  const collaborationRole = getEffectiveUserRole(role);

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
  return getEffectiveUserRole(role) === "ngo" ? "/ngo/projects" : "/student/projects";
}

export function isSignupRole(role: UserRole): role is SignupRole {
  return role === "student" || role === "ngo";
}
