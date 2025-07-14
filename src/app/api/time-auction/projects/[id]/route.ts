import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { TimeAuctionProject } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Extract project ID from time-auction-XXXX format
    const projectId = id.replace('time-auction-', '');
    
    // Find the corresponding JSON file
    const timeAuctionDir = path.join(process.cwd(), 'public/time_auction');
    const files = await fs.readdir(timeAuctionDir);
    const targetFile = files.find(file => 
      file.includes(`project_${projectId}_`) && file.endsWith('.json')
    );
    
    if (!targetFile) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Read and return the raw JSON data
    const filePath = path.join(timeAuctionDir, targetFile);
    const fileContent = await fs.readFile(filePath, 'utf8');
    const timeAuctionProject: TimeAuctionProject = JSON.parse(fileContent);
    
    return NextResponse.json(timeAuctionProject);
  } catch (error) {
    console.error('Error loading Time Auction project:', error);
    return NextResponse.json({ error: 'Failed to load project' }, { status: 500 });
  }
} 