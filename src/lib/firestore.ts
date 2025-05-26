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
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
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
import { calculateEstimatedHours } from './utils';

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
  
  // Create participation
  const participationRef = doc(collection(db, 'participations'));
  batch.set(participationRef, {
    ...participationData,
    joinedAt: Timestamp.now(),
    chatHistory: [],
    submissions: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
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
  
  // Calculate total hours (from completed tasks, not just completed projects)
  let totalHours = 0;
  
  // Process all participations to sum up hours from completed tasks
  for (const participation of participations) {
    const project = await getProject(participation.projectId);
    if (!project || !project.subtasks) continue;
    
    // Get completed subtasks for this participation
    const completedSubtasks = participation.completedSubtasks || [];
    
    // Sum hours only for completed subtasks
    for (const subtask of project.subtasks) {
      if (completedSubtasks.includes(subtask.id) && subtask.estimatedHours) {
        totalHours += subtask.estimatedHours;
      }
    }
  }
  
  // Get certificates count
  const certificatesSnapshot = await getDocs(
    query(collection(db, 'certificates'), where('studentId', '==', studentId))
  );
  const certificates = certificatesSnapshot.size;
  
  // Get recent activity from various sources
  const recentActivity = [];

  // 1. Add activities from project joins
  for (const participation of participations.slice(0, 5)) {
    const project = await getProject(participation.projectId);
    if (project) {
      recentActivity.push({
        id: `join-${participation.id}`,
        type: 'project_joined' as const,
        title: `Joined ${project.title}`,
        description: `You joined a project by ${project.ngoName}`,
        timestamp: participation.joinedAt
      });
    }
  }

  // 2. Add activities from completed subtasks
  for (const participation of participations) {
    const project = await getProject(participation.projectId);
    if (!project || !project.subtasks) continue;
    
    // Get completed subtasks for this participation
    const completedSubtasks = participation.completedSubtasks || [];
    
    // Add activities for recently completed subtasks (last 5)
    if (participation.evaluationHistory) {
      for (const [subtaskId, evaluations] of Object.entries(participation.evaluationHistory)) {
        if (!evaluations || !evaluations.length) continue;
        
        // Sort evaluations by timestamp (newest first)
        const sortedEvals = [...evaluations].sort((a, b) => 
          b.timestamp.toMillis() - a.timestamp.toMillis()
        );
        
        // Get only the latest evaluation with score >= 80 (successful)
        const latestSuccessful = sortedEvals.find(evaluation => evaluation.score >= 80);
        
        if (latestSuccessful && completedSubtasks.includes(subtaskId)) {
          const subtask = project.subtasks.find(st => st.id === subtaskId);
          if (subtask) {
            recentActivity.push({
              id: `complete-${participation.id}-${subtaskId}`,
              type: 'subtask_completed' as const,
              title: `Completed "${subtask.title}"`,
              description: `You completed a task in ${project.title} with a score of ${latestSuccessful.score}%`,
              timestamp: latestSuccessful.timestamp
            });
          }
        }
      }
    }
  }

  // 3. Add activities from submissions
  const studentSubmissions = await getSubmissions({ studentId });
  for (const submission of studentSubmissions.slice(0, 5)) {
    const project = await getProject(submission.projectId);
    if (project) {
      recentActivity.push({
        id: `submission-${submission.id}`,
        type: 'submission_made' as const,
        title: `Submitted work for ${project.title}`,
        description: submission.status === 'pending' 
          ? `Your submission is awaiting review` 
          : `Your submission was ${submission.status}`,
        timestamp: submission.submittedAt
      });
    }
  }

  // 4. Add activities from certificates
  const studentCertificates = await getCertificates({ studentId });
  for (const certificate of studentCertificates.slice(0, 3)) {
    recentActivity.push({
      id: `certificate-${certificate.id}`,
      type: 'certificate_earned' as const,
      title: `Earned Certificate for ${certificate.projectTitle}`,
      description: `You received a certificate for completing the project`,
      timestamp: certificate.issuedAt
    });
  }
  
  // Remove previously added activities since we now get them from other sources
  // Sort by timestamp and limit to 5 most recent
  recentActivity.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
  const finalRecentActivity = recentActivity.slice(0, 5);
  
  // Collect and analyze prompt history data
  let totalPrompts = 0;
  let totalQualityScore = 0;
  let goodPromptsCount = 0;
  let bestStreak = 0;
  let totalGoalScore = 0;
  let totalContextScore = 0;
  let totalExpectationsScore = 0;
  let totalSourceScore = 0;
  let promptsWithGoalScore = 0;
  let promptsWithContextScore = 0;
  let promptsWithExpectationsScore = 0;
  let promptsWithSourceScore = 0;
  
  // Collect recent prompts for display
  const recentPrompts: Array<{
    id: string;
    projectId: string;
    projectTitle: string;
    subtaskId: string;
    taskTitle: string;
    content: string;
    qualityScore: number;
    timestamp: Date;
    feedback?: {
      feedback?: string;
    };
  }> = [];

  // Process all participations to gather prompt history
  for (const participation of participations) {
    const project = await getProject(participation.projectId);
    if (!project) continue;
    
    // Process prompt history for each subtask
    if (participation.promptHistory) {
      for (const [subtaskId, prompts] of Object.entries(participation.promptHistory)) {
        if (!prompts || !prompts.length) continue;
        
        // Find the subtask info
        const subtask = project.subtasks.find(st => st.id === subtaskId);
        if (!subtask) continue;
        
        totalPrompts += prompts.length;
        
        // Process each prompt
        for (const prompt of prompts) {
          // Add to quality totals
          totalQualityScore += prompt.qualityScore || 0;
          if (prompt.isGoodPrompt) goodPromptsCount++;
          
          // Track best streak
          if (prompt.goalScore) {
            totalGoalScore += prompt.goalScore;
            promptsWithGoalScore++;
          }
          if (prompt.contextScore) {
            totalContextScore += prompt.contextScore;
            promptsWithContextScore++;
          }
          if (prompt.expectationsScore) {
            totalExpectationsScore += prompt.expectationsScore;
            promptsWithExpectationsScore++;
          }
          if (prompt.sourceScore) {
            totalSourceScore += prompt.sourceScore;
            promptsWithSourceScore++;
          }
          
          // Add to recent prompts array (limit to 20 most recent for processing)
          if (recentPrompts.length < 20) {
            // Convert old feedback format to new format if needed
            let feedbackForDisplay: { feedback?: string } | undefined = undefined;
            if (prompt.feedback) {
              // Check if it's the new format already (has a feedback property)
              if ('feedback' in prompt.feedback && typeof prompt.feedback.feedback === 'string') {
                // New format - just pass it through
                feedbackForDisplay = {
                  feedback: prompt.feedback.feedback
                };
              } else if ('strengths' in prompt.feedback || 'tips' in prompt.feedback) {
                // Old format - combine strengths and tips into a single paragraph
                const strengths = 'strengths' in prompt.feedback && Array.isArray(prompt.feedback.strengths) 
                  ? prompt.feedback.strengths.join(' ') 
                  : '';
                const tips = 'tips' in prompt.feedback && Array.isArray(prompt.feedback.tips) 
                  ? prompt.feedback.tips.join(' ') 
                  : '';
                feedbackForDisplay = {
                  feedback: `${strengths} ${tips}`.trim()
                };
              } else {
                // Unknown format, set an empty feedback object
                feedbackForDisplay = {
                  feedback: "Feedback available but in an unsupported format."
                };
              }
            }
            
            recentPrompts.push({
              id: `${participation.id}-${subtaskId}-${prompt.timestamp.toMillis()}`,
              projectId: participation.projectId,
              projectTitle: project.title,
              subtaskId,
              taskTitle: subtask.title,
              content: prompt.content,
              qualityScore: prompt.qualityScore || 0,
              timestamp: prompt.timestamp.toDate(),
              feedback: feedbackForDisplay
            });
          }
        }
      }
    }
    
    // Check for best streak in promptEvaluations (for backward compatibility)
    if (participation.promptEvaluations) {
      for (const evaluations of Object.values(participation.promptEvaluations)) {
        for (const evaluation of evaluations) {
          if (evaluation.bestStreak && evaluation.bestStreak > bestStreak) {
            bestStreak = evaluation.bestStreak;
          }
        }
      }
    }
  }
  
  // Sort recent prompts by timestamp (newest first) and limit to 5
  recentPrompts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const finalRecentPrompts = recentPrompts.slice(0, 5);
  
  // Calculate averages
  const averageQualityScore = totalPrompts > 0 ? totalQualityScore / totalPrompts : 0;
  const goodPromptsPercentage = totalPrompts > 0 ? Math.round((goodPromptsCount / totalPrompts) * 100) : 0;
  const averageGoalScore = promptsWithGoalScore > 0 ? totalGoalScore / promptsWithGoalScore : 0;
  const averageContextScore = promptsWithContextScore > 0 ? totalContextScore / promptsWithContextScore : 0;
  const averageExpectationsScore = promptsWithExpectationsScore > 0 ? totalExpectationsScore / promptsWithExpectationsScore : 0;
  const averageSourceScore = promptsWithSourceScore > 0 ? totalSourceScore / promptsWithSourceScore : 0;
  
  // Generate upcoming deadlines from active projects
  const upcomingDeadlines = [];
  for (const participation of participations.filter(p => p.status === 'active')) {
    const project = await getProject(participation.projectId);
    if (project) {
      // Use project deadline if available, otherwise use estimated calculation
      let dueDate: Date;
      let priority: 'high' | 'medium' | 'low';
      
      if (project.deadline) {
        dueDate = project.deadline.toDate();
        
        // Calculate priority based on how close the deadline is
        const today = new Date();
        const daysUntilDeadline = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDeadline <= 7) {
          priority = 'high';
        } else if (daysUntilDeadline <= 14) {
          priority = 'medium';
        } else {
          priority = 'low';
        }
      } else {
        // Fallback to a simple calculation if no deadline is set
        const remainingProgress = 100 - participation.progress;
        
        // Calculate estimated days based on remaining progress and subtask count
        // Assume each subtask takes 2-5 days depending on difficulty
        const subtaskCount = project.subtasks?.length || 1;
        const difficultyFactor = project.difficulty === 'advanced' ? 5 : 
                               project.difficulty === 'intermediate' ? 3 : 2;
        
        const estimatedDaysToComplete = Math.ceil((remainingProgress / 100) * subtaskCount * difficultyFactor);
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + estimatedDaysToComplete);
        priority = (participation.progress < 50 ? 'high' : participation.progress < 80 ? 'medium' : 'low');
      }
      
      upcomingDeadlines.push({
        id: participation.id,
        title: `Complete ${project.title}`,
        projectTitle: project.title,
        dueDate: Timestamp.fromDate(dueDate),
        priority
      });
    }
  }
  
  return {
    activeProjects,
    completedProjects,
    totalHours,
    certificates,
    recentActivity: finalRecentActivity,
    upcomingDeadlines,
    promptQualityMetrics: {
      totalPrompts,
      averageScore: averageQualityScore,
      goodPromptsPercentage,
      bestStreak,
      averageGoalScore,
      averageContextScore,
      averageExpectationsScore,
      averageSourceScore,
      recentPrompts: finalRecentPrompts
    }
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

// Add a new function to delete a user account and handle associated data
export async function deleteUserAccount(userId: string) {
  // Get user data first to determine role and related actions
  const user = await getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const batch = writeBatch(db);
  
  // 1. Handle role-specific cleanup
  if (user.role === 'student') {
    // Get all participations for this student
    const participations = await getParticipations({ studentId: userId });
    
    for (const participation of participations) {
      // For each project, decrement participant count
      const projectRef = doc(db, 'projects', participation.projectId);
      batch.update(projectRef, {
        currentParticipants: increment(-1),
        updatedAt: Timestamp.now()
      });
      
      // Delete participation document
      const participationRef = doc(db, 'participations', participation.id);
      batch.delete(participationRef);
      
      // Delete any submissions
      const submissions = await getSubmissions({ participationId: participation.id });
      for (const submission of submissions) {
        const submissionRef = doc(db, 'submissions', submission.id);
        batch.delete(submissionRef);
      }
    }
    
    // Delete certificates
    const certificates = await getCertificates({ studentId: userId });
    for (const certificate of certificates) {
      const certificateRef = doc(db, 'certificates', certificate.id);
      batch.delete(certificateRef);
    }
  } 
  else if (user.role === 'ngo') {
    // Get all projects created by this NGO
    const projects = await getProjects({ ngoId: userId });
    
    for (const project of projects) {
      // Handle each project: either delete or transfer ownership
      const projectRef = doc(db, 'projects', project.id);
      
      // If project has participants, change status to archived
      if (project.currentParticipants > 0) {
        batch.update(projectRef, {
          status: 'archived',
          updatedAt: Timestamp.now()
        });
      } else {
        // If no participants, delete the project
        batch.delete(projectRef);
      }
    }
  }
  else if (user.role === 'teacher') {
    // For teachers, we need to handle submissions they've reviewed
    const submissions = await getSubmissions({});
    const reviewedSubmissions = submissions.filter(s => s.reviewedBy === userId);
    
    for (const submission of reviewedSubmissions) {
      const submissionRef = doc(db, 'submissions', submission.id);
      batch.update(submissionRef, {
        reviewedBy: null,
        updatedAt: Timestamp.now()
      });
    }
  }
  
  // 2. Delete the user document
  const userRef = doc(db, 'users', userId);
  batch.delete(userRef);
  
  // 3. Commit all changes
  await batch.commit();
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
    let statusChanges = {
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