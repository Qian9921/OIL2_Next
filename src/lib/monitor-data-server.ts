import {
  getCertificatesAdmin,
  getParticipationsAdmin,
  getProjectsAdmin,
  getUsersByRoleAdmin,
} from "@/lib/server-firestore";
import { Certificate, Participation, Project, User } from "@/lib/types";

export interface StudentMonitorData {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  joinDate: string;
  lastActive: string;
  totalHours: number;
  activeProjects: number;
  completedProjects: number;
  certificates: number;
  loginFrequency: number;
  pageViews: number;
  avgSessionTime: number;
  status: "online" | "offline";
  performance: "excellent" | "good" | "average" | "needs_attention";
  recentActivities: Array<{
    action: string;
    timestamp: string;
    details: string;
  }>;
}

export interface MonitorDashboardStats {
  totalStudents: number;
  activeStudents: number;
  onlineNow: number;
  newRegistrations: number;
  totalProjects: number;
  completedProjects: number;
  totalCertificates: number;
  avgCompletionRate: number;
}

function formatTimestamp(timestamp: { toDate(): Date }) {
  return timestamp.toDate().toLocaleString("zh-CN");
}

function calculatePerformance(
  activeProjects: number,
  completedProjects: number,
  totalHours: number,
  certificates: number,
): StudentMonitorData["performance"] {
  const score =
    completedProjects * 3 + activeProjects * 2 + certificates * 4 + totalHours * 0.1;

  if (score >= 20) return "excellent";
  if (score >= 10) return "good";
  if (score >= 5) return "average";
  return "needs_attention";
}

function determineRealOnlineStatus(lastActiveTimestamp: {
  toDate(): Date;
}): StudentMonitorData["status"] {
  const now = new Date();
  const minutesDiff =
    (now.getTime() - lastActiveTimestamp.toDate().getTime()) / (1000 * 60);
  return minutesDiff <= 30 ? "online" : "offline";
}

function calculateRealActivityData(
  student: User,
  participations: Participation[],
  realLastActivityTime: { toDate(): Date },
) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastActiveDate = realLastActivityTime.toDate();

  if (lastActiveDate < weekAgo) {
    return {
      loginFrequency: 0,
      pageViews: 0,
      avgSessionTime: 0,
    };
  }

  const studentParticipations = participations.filter((item) => item.studentId === student.id);
  const thisWeekParticipations = studentParticipations.filter((item) => {
    const joinedAt = item.joinedAt.toDate();
    const updatedAt = item.updatedAt ? item.updatedAt.toDate() : joinedAt;
    return joinedAt >= weekAgo || updatedAt >= weekAgo;
  });

  let totalSessionMinutes = 0;
  let sessionCount = 0;

  for (const participation of studentParticipations) {
    if (participation.startTime && participation.endTime) {
      totalSessionMinutes +=
        (participation.endTime.toMillis() - participation.startTime.toMillis()) /
        (1000 * 60);
      sessionCount += 1;
    }
  }

  return {
    loginFrequency: thisWeekParticipations.length,
    pageViews: thisWeekParticipations.length * 2,
    avgSessionTime: sessionCount > 0 ? Math.min(Math.round(totalSessionMinutes / sessionCount), 300) : 0,
  };
}

async function getRealLastActivityTime(student: User, participations: Participation[]) {
  const timestamps = [student.createdAt];

  if (student.updatedAt) {
    timestamps.push(student.updatedAt);
  }

  for (const participation of participations.filter((item) => item.studentId === student.id)) {
    timestamps.push(participation.joinedAt);
    if (participation.updatedAt) {
      timestamps.push(participation.updatedAt);
    }
    if (participation.completedAt) {
      timestamps.push(participation.completedAt);
    }
  }

  return timestamps.reduce((latest, current) =>
    current.toMillis() > latest.toMillis() ? current : latest,
  );
}

