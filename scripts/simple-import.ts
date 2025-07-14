import * as admin from 'firebase-admin';
import { promises as fs } from 'fs';
import path from 'path';

// 初始化Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = require('./openimpactlab-v2-firebase-adminsdk-fbsvc-2ce2ca266c.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'openimpactlab-v2'
  });
}

const db = admin.firestore();

async function importProjects() {
  try {
    console.log('开始导入Time Auction项目...');
    
    // 先清理现有数据
    const existingDocs = await db.collection('timeAuctionProjects').get();
    if (!existingDocs.empty) {
      console.log(`清理现有的 ${existingDocs.size} 个文档...`);
      const batch = db.batch();
      existingDocs.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    // 读取JSON文件
    const timeAuctionDir = path.join(process.cwd(), 'public/time_auction');
    const files = await fs.readdir(timeAuctionDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    console.log(`找到 ${jsonFiles.length} 个JSON文件`);
    
    let importCount = 0;
    
    // 逐个导入项目
    for (const file of jsonFiles) {
      const filePath = path.join(timeAuctionDir, file);
      const fileContent = await fs.readFile(filePath, 'utf8');
      
      try {
        const rawProject = JSON.parse(fileContent);
        
        // 创建简化的项目数据
        const project = {
          id: `time-auction-${rawProject.project_id}`,
          title: rawProject.project_title || 'Untitled Project',
          description: rawProject.project_description || '',
          shortDescription: rawProject.project_details?.background?.substring(0, 200) + '...' || '',
          ngoId: 'time-auction',
          ngoName: rawProject.organization?.name || 'Time Auction',
          status: rawProject.posting_info?.application_status === 'Application closed' ? 'archived' : 'published',
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
          currentParticipants: 0,
          tags: [
            ...(rawProject.organization?.causes || []),
            ...(rawProject.requirements?.skills || []),
            'Time Auction',
            rawProject.project_details?.location || 'Remote'
          ].filter(Boolean),
          difficulty: rawProject.requirements?.experience_level?.includes('Extensive experience') ? 'advanced' : 
                     rawProject.requirements?.experience_level?.includes('Some experience') ? 'intermediate' : 'beginner',
          deadline: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)), // 3个月后
          subtasks: [{
            id: 'ta-main-task',
            title: 'Participate in Time Auction Project',
            description: rawProject.project_details?.what_we_need?.join('\n') || 'Complete project requirements',
            order: 1,
            estimatedHours: 8
          }],
          source: 'time_auction'
        };
        
        // 写入单个文档
        const docRef = db.collection('timeAuctionProjects').doc(project.id);
        await docRef.set(project);
        
        importCount++;
        console.log(`✓ 导入项目: ${project.title}`);
        
      } catch (error) {
        console.error(`处理文件 ${file} 时出错:`, error);
      }
    }
    
    console.log(`\n成功导入 ${importCount} 个项目！`);
    
    // 验证导入结果
    const finalSnapshot = await db.collection('timeAuctionProjects').get();
    console.log(`验证：数据库中现有 ${finalSnapshot.size} 个Time Auction项目`);
    
  } catch (error) {
    console.error('导入失败:', error);
    throw error;
  }
}

importProjects()
  .then(() => {
    console.log('导入完成！');
    process.exit(0);
  })
  .catch(error => {
    console.error('导入失败:', error);
    process.exit(1);
  }); 