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
  loginFrequency: number; // 本周登录次数
  pageViews: number; // 本周页面访问次数
  avgSessionTime: number; // 平均会话时间（分钟）
  status: 'online' | 'offline';
  performance: 'excellent' | 'good' | 'average' | 'needs_attention';
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

async function fetchMonitorJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Monitor request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export const validateFirebaseData = async () =>
  fetchMonitorJson<{ students: number; projects: number; participations: number; certificates: number }>(
    "/api/admin/monitor/validate",
  );

export const getMonitorStudents = async (): Promise<StudentMonitorData[]> =>
  fetchMonitorJson<StudentMonitorData[]>("/api/admin/monitor/students");

export const getMonitorDashboardStats = async (): Promise<MonitorDashboardStats> =>
  fetchMonitorJson<MonitorDashboardStats>("/api/admin/monitor/dashboard");

export const getStudentDetails = async (
  studentId: string,
): Promise<StudentMonitorData | null> => {
  try {
    return await fetchMonitorJson<StudentMonitorData>(
      `/api/admin/monitor/students/${studentId}`,
    );
  } catch {
    return null;
  }
};
