import { collection, getDocs, query, where, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { User, Project, Participation, Certificate } from "./types";

// 监控系统数据接口
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

// 获取所有学生用户
async function getAllStudents(): Promise<User[]> {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'student'),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
}

// 获取所有项目
async function getAllProjects(): Promise<Project[]> {
  const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
}

// 获取所有参与记录
async function getAllParticipations(): Promise<Participation[]> {
  const q = query(collection(db, 'participations'), orderBy('joinedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participation));
}

// 获取所有证书
async function getAllCertificates(): Promise<Certificate[]> {
  const q = query(collection(db, 'certificates'), orderBy('issuedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Certificate));
}

// 计算学生表现等级
function calculatePerformance(activeProjects: number, completedProjects: number, totalHours: number, certificates: number): StudentMonitorData['performance'] {
  const score = (completedProjects * 3) + (activeProjects * 2) + (certificates * 4) + (totalHours * 0.1);
  
  if (score >= 20) return 'excellent';
  if (score >= 10) return 'good';
  if (score >= 5) return 'average';
  return 'needs_attention';
}

// 基于真实的最后活动时间判断在线状态
function determineRealOnlineStatus(lastActiveTimestamp: Timestamp): 'online' | 'offline' {
  const now = new Date();
  const lastActiveTime = lastActiveTimestamp.toDate();
  const minutesDiff = (now.getTime() - lastActiveTime.getTime()) / (1000 * 60);
  
  // 如果最后活动时间在30分钟内，认为是在线状态
  return minutesDiff <= 30 ? 'online' : 'offline';
}

// 获取用户的真实最后活动时间（综合多个数据源）
async function getRealLastActivityTime(
  student: User, 
  participations: Participation[]
): Promise<Timestamp> {
  const timestamps: Timestamp[] = [];
  
  // 用户的更新时间
  if (student.updatedAt) {
    timestamps.push(student.updatedAt);
  }
  
  // 用户的创建时间
  timestamps.push(student.createdAt);
  
  // 用户最近的参与活动时间
  const studentParticipations = participations.filter(p => p.studentId === student.id);
  studentParticipations.forEach(participation => {
    timestamps.push(participation.joinedAt);
    if (participation.updatedAt) {
      timestamps.push(participation.updatedAt);
    }
    if (participation.completedAt) {
      timestamps.push(participation.completedAt);
    }
  });
  
  // 返回最近的时间戳
  return timestamps.reduce((latest, current) => 
    current.toMillis() > latest.toMillis() ? current : latest
  );
}

// 基于真实数据计算活动统计
function calculateRealActivityData(
  student: User,
  participations: Participation[],
  realLastActivityTime: Timestamp
): { loginFrequency: number; pageViews: number; avgSessionTime: number } {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastActiveDate = realLastActivityTime.toDate();

  // 如果最后活动时间不在本周内，所有本周数据都应该是0
  if (lastActiveDate < weekAgo) {
    return {
      loginFrequency: 0,
      pageViews: 0,
      avgSessionTime: 0
    };
  }

  // 基于真实数据计算
  const studentParticipations = participations.filter(p => p.studentId === student.id);
  
  // 计算本周的参与活动（作为登录频率的代理指标）
  const thisWeekParticipations = studentParticipations.filter(p => {
    const joinDate = p.joinedAt.toDate();
    const updateDate = p.updatedAt ? p.updatedAt.toDate() : joinDate;
    return joinDate >= weekAgo || updateDate >= weekAgo;
  });

  // 计算平均会话时间（基于真实项目参与时间）
  let totalSessionMinutes = 0;
  let sessionCount = 0;
  
  studentParticipations.forEach(p => {
    if (p.startTime && p.endTime) {
      const sessionMinutes = (p.endTime.toMillis() - p.startTime.toMillis()) / (1000 * 60);
      totalSessionMinutes += sessionMinutes;
      sessionCount++;
    }
  });

  const avgSessionTime = sessionCount > 0 ? Math.round(totalSessionMinutes / sessionCount) : 0;

  return {
    loginFrequency: thisWeekParticipations.length,
    pageViews: thisWeekParticipations.length * 2, // 估算：每次参与可能产生2个页面访问
    avgSessionTime: Math.min(avgSessionTime, 300) // 限制最大值为5小时，避免异常数据
  };
}

// 格式化时间戳
function formatTimestamp(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleString('zh-CN');
}

// 数据验证和调试函数
export const validateFirebaseData = async () => {
  try {
    const [students, participations, certificates, projects] = await Promise.all([
      getAllStudents(),
      getAllParticipations(),
      getAllCertificates(),
      getAllProjects()
    ]);

    console.log('=== Firebase 数据验证 ===');
    console.log(`学生总数: ${students.length}`);
    console.log(`项目总数: ${projects.length}`);
    console.log(`参与记录总数: ${participations.length}`);
    console.log(`证书总数: ${certificates.length}`);
    
    if (students.length > 0) {
      console.log('示例学生数据:', students[0]);
    }
    if (projects.length > 0) {
      console.log('示例项目数据:', projects[0]);
    }
    if (participations.length > 0) {
      console.log('示例参与记录:', participations[0]);
    }
    if (certificates.length > 0) {
      console.log('示例证书数据:', certificates[0]);
    }

    return {
      students: students.length,
      projects: projects.length,
      participations: participations.length,
      certificates: certificates.length
    };
  } catch (error) {
    console.error('数据验证失败:', error);
    return null;
  }
};

// 获取学生列表（真实Firebase数据）
export const getMonitorStudents = async (): Promise<StudentMonitorData[]> => {
  try {
    const [students, participations, certificates, projects] = await Promise.all([
      getAllStudents(),
      getAllParticipations(),
      getAllCertificates(),
      getAllProjects()
    ]);

    // 在开发环境下打印数据验证信息
    if (process.env.NODE_ENV === 'development') {
      console.log('获取的数据统计:', {
        学生数: students.length,
        项目数: projects.length,
        参与记录数: participations.length,
        证书数: certificates.length
      });
    }

    const studentMonitorData: StudentMonitorData[] = await Promise.all(
      students.map(async (student) => {
        // 获取该学生的参与记录
        const studentParticipations = participations.filter(p => p.studentId === student.id);
        const activeProjects = studentParticipations.filter(p => p.status === 'active').length;
        const completedProjects = studentParticipations.filter(p => p.status === 'completed').length;
        
        // 获取该学生的证书
        const studentCertificates = certificates.filter(c => c.studentId === student.id).length;
        
        // 计算总学习时间（基于参与记录）
        const totalHours = studentParticipations.reduce((total, p) => {
          if (p.startTime && p.endTime) {
            const hours = (p.endTime.toMillis() - p.startTime.toMillis()) / (1000 * 60 * 60);
            return total + hours;
          }
          return total;
        }, 0);

        // 基于真实数据获取最后活动时间和在线状态
        const realLastActivityTime = await getRealLastActivityTime(student, studentParticipations);
        const status = determineRealOnlineStatus(realLastActivityTime);
        const lastActive = formatTimestamp(realLastActivityTime);

        // 基于真实数据计算活动统计
        const activityData = calculateRealActivityData(student, participations, realLastActivityTime);

        // 生成最近活动
        const recentActivities = await generateRecentActivities(student, studentParticipations, certificates, projects);

        return {
          id: student.id,
          name: student.name,
          email: student.email,
          avatar: student.avatar,
          joinDate: formatTimestamp(student.createdAt),
          lastActive,
          totalHours: Math.round(totalHours * 10) / 10,
          activeProjects,
          completedProjects,
          certificates: studentCertificates,
          loginFrequency: activityData.loginFrequency,
          pageViews: activityData.pageViews,
          avgSessionTime: activityData.avgSessionTime,
          status,
          performance: calculatePerformance(activeProjects, completedProjects, totalHours, studentCertificates),
          recentActivities
        };
      })
    );

    return studentMonitorData;
  } catch (error) {
    console.error('Error fetching monitor students data:', error);
    return [];
  }
};

// 获取仪表板统计（真实Firebase数据）
export const getMonitorDashboardStats = async (): Promise<MonitorDashboardStats> => {
  try {
    const [students, projects, participations, certificates] = await Promise.all([
      getAllStudents(),
      getAllProjects(),
      getAllParticipations(),
      getAllCertificates()
    ]);

    // 计算新注册用户（最近7天）
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const newRegistrations = students.filter(student => 
      student.createdAt.toDate() >= weekAgo
    ).length;

    // 计算活跃学生（最近30天有参与活动）
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const activeStudentIds = new Set(
      participations
        .filter(p => p.updatedAt && p.updatedAt.toDate() >= monthAgo)
        .map(p => p.studentId)
    );

    // 计算在线学生数（基于真实活动时间）
    const onlineNow = await Promise.all(
      students.map(async (student) => {
        const realLastActivityTime = await getRealLastActivityTime(student, participations);
        return determineRealOnlineStatus(realLastActivityTime) === 'online';
      })
    ).then(results => results.filter(Boolean).length);

    // 计算完成的项目数
    const completedProjectsCount = projects.filter(p => p.status === 'completed').length;

    // 计算平均完成率
    const totalParticipations = participations.length;
    const completedParticipations = participations.filter(p => p.status === 'completed').length;
    const avgCompletionRate = totalParticipations > 0 
      ? Math.round((completedParticipations / totalParticipations) * 100 * 10) / 10
      : 0;

    return {
      totalStudents: students.length,
      activeStudents: activeStudentIds.size,
      onlineNow,
      newRegistrations,
      totalProjects: projects.length,
      completedProjects: completedProjectsCount,
      totalCertificates: certificates.length,
      avgCompletionRate
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      totalStudents: 0,
      activeStudents: 0,
      onlineNow: 0,
      newRegistrations: 0,
      totalProjects: 0,
      completedProjects: 0,
      totalCertificates: 0,
      avgCompletionRate: 0
    };
  }
};

// 获取单个学生详情（真实Firebase数据）
export const getStudentDetails = async (studentId: string): Promise<StudentMonitorData | null> => {
  try {
    const students = await getMonitorStudents();
    return students.find(student => student.id === studentId) || null;
  } catch (error) {
    console.error('Error fetching student details:', error);
    return null;
  }
};

// 生成最近活动记录
async function generateRecentActivities(
  student: User, 
  participations: Participation[], 
  allCertificates: Certificate[],
  allProjects: Project[]
): Promise<Array<{ action: string; timestamp: string; details: string }>> {
  const activities: Array<{ action: string; timestamp: string; details: string; date: Date }> = [];

  // 添加注册活动
  activities.push({
    action: "注册账户",
    timestamp: formatTimestamp(student.createdAt),
    details: "新用户注册",
    date: student.createdAt.toDate()
  });

  // 添加项目参与活动
  participations.forEach(participation => {
    const project = allProjects.find(p => p.id === participation.projectId);
    const projectTitle = project ? project.title : `项目 ID: ${participation.projectId}`;
    
    activities.push({
      action: "加入项目",
      timestamp: formatTimestamp(participation.joinedAt),
      details: `参与项目: ${projectTitle}`,
      date: participation.joinedAt.toDate()
    });

    if (participation.status === 'completed' && participation.completedAt) {
      activities.push({
        action: "完成项目",
        timestamp: formatTimestamp(participation.completedAt),
        details: `完成项目: ${projectTitle}`,
        date: participation.completedAt.toDate()
      });
    }
  });

  // 添加证书获得活动
  const studentCertificates = allCertificates.filter(c => c.studentId === student.id);
  studentCertificates.forEach(certificate => {
    activities.push({
      action: "获得证书",
      timestamp: formatTimestamp(certificate.issuedAt),
      details: `${certificate.projectTitle} - 证书编号: ${certificate.certificateNumber}`,
      date: certificate.issuedAt.toDate()
    });
  });

  // 按时间倒序排列，取最近的5个活动
  return activities
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5)
    .map(activity => ({
      action: activity.action,
      timestamp: activity.timestamp,
      details: activity.details
    }));
} 