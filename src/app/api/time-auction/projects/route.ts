import { NextResponse } from 'next/server';
import { TimeAuctionProject, Project } from '@/lib/types';
import * as admin from 'firebase-admin';
import path from 'path';
import { promises as fs } from 'fs';

// 初始化Firebase Admin SDK（如果尚未初始化）
let dbInstance: admin.firestore.Firestore | null = null;

async function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      // 尝试使用环境变量中的服务账户
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      
      if (serviceAccountKey) {
        const serviceAccount = JSON.parse(serviceAccountKey);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: 'openimpactlab-v2'
        });
             } else {
         // 回退到本地文件
         const serviceAccountPath = path.join(process.cwd(), 'openimpactlab-v2-firebase-adminsdk-fbsvc-2ce2ca266c.json');
         const serviceAccountContent = await fs.readFile(serviceAccountPath, 'utf8');
         const serviceAccount = JSON.parse(serviceAccountContent);
         admin.initializeApp({
           credential: admin.credential.cert(serviceAccount),
           projectId: 'openimpactlab-v2'
         });
       }
      
      dbInstance = admin.firestore();
      return true;
    } catch (error) {
      console.error('Firebase Admin initialization error:', error);
      return false;
    }
  } else {
    dbInstance = admin.firestore();
    return true;
  }
}

export async function GET() {
  // 尝试从Firebase读取数据
  const firebaseInitialized = await initializeFirebaseAdmin();
  
  if (firebaseInitialized && dbInstance) {
    try {
      const snapshot = await dbInstance.collection('timeAuctionProjects').get();
      
      if (!snapshot.empty) {
        const projects: Project[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data() as Project;
          projects.push({
            ...data,
            id: data.id || doc.id
          });
        });
        
        // 按更新时间排序，最新的在前
        projects.sort((a, b) => {
          if (a.updatedAt && b.updatedAt) {
            const aTime = (a.updatedAt as any).seconds || 0;
            const bTime = (b.updatedAt as any).seconds || 0;
            return bTime - aTime;
          }
          return 0;
        });
        
        console.log(`Successfully loaded ${projects.length} projects from Firebase`);
        return NextResponse.json(projects);
      }
    } catch (error) {
      console.error('Error reading from Firebase:', error);
    }
  }
  
  // 如果Firebase失败，回退到本地文件读取
  console.log('Falling back to local file reading...');
  try {
    
    const timeAuctionDir = path.join(process.cwd(), 'public/time_auction');
    const files = await fs.readdir(timeAuctionDir);
    const jsonFiles = files.filter((file: string) => file.endsWith('.json'));
    
    const projects: Project[] = [];
    
    for (const file of jsonFiles) {
      const filePath = path.join(timeAuctionDir, file);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const timeAuctionProject: TimeAuctionProject = JSON.parse(fileContent);
      
      // 构建完整的项目描述
      const fullDescription = buildFullDescription(timeAuctionProject);
      
      // 转换为标准Project格式
      const standardProject: Project = {
        id: `time-auction-${timeAuctionProject.project_id}`,
        title: timeAuctionProject.project_title,
        description: fullDescription,
        shortDescription: buildShortDescription(timeAuctionProject),
        ngoId: 'time-auction',
        ngoName: timeAuctionProject.organization.name,
        status: timeAuctionProject.posting_info.application_status === 'Application closed' ? 'archived' : 'published',
        createdAt: createTimestamp(new Date(timeAuctionProject.scraped_at)),
        updatedAt: createTimestamp(new Date(timeAuctionProject.scraped_at)),
        currentParticipants: 0,
        tags: [
          ...timeAuctionProject.organization.causes,
          ...timeAuctionProject.requirements.skills,
          'Time Auction',
          timeAuctionProject.project_details.location
        ].filter(Boolean),
        difficulty: timeAuctionProject.requirements.experience_level.includes('Extensive experience') ? 'advanced' : 
                   timeAuctionProject.requirements.experience_level.includes('Some experience') ? 'intermediate' : 'beginner',
        deadline: parseProjectPeriod(timeAuctionProject.project_details.project_period),
        subtasks: [{
          id: 'ta-main-task',
          title: 'Participate in Time Auction Project',
          description: buildTaskDescription(timeAuctionProject),
          order: 1,
          estimatedHours: parseTimeRequirement(timeAuctionProject.requirements.time),
          resources: [
            timeAuctionProject.project_url,
            timeAuctionProject.organization.website
          ].filter(Boolean),
          completionCriteria: [
            'Complete all listed responsibilities',
            'Provide quality consultation sessions',
            'Meet volunteer time commitment'
          ]
        }],
        requirements: buildDetailedRequirements(timeAuctionProject),
        learningGoals: [
          'Apply your expertise to help NGOs',
          'Gain experience in nonprofit consulting',
          'Make meaningful social impact through skills sharing',
          'Build connections with social impact organizations'
        ],
        source: 'time_auction'
      };
      
      projects.push(standardProject);
    }
    
    console.log(`Successfully loaded ${projects.length} projects from local files`);
    return NextResponse.json(projects);
  } catch (fallbackError) {
    console.error('Error loading Time Auction projects from local files:', fallbackError);
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 });
  }
}

