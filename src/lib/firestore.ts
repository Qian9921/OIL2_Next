import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  increment
} from "firebase/firestore";
import { db } from "./firebase";
import {
  User,
  Project,
  Participation,
  Submission,
  UserRole,
  NGODashboard,
  StudentDashboard,
  ProjectStats,
  TeacherDashboard,
  Certificate
} from "./types";

// User operations
export async function createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = Timestamp.now();
  const userDoc = await addDoc(collection(db, 'users'), {
    ...userData,
    createdAt: now,
    updatedAt: now
  });
  return userDoc.id;
}

export async function getUser(userId: string): Promise<User | null> {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() } as User;
  }
  return null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const q = query(collection(db, 'users'), where('email', '==', email));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const userDoc = snapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() } as User;
  }
  return null;
}

export async function updateUser(userId: string, userData: Partial<User>) {
  await updateDoc(doc(db, 'users', userId), {
    ...userData,
    updatedAt: Timestamp.now()
  });
}

// Project operations
export async function createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'currentParticipants'>) {
  const now = Timestamp.now();
  const projectDoc = await addDoc(collection(db, 'projects'), {
    ...projectData,
    currentParticipants: 0,
    createdAt: now,
    updatedAt: now
  });
  return projectDoc.id;
}

export async function getProject(projectId: string): Promise<Project | null> {
  const projectDoc = await getDoc(doc(db, 'projects', projectId));
  if (projectDoc.exists()) {
    return { id: projectDoc.id, ...projectDoc.data() } as Project;
  }
  return null;
}

export async function getProjects(filters?: {
  ngoId?: string;
  status?: string;
  limit?: number;
}): Promise<Project[]> {
  let q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
  
  if (filters?.ngoId) {
    q = query(q, where('ngoId', '==', filters.ngoId));
  }
  
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }
  
  if (filters?.limit) {
    q = query(q, limit(filters.limit));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
}

export async function updateProject(projectId: string, projectData: Partial<Project>) {
  await updateDoc(doc(db, 'projects', projectId), {
    ...projectData,
    updatedAt: Timestamp.now()
  });
}

export async function deleteProject(projectId: string) {
  await deleteDoc(doc(db, 'projects', projectId));
}

// Participation operations
export async function createParticipation(participationData: Omit<Participation, 'id' | 'joinedAt' | 'chatHistory' | 'submissions'>) {
  const batch = writeBatch(db);
  
  // Create participation
  const participationRef = doc(collection(db, 'participations'));
  batch.set(participationRef, {
    ...participationData,
    joinedAt: Timestamp.now(),
    chatHistory: [],
    submissions: []
  });
  
  // Update project participant count
  const projectRef = doc(db, 'projects', participationData.projectId);
  batch.update(projectRef, {
    currentParticipants: increment(1),
    updatedAt: Timestamp.now()
  });
  
  await batch.commit();
  return participationRef.id;
}

export async function getParticipation(participationId: string): Promise<Participation | null> {
  const participationDoc = await getDoc(doc(db, 'participations', participationId));
  if (participationDoc.exists()) {
    return { id: participationDoc.id, ...participationDoc.data() } as Participation;
  }
  return null;
}

export async function getParticipations(filters?: {
  studentId?: string;
  projectId?: string;
  status?: string;
}): Promise<Participation[]> {
  let q = query(collection(db, 'participations'), orderBy('joinedAt', 'desc'));
  
  if (filters?.studentId) {
    q = query(q, where('studentId', '==', filters.studentId));
  }
  
  if (filters?.projectId) {
    q = query(q, where('projectId', '==', filters.projectId));
  }
  
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participation));
}

export async function updateParticipation(participationId: string, participationData: Partial<Participation>) {
  await updateDoc(doc(db, 'participations', participationId), participationData);
}

