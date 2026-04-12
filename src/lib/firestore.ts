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
  increment,
  runTransaction
} from "firebase/firestore";
import { db, storage } from "./firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  generateCertificateNumber,
  generateInviteCode,
  normalizeInviteCode,
} from "./identifier-utils";
import { buildParticipationWriteData } from "./participation-payload";
import {
  User,
  Project,
  Participation,
  Submission,
  UserRole,
  NGODashboard,
  StudentDashboard,
  TeacherDashboard,
  Certificate,
  Class,
  ClassDashboard,
  StudentWithClass
} from "./types";
import {
  buildTeacherDashboardData,
} from "./ngo-review-utils";
import {
  buildSubmissionUpdateData,
} from "./submission-review-utils";
import { buildCertificatePersistencePlan } from "./certificate-access-utils";
import { fromIsoTimestamp } from "./timestamp-serialization";

async function fetchInternalJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    ...init,
  });

  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return data;
}

type SerializedUser = Omit<User, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

type SerializedProject = Omit<Project, "createdAt" | "updatedAt" | "deadline"> & {
  createdAt: string;
  updatedAt: string;
  deadline: string | null;
};

type SerializedCertificate = Omit<Certificate, "issuedAt" | "completionDate"> & {
  issuedAt: string;
  completionDate: string;
};

export type StudentProjectParticipationSummary = Pick<
  Participation,
  "id" | "projectId" | "status" | "progress"
