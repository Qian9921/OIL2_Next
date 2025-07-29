import * as admin from 'firebase-admin';

// 初始化Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = require('./openimpactlab-v2-firebase-adminsdk-fbsvc-2ce2ca266c.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'openimpactlab-v2'
  });
}

const db = admin.firestore();

async function checkProjectData() {
  try {
    console.log('检查Firebase中的项目数据...');
    
    // 检查projects集合
    const snapshot = await db.collection('projects').get();
    console.log(`projects集合中有 ${snapshot.size} 个文档`);
    
    if (snapshot.size > 0) {
      console.log('\n项目列表:');
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ID: ${doc.id}`);
        console.log(`   标题: ${data.title}`);
        console.log(`   状态: ${data.status}`);
        console.log(`   来源: ${data.source || 'internal'}`);
        console.log('---');
      });
    } else {
      console.log('没有找到任何项目数据');
    }
    
  } catch (error) {
    console.error('检查数据时出错:', error);
  }
}

checkProjectData()
  .then(() => {
    console.log('检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('执行失败:', error);
    process.exit(1);
  }); 