export async function deleteParticipation(participationId: string) {
  const batch = writeBatch(db);
  
  // Get participation to find project ID
  const participationDoc = await getDoc(doc(db, 'participations', participationId));
  if (participationDoc.exists()) {
    const participation = participationDoc.data() as Participation;
    
    // Delete participation
    batch.delete(doc(db, 'participations', participationId));
    
    // Update project participant count
    const projectRef = doc(db, 'projects', participation.projectId);
    batch.update(projectRef, {
      currentParticipants: increment(-1),
      updatedAt: Timestamp.now()
    });
    
    await batch.commit();
  }
}

export async function handleRejectedProject(participationId: string) {
  const batch = writeBatch(db);
  
  // Get participation to find project ID
  const participationDoc = await getDoc(doc(db, 'participations', participationId));
  if (participationDoc.exists()) {
    const participation = participationDoc.data() as Participation;
    
    // Update participation status to dropped
    batch.update(doc(db, 'participations', participationId), {
      status: 'dropped',
      droppedAt: Timestamp.now()
    });
    
    // Update project participant count
    const projectRef = doc(db, 'projects', participation.projectId);
    batch.update(projectRef, {
      currentParticipants: increment(-1),
      updatedAt: Timestamp.now()
    });
    
    await batch.commit();
  }
}

// Dashboard data functions
export async function getNGODashboard(ngoId: string): Promise<NGODashboard> {
  // Get NGO's projects
  const projects = await getProjects({ ngoId });
  const publishedProjects = projects.filter(p => p.status === 'published').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  
  // Calculate total participants
  let totalParticipants = 0;
  const projectStats: ProjectStats[] = [];
  
  for (const project of projects) {
    totalParticipants += project.currentParticipants;
    
    // Get participations for this project
    const participations = await getParticipations({ projectId: project.id });
    const completedCount = participations.filter(p => p.status === 'completed').length;
    const completionRate = participations.length > 0 ? (completedCount / participations.length) * 100 : 0;
    const averageProgress = participations.length > 0 
      ? participations.reduce((sum, p) => sum + p.progress, 0) / participations.length 
      : 0;
    
    projectStats.push({
      projectId: project.id,
      projectTitle: project.title,
      participants: project.currentParticipants,
      completionRate,
      averageProgress
    });
  }
  
  // Get pending reviews (submissions waiting for approval)
  const allSubmissions = await getDocs(
    query(collection(db, 'submissions'), where('status', '==', 'pending'))
  );
  
  // Filter submissions for NGO's projects
  const ngoProjectIds = projects.map(p => p.id);
  const pendingReviews = allSubmissions.docs.filter(doc => 
    ngoProjectIds.includes(doc.data().projectId)
  ).length;
  
  return {
    publishedProjects,
    totalParticipants,
    completedProjects,
    pendingReviews,
    projectStats
  };
}