// 创建时间戳的辅助函数
function createTimestamp(date: Date): any {
  return {
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: (date.getTime() % 1000) * 1000000
  };
}

// 解析项目周期为截止日期
function parseProjectPeriod(period: string): any {
  try {
    // 解析类似 "31 Jan 2025 - 30 Apr 2025" 的格式
    const endDateMatch = period.match(/- (.+)$/);
    if (endDateMatch) {
      const endDateStr = endDateMatch[1].trim();
      const endDate = new Date(endDateStr);
      if (!isNaN(endDate.getTime())) {
        return createTimestamp(endDate);
      }
    }
    
    // 如果解析失败，返回3个月后的日期
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);
    return createTimestamp(futureDate);
  } catch (error) {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);
    return createTimestamp(futureDate);
  }
}

// 解析时间要求为小时数
function parseTimeRequirement(time: string): number {
  try {
    const hourMatch = time.match(/(\d+)\s*h/i);
    if (hourMatch) {
      return parseInt(hourMatch[1]);
    }
    
    const totalMatch = time.match(/(\d+)\s*hours?\s*in\s*total/i);
    if (totalMatch) {
      return parseInt(totalMatch[1]);
    }
    
    return 8; // 默认8小时
  } catch (error) {
    return 8;
  }
}

// 构建简短描述
function buildShortDescription(project: TimeAuctionProject): string {
  const parts = [];
  
  // 基本描述
  if (project.project_description) {
    parts.push(project.project_description);
  }
  
  // 添加项目周期和地点信息
  const practicalInfo = [];
  if (project.project_details.project_period) {
    practicalInfo.push(`Period: ${project.project_details.project_period}`);
  }
  if (project.project_details.location) {
    practicalInfo.push(`Location: ${project.project_details.location}`);
  }
  
  if (practicalInfo.length > 0) {
    parts.push(practicalInfo.join(' • '));
  }
  
  return parts.join('\n\n');
}

// 构建项目描述 - 只包含核心描述，不重复要求
function buildFullDescription(project: TimeAuctionProject): string {
  const sections = [];
  
  // 基本描述
  if (project.project_description) {
    sections.push(project.project_description);
  }
  
  // 背景信息
  if (project.project_details.background) {
    sections.push(`**Background**\n${project.project_details.background}`);
  }
  
  // 我们提供什么
  if (project.project_details.what_we_have) {
    sections.push(`**What We Provide**\n${project.project_details.what_we_have}`);
  }
  
  // 为什么重要
  if (project.project_details.why_important) {
    sections.push(`**Why This is Important**\n${project.project_details.why_important}`);
  }
  
  // 特殊项目信息
  if (project.special_program) {
    sections.push(`**${project.special_program.name}**\n${project.special_program.description}`);
  }
  
  return sections.join('\n\n');
}

// 构建任务描述 - 只包含"what we need"
function buildTaskDescription(project: TimeAuctionProject): string {
  if (project.project_details.what_we_need && project.project_details.what_we_need.length > 0) {
    return '**What We Need:**\n' + project.project_details.what_we_need
      .map((item, index) => `${index + 1}. ${item}`)
      .join('\n');
  }
  return 'Complete the project requirements as specified.';
}

// 构建要求列表 - 按照官方页面格式
function buildDetailedRequirements(project: TimeAuctionProject): string[] {
  const requirements = [];
  
  // 按照官方页面的顺序和格式
  if (project.requirements.time) {
    requirements.push(`Time: ${project.requirements.time}`);
  }
  
  if (project.requirements.skills && project.requirements.skills.length > 0) {
    requirements.push(`Skills: ${project.requirements.skills.join(', ')}`);
  }
  
  if (project.requirements.experience_level && project.requirements.experience_level.length > 0) {
    requirements.push(`Experience Level: ${project.requirements.experience_level.join(', ')}`);
  }
  
  if (project.requirements.language && project.requirements.language.length > 0) {
    requirements.push(`Language: ${project.requirements.language.join(', ')}`);
  }
  
  if (project.requirements.age_range && project.requirements.age_range !== 'No age requirement') {
    requirements.push(`Age Range: ${project.requirements.age_range}`);
  }
  
  return requirements;
} 