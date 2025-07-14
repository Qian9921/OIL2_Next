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

async function checkTimeAuctionData() {
  try {
    console.log('检查Firebase中的Time Auction数据...');
    
    // 检查timeAuctionProjects集合
    const snapshot = await db.collection('timeAuctionProjects').get();
    console.log(`timeAuctionProjects集合中有 ${snapshot.size} 个文档`);
    
    if (snapshot.size > 0) {
      console.log('\n项目列表:');
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ID: ${doc.id}`);
        console.log(`   标题: ${data.title}`);
        console.log(`   状态: ${data.status}`);
        console.log(`   来源: ${data.source}`);
        console.log('---');
      });
    } else {
      console.log('没有找到任何Time Auction项目数据');
    }
    
  } catch (error) {
    console.error('检查数据时出错:', error);
  }
}

checkTimeAuctionData()
  .then(() => {
    console.log('检查完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('检查失败:', error);
    process.exit(1);
  }); 