export async function getStudentDashboard(studentId: string): Promise<StudentDashboard> {
  // Get student's participations
  const participations = await getParticipations({ studentId });
  const activeProjects = participations.filter(p => p.status === 'active').length;
  const completedProjects = participations.filter(p => p.status === 'completed').length;
  
  // Calculate total hours (estimated from completed projects)
  let totalHours = 0;
  for (const participation of participations.filter(p => p.status === 'completed')) {
    const project = await getProject(participation.projectId);
    if (project?.estimatedHours) {
      totalHours += project.estimatedHours;
    }
  }
  
  // Get certificates count
  const certificatesSnapshot = await getDocs(
    query(collection(db, 'certificates'), where('studentId', '==', studentId))
  );
  const certificates = certificatesSnapshot.size;
  
  // Get recent activity from real participation data
  const recentActivity = [];
  for (const participation of participations.slice(0, 5)) {
    const project = await getProject(participation.projectId);
    if (project) {
      recentActivity.push({
        id: participation.id,
        type: 'project_joined' as const,
        title: `Joined ${project.title}`,
        description: `You joined a project by ${project.ngoName}`,
        timestamp: participation.joinedAt
      });
    }
  }
  
  // Get recent submissions as activity
  const submissions = await getSubmissions({ studentId });
  for (const submission of submissions.slice(0, 3)) {
    const project = await getProject(submission.projectId);
    if (project) {
      recentActivity.push({
        id: `submission-${submission.id}`,
        type: 'submission_made' as const,
        title: `Submitted ${project.title}`,
        description: `You submitted your work for teacher review`,
        timestamp: submission.submittedAt
      });
    }
  }
  
  // Sort by timestamp and limit to 5 most recent
  recentActivity.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
  const finalRecentActivity = recentActivity.slice(0, 5);
  
  // Generate upcoming deadlines from active projects
  const upcomingDeadlines = [];
  for (const participation of participations.filter(p => p.status === 'active')) {
    const project = await getProject(participation.projectId);
    if (project) {
      // Calculate estimated completion date based on remaining progress
      const remainingProgress = 100 - participation.progress;
      const estimatedDaysToComplete = Math.ceil((remainingProgress / 100) * (project.estimatedHours || 10) / 2); // 2 hours per day assumption
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + estimatedDaysToComplete);
      
      upcomingDeadlines.push({
        id: participation.id,
        title: `Complete ${project.title}`,
        projectTitle: project.title,
        dueDate: Timestamp.fromDate(dueDate),
        priority: (participation.progress < 50 ? 'high' : participation.progress < 80 ? 'medium' : 'low') as 'high' | 'medium' | 'low'
      });
    }
  }
  
  return {
    activeProjects,
    completedProjects,
    totalHours,
    certificates,
    recentActivity: finalRecentActivity,
    upcomingDeadlines
  };
}

export async function getTeacherDashboard(teacherId: string): Promise<TeacherDashboard> {
  // Get all students that this teacher supervises
  // For now, we'll use a simple approach where teachers can see all students
  // In a real system, you would have a teacher-student relationship collection
  
  // Get all participations to see student activities
  const allParticipations = await getParticipations({});

  // Get unique students supervised
  const uniqueStudentIds = new Set(allParticipations.map(p => p.studentId));
  const studentsSupervised = uniqueStudentIds.size;

  // Get unique projects supervised
  const uniqueProjectIds = new Set(allParticipations.map(p => p.projectId));
  const projectsSupervised = uniqueProjectIds.size;

  // Get submissions for review using the new function
  const allSubmissions = await getSubmissions({ status: 'pending' });
  const pendingReviews = allSubmissions.length;

  // Get recent submissions (all submissions, not just pending)
  const recentSubmissions = await getSubmissions({});

  return {
    studentsSupervised,
    projectsSupervised,
    pendingReviews,
    recentSubmissions: recentSubmissions.slice(0, 10) // Return top 10 recent submissions
  };
}

// Submission operations
export async function createSubmission(submissionData: Omit<Submission, 'id' | 'submittedAt'>) {
  const submissionDoc = await addDoc(collection(db, 'submissions'), {
    ...submissionData,
    submittedAt: Timestamp.now()
  });
  return submissionDoc.id;
}

export async function getSubmissions(filters?: {
  participationId?: string;
  projectId?: string;
  studentId?: string;
  status?: string;
}): Promise<Submission[]> {
  let q = query(collection(db, 'submissions'), orderBy('submittedAt', 'desc'));
  
  if (filters?.participationId) {
    q = query(q, where('participationId', '==', filters.participationId));
  }
  
  if (filters?.projectId) {
    q = query(q, where('projectId', '==', filters.projectId));
  }
  
  if (filters?.studentId) {
    q = query(q, where('studentId', '==', filters.studentId));
  }
  
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
}

export async function updateSubmission(submissionId: string, submissionData: Partial<Submission>) {
  // Remove undefined values to avoid Firebase errors
  const cleanData = Object.fromEntries(
    Object.entries(submissionData).filter(([_, value]) => value !== undefined)
  );
  
  await updateDoc(doc(db, 'submissions', submissionId), {
    ...cleanData,
    reviewedAt: Timestamp.now()
  });
}