async function generateRecentActivities(
  student: User,
  participations: Participation[],
  certificates: Certificate[],
  projects: Project[],
) {
  const activities: Array<{
    action: string;
    timestamp: string;
    details: string;
    date: Date;
  }> = [
    {
      action: "注册账户",
      timestamp: formatTimestamp(student.createdAt),
      details: "新用户注册",
      date: student.createdAt.toDate(),
    },
  ];

  for (const participation of participations.filter((item) => item.studentId === student.id)) {
    const project = projects.find((item) => item.id === participation.projectId);
    const projectTitle = project ? project.title : `项目 ID: ${participation.projectId}`;

    activities.push({
      action: "加入项目",
      timestamp: formatTimestamp(participation.joinedAt),
      details: `参与项目: ${projectTitle}`,
      date: participation.joinedAt.toDate(),
    });

    if (participation.status === "completed" && participation.completedAt) {
      activities.push({
        action: "完成项目",
        timestamp: formatTimestamp(participation.completedAt),
        details: `完成项目: ${projectTitle}`,
        date: participation.completedAt.toDate(),
      });
    }
  }

  for (const certificate of certificates.filter((item) => item.studentId === student.id)) {
    activities.push({
      action: "获得证书",
      timestamp: formatTimestamp(certificate.issuedAt),
      details: `${certificate.projectTitle} - 证书编号: ${certificate.certificateNumber}`,
      date: certificate.issuedAt.toDate(),
    });
  }

  return activities
    .sort((left, right) => right.date.getTime() - left.date.getTime())
    .slice(0, 5)
    .map(({ action, timestamp, details }) => ({
      action,
      timestamp,
      details,
    }));
}

async function loadMonitorSnapshot() {
  const [students, projects, participations, certificates] = await Promise.all([
    getUsersByRoleAdmin("student"),
    getProjectsAdmin(),
    getParticipationsAdmin(),
    getCertificatesAdmin(),
  ]);

  return {
    students,
    projects,
    participations,
    certificates,
  };
}

export async function validateMonitorSnapshot() {
  const { students, projects, participations, certificates } = await loadMonitorSnapshot();

  return {
    students: students.length,
    projects: projects.length,
    participations: participations.length,
    certificates: certificates.length,
  };
}

export async function getMonitorStudentsAdmin(): Promise<StudentMonitorData[]> {
  const { students, projects, participations, certificates } = await loadMonitorSnapshot();

  return Promise.all(
    students.map(async (student) => {
      const studentParticipations = participations.filter((item) => item.studentId === student.id);
      const activeProjects = studentParticipations.filter((item) => item.status === "active").length;
      const completedProjects = studentParticipations.filter((item) => item.status === "completed").length;
      const totalHours = studentParticipations.reduce((total, item) => {
        if (item.startTime && item.endTime) {
          return total + (item.endTime.toMillis() - item.startTime.toMillis()) / (1000 * 60 * 60);
        }
        return total;
      }, 0);

      const studentCertificates = certificates.filter((item) => item.studentId === student.id).length;
      const lastActivity = await getRealLastActivityTime(student, studentParticipations);
      const activityData = calculateRealActivityData(student, participations, lastActivity);

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        avatar: student.avatar,
        joinDate: formatTimestamp(student.createdAt),
        lastActive: formatTimestamp(lastActivity),
        totalHours: Math.round(totalHours * 10) / 10,
        activeProjects,
        completedProjects,
        certificates: studentCertificates,
        loginFrequency: activityData.loginFrequency,
        pageViews: activityData.pageViews,
        avgSessionTime: activityData.avgSessionTime,
        status: determineRealOnlineStatus(lastActivity),
        performance: calculatePerformance(
          activeProjects,
          completedProjects,
          totalHours,
          studentCertificates,
        ),
        recentActivities: await generateRecentActivities(
          student,
          participations,
          certificates,
          projects,
        ),
      } satisfies StudentMonitorData;
    }),
  );
}

export async function getMonitorDashboardStatsAdmin(): Promise<MonitorDashboardStats> {
  const { students, projects, participations, certificates } = await loadMonitorSnapshot();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const newRegistrations = students.filter((student) => student.createdAt.toDate() >= weekAgo).length;
  const activeStudentIds = new Set(
    participations
      .filter((participation) => participation.updatedAt && participation.updatedAt.toDate() >= monthAgo)
      .map((participation) => participation.studentId),
  );
  const onlineNow = await Promise.all(
    students.map((student) => getRealLastActivityTime(student, participations)),
  ).then((timestamps) =>
    timestamps.filter((timestamp) => determineRealOnlineStatus(timestamp) === "online").length,
  );
  const completedProjects = projects.filter((project) => project.status === "completed").length;
  const avgCompletionRate =
    participations.length > 0
      ? Math.round(
          (participations.filter((participation) => participation.status === "completed").length /
            participations.length) *
            1000,
        ) / 10
      : 0;

  return {
    totalStudents: students.length,
    activeStudents: activeStudentIds.size,
    onlineNow,
    newRegistrations,
    totalProjects: projects.length,
    completedProjects,
    totalCertificates: certificates.length,
    avgCompletionRate,
  };
}

export async function getStudentDetailsAdmin(studentId: string) {
  const students = await getMonitorStudentsAdmin();
  return students.find((student) => student.id === studentId) ?? null;
}

