import * as admin from 'firebase-admin';
import { promises as fs } from 'fs';
import path from 'path';
import { TimeAuctionProject, Project } from '../src/lib/types';

// 初始化Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = require('./openimpactlab-v2-firebase-adminsdk-fbsvc-2ce2ca266c.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'openimpactlab-v2'
  });
}

const db = admin.firestore();

// 转换函数 - 从现有API路由复制过来
function parseProjectPeriod(period: string): admin.firestore.Timestamp {
  const match = period.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = monthNames.indexOf(month);
    if (monthIndex !== -1) {
      const date = new Date(parseInt(year), monthIndex, parseInt(day));
      return admin.firestore.Timestamp.fromDate(date);
    }
  }
  return admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
}

function parseTimeRequirement(time: string): number {
  const match = time.match(/(\d+)/);
  return match ? parseInt(match[1]) : 10;
}

// 转换TimeAuctionProject到Project格式
function convertToProject(timeAuctionProject: TimeAuctionProject): Project {
  return {
    id: `time-auction-${timeAuctionProject.project_id}`,
    title: timeAuctionProject.project_title,
    description: timeAuctionProject.project_description,
    shortDescription: timeAuctionProject.project_details.background.substring(0, 200) + '...',
    ngoId: 'time-auction',
    ngoName: timeAuctionProject.organization.name,
    status: timeAuctionProject.posting_info.application_status === 'Application closed' ? 'archived' : 'published',
    createdAt: admin.firestore.Timestamp.fromDate(new Date(timeAuctionProject.scraped_at)) as any,
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(timeAuctionProject.scraped_at)) as any,
    currentParticipants: 0,
    tags: [
      ...timeAuctionProject.organization.causes,
      ...timeAuctionProject.requirements.skills,
      'Time Auction',
      timeAuctionProject.project_details.location
    ].filter(Boolean),
    difficulty: timeAuctionProject.requirements.experience_level.includes('Extensive experience') ? 'advanced' : 
               timeAuctionProject.requirements.experience_level.includes('Some experience') ? 'intermediate' : 'beginner',
    deadline: parseProjectPeriod(timeAuctionProject.project_details.project_period) as any,
    subtasks: [{
      id: 'ta-main-task',
      title: 'Participate in Time Auction Project',
      description: timeAuctionProject.project_details.what_we_need.join('\n'),
      order: 1,
      estimatedHours: parseTimeRequirement(timeAuctionProject.requirements.time),
      resources: [timeAuctionProject.project_url],
      completionCriteria: [
        'Complete all required tasks',
        'Meet quality standards',
        'Submit final deliverables'
      ]
    }],
    requirements: timeAuctionProject.project_details.what_we_need,
    learningGoals: [
      'Gain real-world experience',
      'Contribute to meaningful cause',
      'Develop professional skills'
    ],
    source: 'time_auction' as const
  };
}

// 批量导入函数
async function importTimeAuctionProjects() {
  console.log('开始导入Time Auction项目...');
  
  try {
    // 读取JSON文件目录
    const timeAuctionDir = path.join(process.cwd(), 'public/time_auction');
    const files = await fs.readdir(timeAuctionDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    console.log(`找到 ${jsonFiles.length} 个JSON文件`);
    
    const batch = db.batch();
    const projects: Project[] = [];
    
    // 处理每个JSON文件
    for (const file of jsonFiles) {
      const filePath = path.join(timeAuctionDir, file);
      const fileContent = await fs.readFile(filePath, 'utf8');
      
      try {
        const timeAuctionProject: TimeAuctionProject = JSON.parse(fileContent);
        const project = convertToProject(timeAuctionProject);
        projects.push(project);
        
        // 添加到批处理
        const projectRef = db.collection('timeAuctionProjects').doc(project.id);
        batch.set(projectRef, project);
        
        console.log(`处理项目: ${project.title}`);
      } catch (error) {
        console.error(`处理文件 ${file} 时出错:`, error);
      }
    }
    
    // 执行批量写入
    await batch.commit();
    
    console.log(`成功导入 ${projects.length} 个Time Auction项目到Firebase`);
    
    // 验证导入的数据
    const snapshot = await db.collection('timeAuctionProjects').get();
    console.log(`数据库中现有 ${snapshot.size} 个Time Auction项目`);
    
    // 显示导入的项目概览
    projects.forEach(project => {
      console.log(`- ${project.title} (${project.status}) - ${project.difficulty}`);
    });
    
  } catch (error) {
    console.error('导入过程中出错:', error);
    throw error;
  }
}

// 清理函数（可选）
async function clearTimeAuctionProjects() {
  console.log('清理现有Time Auction项目...');
  
  const snapshot = await db.collection('timeAuctionProjects').get();
  const batch = db.batch();
  
  snapshot.docs.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log(`清理了 ${snapshot.size} 个项目`);
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--clear')) {
    await clearTimeAuctionProjects();
    return;
  }
  
  if (args.includes('--clear-and-import')) {
    await clearTimeAuctionProjects();
    await importTimeAuctionProjects();
    return;
  }
  
  await importTimeAuctionProjects();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('导入完成！');
      process.exit(0);
    })
    .catch(error => {
      console.error('导入失败:', error);
      process.exit(1);
    });
} 