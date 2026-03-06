import { UserRole } from "@/lib/types";

type SessionRole = UserRole | string | undefined;

export type SignupRole = Exclude<UserRole, "teacher">;

export function getDefaultRouteForRole(role: SessionRole): string {
  switch (role) {
    case "ngo":
      return "/ngo";
    case "teacher":
      return "/student/projects";
    case "student":
      return "/student";
    default:
      return "/";
  }
}

export function getProjectWorkspaceRoute(role: SessionRole): string {
  return role === "ngo" ? "/ngo/projects" : "/student/projects";
}

export function isSignupRole(role: UserRole): role is SignupRole {
  return role === "student" || role === "ngo";
}
