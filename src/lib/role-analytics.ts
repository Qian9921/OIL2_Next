import { UserRole } from "./types";
import { getEffectiveUserRole } from "./role-routing";

interface UserRoleLike {
  role: UserRole;
}

export interface UserRoleAnalytics {
  activeUsersByRole: {
    student: number;
    ngo: number;
  };
  legacyUsersByRole: {
    teacher: number;
  };
}

export function buildUserRoleAnalytics(users: UserRoleLike[]): UserRoleAnalytics {
  const analytics: UserRoleAnalytics = {
    activeUsersByRole: {
      student: 0,
      ngo: 0,
    },
    legacyUsersByRole: {
      teacher: 0,
    },
  };

  for (const user of users) {
    const effectiveRole = getEffectiveUserRole(user.role);
    if (effectiveRole) {
      analytics.activeUsersByRole[effectiveRole] += 1;
    }

    if (user.role === "teacher") {
      analytics.legacyUsersByRole.teacher += 1;
    }
  }

  return analytics;
}
