"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
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
function parseProjectPeriod(period) {
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
function parseTimeRequirement(time) {
    const match = time.match(/(\d+)/);
    return match ? parseInt(match[1]) : 10;
}
// 转换TimeAuctionProject到Project格式
function convertToProject(timeAuctionProject) {
    return {
        id: `time-auction-${timeAuctionProject.project_id}`,
        title: timeAuctionProject.project_title,
        description: timeAuctionProject.project_description,
        shortDescription: timeAuctionProject.project_details.background.substring(0, 200) + '...',
        ngoId: 'time-auction',
        ngoName: timeAuctionProject.organization.name,
        status: timeAuctionProject.posting_info.application_status === 'Application closed' ? 'archived' : 'published',
        createdAt: admin.firestore.Timestamp.fromDate(new Date(timeAuctionProject.scraped_at)),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date(timeAuctionProject.scraped_at)),
        maxParticipants: undefined,
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
        source: 'time_auction'
    };
}
// 批量导入函数
async function importTimeAuctionProjects() {
    console.log('开始导入Time Auction项目...');
    try {
        // 读取JSON文件目录
        const timeAuctionDir = path_1.default.join(process.cwd(), 'public/time_auction');
        const files = await fs_1.promises.readdir(timeAuctionDir);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        console.log(`找到 ${jsonFiles.length} 个JSON文件`);
        const batch = db.batch();
        const projects = [];
        // 处理每个JSON文件
        for (const file of jsonFiles) {
            const filePath = path_1.default.join(timeAuctionDir, file);
            const fileContent = await fs_1.promises.readFile(filePath, 'utf8');
            try {
                const timeAuctionProject = JSON.parse(fileContent);
                const project = convertToProject(timeAuctionProject);
                projects.push(project);
                // 添加到批处理
                const projectRef = db.collection('timeAuctionProjects').doc(project.id);
                batch.set(projectRef, project);
                console.log(`处理项目: ${project.title}`);
            }
            catch (error) {
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
    }
    catch (error) {
        console.error('导入过程中出错:', error);
        throw error;
    }
}
// 清理函数（可选）
async function clearTimeAuctionProjects() {
    console.log('清理现有Time Auction项目...');
    const snapshot = await db.collection('timeAuctionProjects').get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
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