// Helper function to create sample data for testing
export async function createSampleSubmissions() {
  const sampleSubmissions = [
    {
      participationId: 'sample-participation-1',
      projectId: 'sample-project-1',
      studentId: 'sample-student-1',
      studentName: 'John Smith',
      content: 'I have completed the community survey and analyzed the water quality data from 5 different sources. The results show significant variations in pH levels across different areas of the community. I found that areas closer to the industrial district have lower pH levels, indicating potential contamination. I recommend implementing additional filtration systems in these areas.',
      status: 'pending' as const
    },
    {
      participationId: 'sample-participation-2',
      projectId: 'sample-project-2',
      studentId: 'sample-student-2',
      studentName: 'Emily Johnson',
      content: 'Created a mobile app prototype for connecting restaurants with food banks. The app includes features for inventory management, real-time notifications, and route optimization for food pickup. I conducted user testing with 3 local restaurants and received positive feedback. The next step is to integrate with food bank databases.',
      status: 'pending' as const
    },
    {
      participationId: 'sample-participation-3',
      projectId: 'sample-project-3',
      studentId: 'sample-student-3',
      studentName: 'Michael Brown',
      content: 'Conducted 10 training sessions with seniors aged 65+ on basic smartphone usage. Created easy-to-follow video tutorials covering WhatsApp, email, and video calling. 85% of participants showed significant improvement in digital literacy skills. Developed a simple reference guide that participants can keep.',
      status: 'approved' as const,
      reviewComment: 'Excellent work! Your approach to training seniors was very thoughtful and the results speak for themselves.',
      rating: 5
    }
  ];

  for (const submission of sampleSubmissions) {
    await createSubmission(submission);
  }
}

// Get all users by role
export async function getUsersByRole(role: UserRole): Promise<User[]> {
  const q = query(collection(db, 'users'), where('role', '==', role));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
}

// Certificate operations
export async function createCertificate(certificateData: Omit<Certificate, 'id' | 'issuedAt' | 'certificateNumber'>) {
  const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  
  const certificateDoc = await addDoc(collection(db, 'certificates'), {
    ...certificateData,
    certificateNumber,
    issuedAt: Timestamp.now()
  });
  
  return { id: certificateDoc.id, certificateNumber };
}

export async function getCertificates(filters?: {
  studentId?: string;
  ngoId?: string;
  projectId?: string;
  participationId?: string;
}): Promise<Certificate[]> {
  let q = query(collection(db, 'certificates'), orderBy('issuedAt', 'desc'));
  
  if (filters?.studentId) {
    q = query(q, where('studentId', '==', filters.studentId));
  }
  
  if (filters?.ngoId) {
    q = query(q, where('ngoId', '==', filters.ngoId));
  }
  
  if (filters?.projectId) {
    q = query(q, where('projectId', '==', filters.projectId));
  }
  
  if (filters?.participationId) {
    q = query(q, where('participationId', '==', filters.participationId));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Certificate));
}

export async function getCompletedProjectsForNGO(ngoId: string) {
  // Get NGO's projects
  const projects = await getProjects({ ngoId });
  
  const completedProjects = [];
  
  for (const project of projects) {
    // Get participations for this project that are completed
    const participations = await getParticipations({ projectId: project.id, status: 'completed' });
    
    for (const participation of participations) {
      // Get submissions for this participation that are approved
      const submissions = await getSubmissions({ participationId: participation.id, status: 'approved' });
      
      if (submissions.length > 0) {
        const student = await getUser(participation.studentId);
        if (student) {
          // Check if certificate already exists
          const existingCerts = await getCertificates({ 
            participationId: participation.id 
          });
          
          completedProjects.push({
            participation,
            project,
            student,
            submission: submissions[0], // Latest approved submission
            hasCertificate: existingCerts.length > 0,
            certificate: existingCerts[0] || null
          });
        }
      }
    }
  }
  
  return completedProjects;
} 