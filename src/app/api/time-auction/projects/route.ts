import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { TimeAuctionProject, Project } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

export async function GET() {
  try {
    const timeAuctionDir = path.join(process.cwd(), 'public/time_auction');
    const files = await fs.readdir(timeAuctionDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const projects: Project[] = [];
    
    for (const file of jsonFiles) {
      const filePath = path.join(timeAuctionDir, file);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const timeAuctionProject: TimeAuctionProject = JSON.parse(fileContent);
      
      // 转换为标准Project格式
      const standardProject: Project = {
        id: `time-auction-${timeAuctionProject.project_id}`,
        title: timeAuctionProject.project_title,
        description: timeAuctionProject.project_description,
        shortDescription: timeAuctionProject.project_details.background.substring(0, 200) + '...',
        ngoId: 'time-auction',
        ngoName: timeAuctionProject.organization.name,
        status: timeAuctionProject.posting_info.application_status === 'Application closed' ? 'archived' : 'published',
        createdAt: Timestamp.fromDate(new Date(timeAuctionProject.scraped_at)),
        updatedAt: Timestamp.fromDate(new Date(timeAuctionProject.scraped_at)),
        maxParticipants: undefined, // Time Auction项目通常没有参与者限制
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
          title: '参与Time Auction项目',
          description: timeAuctionProject.project_details.what_we_need.join('\n'),
          order: 1,
          estimatedHours: parseTimeRequirement(timeAuctionProject.requirements.time),
          resources: [timeAuctionProject.project_url],
          completionCriteria: [
            '完成项目要求的所有任务',
            '与NGO保持良好沟通',
            '按时完成项目交付'
          ]
        }],
        requirements: timeAuctionProject.project_details.what_we_need,
        learningGoals: [
          '获得实际的志愿服务经验',
          '为NGO组织提供专业技能支持',
          '建立社会影响力项目作品集'
        ],
        source: 'time_auction'
      };
      
      projects.push(standardProject);
    }
    
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error loading Time Auction projects:', error);
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 });
  }
}

// 解析项目周期为截止日期
function parseProjectPeriod(period: string): Timestamp {
  try {
    // 解析类似 "31 Jan 2025 - 30 Apr 2025" 的格式
    const endDateMatch = period.match(/- (.+)$/);
    if (endDateMatch) {
      const endDateStr = endDateMatch[1].trim();
      const endDate = new Date(endDateStr);
      if (!isNaN(endDate.getTime())) {
        return Timestamp.fromDate(endDate);
      }
    }
    
    // 如果解析失败，返回3个月后的日期
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);
    return Timestamp.fromDate(futureDate);
  } catch (error) {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);
    return Timestamp.fromDate(futureDate);
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