>;

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
export async function createParticipation(participationData: Omit<Participation, 'id' | 'joinedAt' | 'chatHistory' | 'submissions' | 'createdAt' | 'updatedAt'>) {
  const batch = writeBatch(db);
  
  // 获取学生信息以获取班级ID
  let classId: string | undefined = undefined;
  if (participationData.studentId) {
    const student = await getUser(participationData.studentId);
    if (student?.classId) {
      classId = student.classId;
    }
  }
  
  // Create participation
  const participationRef = doc(collection(db, 'participations'));
  const now = Timestamp.now();
  batch.set(participationRef, buildParticipationWriteData(participationData, {
    classId,
    now,
  }));
  
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

// Get a specific participation by project ID and student ID
export async function getParticipationByProjectAndStudent(projectId: string, studentId: string): Promise<Participation | null> {
  const q = query(
    collection(db, 'participations'),
    where('projectId', '==', projectId),
    where('studentId', '==', studentId),
    limit(1) // Should only be one or none
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const participationDoc = snapshot.docs[0];
    return { id: participationDoc.id, ...participationDoc.data() } as Participation;
  }
  return null;
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
    
    // Delete the participation completely
    batch.delete(doc(db, 'participations', participationId));
    
    // Also delete any submissions related to this participation
    const submissionsQuery = query(
      collection(db, 'submissions'),
      where('participationId', '==', participationId),
      where('studentId', '==', participation.studentId),
    );
    const submissionsSnapshot = await getDocs(submissionsQuery);
    submissionsSnapshot.docs.forEach(submissionDoc => {
      batch.delete(submissionDoc.ref);
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
export async function getNGODashboard(_ngoId: string): Promise<NGODashboard> {
  return fetchInternalJson<NGODashboard>("/api/ngo/dashboard");
}

export async function getStudentDashboard(studentId: string): Promise<StudentDashboard> {
  const data = await fetchInternalJson<{
    activeProjects: number;
    completedProjects: number;
    totalHours: number;
    certificates: number;
    recentActivity: Array<StudentDashboard["recentActivity"][number] & { timestamp: string }>;
    upcomingDeadlines: Array<StudentDashboard["upcomingDeadlines"][number] & { dueDate: string }>;
    promptQualityMetrics?: Omit<
      NonNullable<StudentDashboard["promptQualityMetrics"]>,
      "recentPrompts"
    > & {
      recentPrompts: Array<
        Omit<NonNullable<StudentDashboard["promptQualityMetrics"]>["recentPrompts"][number], "timestamp"> & {
          timestamp: string;
        }
      >;
    };
  }>("/api/student/dashboard");

  return {
    ...data,
    recentActivity: data.recentActivity.map((activity) => ({
      ...activity,
      timestamp: fromIsoTimestamp(activity.timestamp)!,
    })),
    upcomingDeadlines: data.upcomingDeadlines.map((deadline) => ({
      ...deadline,
      dueDate: fromIsoTimestamp(deadline.dueDate)!,
    })),
    promptQualityMetrics: data.promptQualityMetrics
      ? {
          ...data.promptQualityMetrics,
          recentPrompts: data.promptQualityMetrics.recentPrompts.map((prompt) => ({
            ...prompt,
            timestamp: new Date(prompt.timestamp),
          })),
        }
      : undefined,
  };
}

export async function getStudentProjectsCatalog(): Promise<{
  projects: Project[];
  participations: StudentProjectParticipationSummary[];
  userParticipationProjectIds: string[];
}> {
  const data = await fetchInternalJson<{
    projects: SerializedProject[];
    participations: StudentProjectParticipationSummary[];
    userParticipationProjectIds: string[];
  }>("/api/student/projects");

  return {
    ...data,
    projects: data.projects.map((project) => ({
      ...project,
      createdAt: fromIsoTimestamp(project.createdAt)!,
      updatedAt: fromIsoTimestamp(project.updatedAt)!,
      deadline: fromIsoTimestamp(project.deadline ?? project.updatedAt)!,
    })),
  };
}

export async function getStudentCertificatesData(): Promise<Certificate[]> {
  const data = await fetchInternalJson<{
    certificates: SerializedCertificate[];
  }>("/api/student/certificates");

  return data.certificates.map((certificate) => ({
    ...certificate,
    issuedAt: fromIsoTimestamp(certificate.issuedAt)!,
    completionDate: fromIsoTimestamp(certificate.completionDate)!,
  }));
}

export async function getStudentProfileData(): Promise<{
  user: User | null;
  dashboard: StudentDashboard;
}> {
  const data = await fetchInternalJson<{
    user: SerializedUser | null;
    dashboard: {
      activeProjects: number;
      completedProjects: number;
      totalHours: number;
      certificates: number;
      recentActivity: Array<StudentDashboard["recentActivity"][number] & { timestamp: string }>;
      upcomingDeadlines: Array<StudentDashboard["upcomingDeadlines"][number] & { dueDate: string }>;
      promptQualityMetrics?: Omit<
        NonNullable<StudentDashboard["promptQualityMetrics"]>,
        "recentPrompts"
      > & {
        recentPrompts: Array<
          Omit<NonNullable<StudentDashboard["promptQualityMetrics"]>["recentPrompts"][number], "timestamp"> & {
            timestamp: string;
          }
        >;
      };
    };
  }>("/api/student/profile");

  return {
    user: data.user
      ? {
          ...data.user,
          createdAt: fromIsoTimestamp(data.user.createdAt)!,
          updatedAt: fromIsoTimestamp(data.user.updatedAt)!,
        }
      : null,
    dashboard: {
      ...data.dashboard,
      recentActivity: data.dashboard.recentActivity.map((activity) => ({
        ...activity,
        timestamp: fromIsoTimestamp(activity.timestamp)!,
      })),
      upcomingDeadlines: data.dashboard.upcomingDeadlines.map((deadline) => ({
        ...deadline,
        dueDate: fromIsoTimestamp(deadline.dueDate)!,
      })),
      promptQualityMetrics: data.dashboard.promptQualityMetrics
        ? {
            ...data.dashboard.promptQualityMetrics,
            recentPrompts: data.dashboard.promptQualityMetrics.recentPrompts.map((prompt) => ({
              ...prompt,
              timestamp: new Date(prompt.timestamp),
            })),
          }
        : undefined,
    },
  };
}

export async function getTeacherDashboard(teacherId: string): Promise<TeacherDashboard> {
  const projects = await getProjects({ ngoId: teacherId });
  const projectParticipations = await Promise.all(
    projects.map((project) => getParticipations({ projectId: project.id }))
  );
  const submissions = await getSubmissionsForNgo(teacherId);
  return buildTeacherDashboardData({
    projects,
    participations: projectParticipations.flat(),
    submissions,
  });
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
  classId?: string; // 添加班级过滤
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
  let submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
  
  // 如果需要按班级过滤，我们需要获取参与记录来检查班级ID
  if (filters?.classId) {
    const filteredSubmissions = [];
    for (const submission of submissions) {
      const participation = await getParticipation(submission.participationId);
      if (participation?.classId === filters.classId) {
        filteredSubmissions.push(submission);
      }
    }
    submissions = filteredSubmissions;
  }
  
  return submissions;
}

export async function updateSubmission(submissionId: string, submissionData: Partial<Submission>) {
  await updateDoc(
    doc(db, 'submissions', submissionId),
    buildSubmissionUpdateData(submissionData, Timestamp.now())
  );
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

export async function getUsers(): Promise<User[]> {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
}

// Certificate operations
export async function createCertificate(certificateData: Omit<Certificate, 'id' | 'issuedAt' | 'certificateNumber'>) {
  const existingCertificates = await getCertificates({
    participationId: certificateData.participationId,
    ngoId: certificateData.ngoId,
  });
  const latestExistingCertificate = existingCertificates[0] ?? null;
  const plan = buildCertificatePersistencePlan({
    participationId: certificateData.participationId,
    generatedCertificateNumber: generateCertificateNumber(),
    existingCertificate: latestExistingCertificate
      ? {
          id: latestExistingCertificate.id,
          certificateNumber: latestExistingCertificate.certificateNumber,
        }
      : null,
  });

  if (!plan.shouldCreate) {
    return {
      id: plan.documentId,
      certificateNumber: plan.certificateNumber,
    };
  }

  const certificateRef = doc(db, 'certificates', plan.documentId);
  let persistedCertificateNumber = plan.certificateNumber;

  await runTransaction(db, async (transaction) => {
    const existingCertificateDoc = await transaction.get(certificateRef);

    if (existingCertificateDoc.exists()) {
      const existingCertificate = existingCertificateDoc.data() as Certificate;
      persistedCertificateNumber = existingCertificate.certificateNumber;
      return;
    }

    transaction.set(certificateRef, {
      ...certificateData,
      certificateNumber: persistedCertificateNumber,
      issuedAt: Timestamp.now(),
    });
  });

  return { id: plan.documentId, certificateNumber: persistedCertificateNumber };
}

export async function getCertificate(certificateId: string): Promise<Certificate | null> {
  const certificateDoc = await getDoc(doc(db, 'certificates', certificateId));
  if (certificateDoc.exists()) {
    return { id: certificateDoc.id, ...certificateDoc.data() } as Certificate;
  }
  return null;
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

export async function getCompletedProjectsForNGO(_ngoId: string) {
  const records = await fetchInternalJson<
    Array<{
      participation: Participation & { completedAt?: string | null };
      project: Project;
      student: { id: string; name: string };
      submission: Submission & { submittedAt: string; reviewedAt?: string | null };
      hasCertificate: boolean;
      certificate: (Certificate & {
        issuedAt?: string | null;
        completionDate?: string | null;
      }) | null;
    }>
  >("/api/ngo/certificates/completed-projects");

  return records.map((record) => ({
    ...record,
    participation: {
      ...record.participation,
      ...(record.participation.completedAt
        ? { completedAt: fromIsoTimestamp(record.participation.completedAt) }
        : {}),
    },
    submission: {
      ...record.submission,
      submittedAt: fromIsoTimestamp(record.submission.submittedAt)!,
      reviewedAt: fromIsoTimestamp(record.submission.reviewedAt),
    },
    certificate: record.certificate
      ? {
          ...record.certificate,
          issuedAt: fromIsoTimestamp(record.certificate.issuedAt),
          completionDate: fromIsoTimestamp(record.certificate.completionDate),
        }
      : null,
  }));
}

// Add a new function to delete a user account and handle associated data
export async function deleteUserAccount(userId: string) {
  await fetchInternalJson<{ success: true }>("/api/account/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId }),
  });
}

// Add a function to upload a profile picture and update user avatar
export async function uploadProfilePicture(userId: string, file: File): Promise<string> {
  // Create a storage reference
  const storageRef = ref(storage, `profile_pictures/${userId}`);
  
  // Upload file to Firebase Storage
  const uploadTask = uploadBytesResumable(storageRef, file);
  
  // Wait for upload to complete
  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Progress tracking if needed
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
      },
      (error) => {
        // Handle errors
        reject(error);
      },
      async () => {
        // Upload completed successfully, get the download URL
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Update user document with new avatar URL
          await updateUser(userId, { avatar: downloadURL });
          
          resolve(downloadURL);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

// Automatically update project statuses based on deadlines and business rules
export async function updateProjectStatuses() {
  try {
    const now = Timestamp.now();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoTimestamp = Timestamp.fromDate(thirtyDaysAgo);
    
    const batch = writeBatch(db);
    const statusChanges = {
      completed: 0,
      archived: 0,
      errors: 0
    };
    
    // Get all published projects to check for completion
    const publishedProjectsQuery = query(
      collection(db, 'projects'),
      where('status', '==', 'published')
    );
    const publishedProjectsSnapshot = await getDocs(publishedProjectsQuery);
    
    for (const doc of publishedProjectsSnapshot.docs) {
      const project = { id: doc.id, ...doc.data() } as Project;
      
      // Check if deadline has passed
      if (project.deadline && project.deadline.toMillis() < now.toMillis()) {
        console.log(`Marking project ${project.id} (${project.title}) as completed due to passed deadline`);
        batch.update(doc.ref, { 
          status: 'completed',
          updatedAt: now
        });
        statusChanges.completed++;
      }
    }
    
    // Get all completed projects to check for archiving
    const completedProjectsQuery = query(
      collection(db, 'projects'),
      where('status', '==', 'completed')
    );
    const completedProjectsSnapshot = await getDocs(completedProjectsQuery);
    
    for (const doc of completedProjectsSnapshot.docs) {
      const project = { id: doc.id, ...doc.data() } as Project;
      
      // Archive completed projects after 30 days
      if (project.updatedAt && project.updatedAt.toMillis() < thirtyDaysAgoTimestamp.toMillis()) {
        console.log(`Archiving project ${project.id} (${project.title}) as it's been completed for over 30 days`);
        batch.update(doc.ref, {
          status: 'archived',
          updatedAt: now
        });
        statusChanges.archived++;
      }
    }
    
    // Handle orphaned projects (NGO deleted but project still exists)
    // Note: We preserve the projects but still follow the normal lifecycle
    const orphanedProjectsQuery = query(
      collection(db, 'projects'),
      where('status', '==', 'published')
    );
    const orphanedProjectsSnapshot = await getDocs(orphanedProjectsQuery);
    
    for (const doc of orphanedProjectsSnapshot.docs) {
      const project = { id: doc.id, ...doc.data() } as Project;
      
      // Check if the NGO still exists
      const ngoExists = await getUser(project.ngoId);
      
      if (!ngoExists) {
        // Don't delete the project - just mark it for reference
        // This ensures students can still complete their work
        console.log(`Project ${project.id} (${project.title}) is orphaned (NGO deleted)`);
        
        // If deadline has passed, still mark as completed
        if (project.deadline && project.deadline.toMillis() < now.toMillis()) {
          console.log(`Marking orphaned project ${project.id} as completed due to passed deadline`);
          batch.update(doc.ref, { 
            status: 'completed',
            updatedAt: now
          });
          statusChanges.completed++;
        }
      }
    }
    
    // Commit all updates
    if (statusChanges.completed > 0 || statusChanges.archived > 0) {
      await batch.commit();
      console.log(`Project status updates completed: ${statusChanges.completed} completed, ${statusChanges.archived} archived`);
    } else {
      console.log('No project status updates needed');
    }
    
    return { 
      success: true, 
      updatedAt: now.toDate(),
      changes: statusChanges
    };
  } catch (error) {
    console.error('Error updating project statuses:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      updatedAt: new Date()
    };
  }
}

// Modify handleStatusChange to enforce logical project lifecycle rules
export async function handleStatusChange(projectId: string, newStatus: Project['status'], oldStatus: Project['status']) {
  // Get the project to check current status
  const project = await getProject(projectId);
  
  if (!project) {
    throw new Error('Project not found');
  }
  
  // Validate status changes based on business rules
  if (oldStatus === 'published' && newStatus === 'draft') {
    throw new Error('Published projects cannot be moved back to draft status');
  }
  
  // Prevent manual completion - projects are completed automatically when deadline is reached
  if (newStatus === 'completed') {
    throw new Error('Projects are automatically marked as completed when their deadline is reached. Manual completion is not allowed.');
  }
  
  // Only completed projects can be archived
  if (newStatus === 'archived' && oldStatus !== 'completed') {
    throw new Error('Only completed projects can be archived');
  }
  
  // Archived projects cannot change status - it's a final state
  if (oldStatus === 'archived') {
    throw new Error('Archived projects cannot be changed to any other status');
  }
  
  // If publishing a draft project, ensure it has the necessary fields
  if (oldStatus === 'draft' && newStatus === 'published') {
    if (!project.deadline) {
      throw new Error('Project must have a deadline before it can be published');
    }
    
    if (!project.subtasks || project.subtasks.length === 0) {
      throw new Error('Project must have at least one subtask before it can be published');
    }
  }
  
  // Update the project with the new status
  await updateProject(projectId, { status: newStatus });
  
  return { success: true, status: newStatus };
}

/**
 * Saves a prompt quality evaluation to a student's participation record and updates their streak
 * @param participationId - The ID of the participation record
 * @param subtaskId - The ID of the subtask
 * @param evaluation - Object containing evaluation scores and prompt text
 * @param feedback - Optional object containing personalized feedback
 * @returns Object containing current streak, best streak, and whether the prompt was good
 */
export async function savePromptEvaluation(
  participationId: string,
  subtaskId: string,
  evaluation: {
    goalScore: number;
    contextScore: number;
    expectationsScore: number;
    sourceScore: number;
    overallScore: number;
    prompt: string;
  },
  feedback?: {
    feedback?: string;
  }
) {
  try {
    // Get reference to the participation document
    const participationRef = doc(db, 'participations', participationId);
    
    // Start a transaction to ensure data consistency
    return await runTransaction(db, async (transaction) => {
      const participationDoc = await transaction.get(participationRef);
      
      if (!participationDoc.exists()) {
        throw new Error('Participation document not found');
      }
      
      const participationData = participationDoc.data() as Participation;
      
      // Initialize promptEvaluations if it doesn't exist
      const promptEvaluations = participationData.promptEvaluations || {};
      const subtaskEvaluations = promptEvaluations[subtaskId] || [];
      
      // Determine if this is a good prompt (score >= 70)
      const isGoodPrompt = evaluation.overallScore >= 70;
      
      // Calculate the current streak
      let currentStreak = 0;
      let bestStreak = 0;
      
      if (subtaskEvaluations.length > 0) {
        // Get the previous evaluation's streak and best streak
        const previousEval = subtaskEvaluations[subtaskEvaluations.length - 1];
        currentStreak = previousEval.streak || 0;
        bestStreak = previousEval.bestStreak || 0;
        
        // Update streak based on current evaluation
        if (isGoodPrompt) {
          currentStreak += 1;
          // Update best streak if current streak is better
          bestStreak = Math.max(currentStreak, bestStreak);
        } else {
          // Reset streak if the prompt wasn't good
          currentStreak = 0;
        }
      } else if (isGoodPrompt) {
        // First evaluation and it's good
        currentStreak = 1;
        bestStreak = 1;
      }
      
      // Create the new evaluation object with timestamp and streak info
      const newEvaluation = {
        ...evaluation,
        timestamp: Timestamp.now(),
        streak: currentStreak,
        bestStreak: bestStreak,
        feedback: feedback || null // Include personalized feedback if provided
      };
      
      // Add the new evaluation to the array
      subtaskEvaluations.push(newEvaluation);
      
      // Update the prompt evaluations in the participation document
      promptEvaluations[subtaskId] = subtaskEvaluations;
      
      // Update the document
      transaction.update(participationRef, {
        promptEvaluations: promptEvaluations
      });
      
      // Return streak information
      return {
        currentStreak,
        bestStreak,
        isGoodPrompt
      };
    });
  } catch (error) {
    console.error('Error saving prompt evaluation:', error);
    throw error;
  }
}

// ==================== 班级相关操作 ====================

// 过滤掉undefined值的helper函数
function filterUndefinedValues(obj: any): any {
  const filtered: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      filtered[key] = obj[key];
    }
  }
  return filtered;
}

// 创建班级
export async function createClass(classData: Omit<Class, 'id' | 'createdAt' | 'updatedAt' | 'inviteCode' | 'studentIds'>): Promise<string> {
  let inviteCode = generateInviteCode();
  
  // 确保邀请码唯一
  while (await getClassByInviteCode(inviteCode)) {
    inviteCode = generateInviteCode();
  }
  
  const now = Timestamp.now();
  const classDoc = await addDoc(collection(db, 'classes'), {
    ...filterUndefinedValues(classData),
    inviteCode,
    studentIds: [],
    createdAt: now,
    updatedAt: now
  });
  
  // 更新教师的班级列表
  const teacher = await getUser(classData.teacherId);
  if (teacher) {
    const teacherClassIds = teacher.classIds || [];
    await updateUser(classData.teacherId, {
      classIds: [...teacherClassIds, classDoc.id]
    });
  }
  
  return classDoc.id;
}

// 获取班级信息
export async function getClass(classId: string): Promise<Class | null> {
  const classDoc = await getDoc(doc(db, 'classes', classId));
  if (classDoc.exists()) {
    return { id: classDoc.id, ...classDoc.data() } as Class;
  }
  return null;
}

// 通过邀请码获取班级
export async function getClassByInviteCode(inviteCode: string): Promise<Class | null> {
  const normalizedCode = normalizeInviteCode(inviteCode);
  if (!normalizedCode) {
    return null;
  }

  const q = query(collection(db, 'classes'), where('inviteCode', '==', normalizedCode));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const classDoc = snapshot.docs[0];
    return { id: classDoc.id, ...classDoc.data() } as Class;
  }
  return null;
}

// 获取教师的班级列表
export async function getClassesByTeacher(teacherId: string): Promise<Class[]> {
  const q = query(
    collection(db, 'classes'),
    where('teacherId', '==', teacherId),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class));
}

// 学生加入班级
export async function joinClass(studentId: string, inviteCode: string): Promise<{ success: boolean; message: string; classId?: string }> {
  try {
    const normalizedCode = normalizeInviteCode(inviteCode);

    if (!normalizedCode) {
      return { success: false, message: '邀请码无效' };
    }

    // 检查邀请码是否有效
    const classData = await getClassByInviteCode(normalizedCode);
    if (!classData) {
      return { success: false, message: '邀请码无效' };
    }
    
    if (!classData.isActive) {
      return { success: false, message: '班级已停用' };
    }
    
    // 检查学生是否已经在班级中
    if (classData.studentIds.includes(studentId)) {
      return { success: false, message: '您已经在这个班级中了' };
    }
    
    // 检查班级人数限制
    if (classData.maxStudents && classData.studentIds.length >= classData.maxStudents) {
      return { success: false, message: '班级人数已满' };
    }
    
    // 获取学生信息
    const student = await getUser(studentId);
    if (!student) {
      return { success: false, message: '学生信息不存在' };
    }
    
    // 如果学生已经在其他班级，先退出
    if (student.classId) {
      await leaveClass(studentId, student.classId);
    }
    
    // 使用事务更新班级和学生信息
    await runTransaction(db, async (transaction) => {
      const classRef = doc(db, 'classes', classData.id);
      const studentRef = doc(db, 'users', studentId);
      
      // 更新班级学生列表
      transaction.update(classRef, {
        studentIds: [...classData.studentIds, studentId],
        updatedAt: Timestamp.now()
      });
      
      // 更新学生的班级ID
      transaction.update(studentRef, {
        classId: classData.id,
        updatedAt: Timestamp.now()
      });
    });
    
    return { success: true, message: '成功加入班级', classId: classData.id };
  } catch (error) {
    console.error('Error joining class:', error);
    return { success: false, message: '加入班级失败，请重试' };
  }
}

// 学生离开班级
export async function leaveClass(studentId: string, classId: string): Promise<{ success: boolean; message: string }> {
  try {
    const classData = await getClass(classId);
    if (!classData) {
      return { success: false, message: '班级不存在' };
    }
    
    // 使用事务更新班级和学生信息
    await runTransaction(db, async (transaction) => {
      const classRef = doc(db, 'classes', classId);
      const studentRef = doc(db, 'users', studentId);
      
      // 从班级学生列表中移除学生
      const updatedStudentIds = classData.studentIds.filter(id => id !== studentId);
      transaction.update(classRef, {
        studentIds: updatedStudentIds,
        updatedAt: Timestamp.now()
      });
      
      // 清除学生的班级ID
      transaction.update(studentRef, {
        classId: null,
        updatedAt: Timestamp.now()
      });
    });
    
    return { success: true, message: '成功离开班级' };
  } catch (error) {
    console.error('Error leaving class:', error);
    return { success: false, message: '离开班级失败，请重试' };
  }
}

// 获取班级的学生列表（包含详细信息）
export async function getStudentsByClass(classId: string): Promise<StudentWithClass[]> {
  const classData = await getClass(classId);
  if (!classData) {
    return [];
  }
  
  const students: StudentWithClass[] = [];
  for (const studentId of classData.studentIds) {
    const student = await getUser(studentId);
    if (student) {
      // 获取学生的参与记录
      const participations = await getParticipations({ studentId });
      students.push({
        ...student,
        class: classData,
        participations
      });
    }
  }
  
  return students;
}

// 获取班级仪表板数据
export async function getClassDashboard(classId: string): Promise<ClassDashboard> {
  const classData = await getClass(classId);
  if (!classData) {
    throw new Error('班级不存在');
  }
  
  const totalStudents = classData.studentIds.length;
  
  // 获取班级所有学生的参与记录
  const allParticipations = await Promise.all(
    classData.studentIds.map(studentId => getParticipations({ studentId }))
  );
  const flatParticipations = allParticipations.flat();
  
  // 计算活跃项目数和完成项目数
  const activeProjects = flatParticipations.filter(p => p.status === 'active').length;
  const completedProjects = flatParticipations.filter(p => p.status === 'completed').length;
  
  // 获取待审核的提交
  const allSubmissions = await Promise.all(
    flatParticipations.map(p => getSubmissions({ participationId: p.id }))
  );
  const flatSubmissions = allSubmissions.flat();
  const pendingSubmissions = flatSubmissions.filter(s => s.status === 'pending').length;
  
  // 获取最近的活动（简化版）
  const recentActivities = flatParticipations
    .sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis())
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      type: 'project_joined' as const,
      title: '学生加入项目',
      description: `${p.studentName} 加入了项目`,
      timestamp: p.joinedAt
    }));
  
  return {
    totalStudents,
    activeProjects,
    completedProjects,
    pendingSubmissions,
    recentActivities
  };
}

// 更新班级信息
export async function updateClass(classId: string, classData: Partial<Class>): Promise<void> {
  await updateDoc(doc(db, 'classes', classId), {
    ...filterUndefinedValues(classData),
    updatedAt: Timestamp.now()
  });
}

// 删除班级
export async function deleteClass(classId: string): Promise<{ success: boolean; message: string }> {
  try {
    const classData = await getClass(classId);
    if (!classData) {
      return { success: false, message: '班级不存在' };
    }
    
    // 使用事务删除班级并更新相关数据
    await runTransaction(db, async (transaction) => {
      const classRef = doc(db, 'classes', classId);
      
      // 清除所有学生的班级关联
      for (const studentId of classData.studentIds) {
        const studentRef = doc(db, 'users', studentId);
        transaction.update(studentRef, {
          classId: null,
          updatedAt: Timestamp.now()
        });
      }
      
      // 清除教师的班级关联
      const teacherRef = doc(db, 'users', classData.teacherId);
      const teacher = await getUser(classData.teacherId);
      if (teacher && teacher.classIds) {
        const updatedClassIds = teacher.classIds.filter(id => id !== classId);
        transaction.update(teacherRef, {
          classIds: updatedClassIds,
          updatedAt: Timestamp.now()
        });
      }
      
      // 删除班级
      transaction.delete(classRef);
    });
    
    return { success: true, message: '班级删除成功' };
  } catch (error) {
    console.error('Error deleting class:', error);
    return { success: false, message: '删除班级失败，请重试' };
  }
}

// 获取教师班级的所有提交（用于审核页面）
export async function getSubmissionsForTeacher(teacherId: string): Promise<Submission[]> {
  return getSubmissionsForNgo(teacherId);
} 

export async function getSubmissionsForNgo(_ngoId: string): Promise<Submission[]> {
  const submissions = await fetchInternalJson<
    Array<Submission & {
      projectTitle?: string;
      participationProgress?: number;
      githubRepo?: string;
      submittedAt: string;
      reviewedAt?: string | null;
    }>
  >("/api/ngo/submissions");

  return submissions.map((submission) => ({
    ...submission,
    submittedAt: fromIsoTimestamp(submission.submittedAt)!,
    reviewedAt: fromIsoTimestamp(submission.reviewedAt),
  }));
}

export async function reviewSubmissionForNgo(
  submissionId: string,
  input: {
    status: "approved" | "rejected" | "needs_revision";
    reviewComment?: string;
    rating?: number;
  },
) {
  return fetchInternalJson<{ success: boolean }>(
    `/api/ngo/submissions/${submissionId}/review`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
}
