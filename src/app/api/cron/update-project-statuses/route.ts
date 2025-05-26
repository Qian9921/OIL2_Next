import { NextResponse } from 'next/server';
import { updateProjectStatuses } from '@/lib/firestore';

export const runtime = 'edge';
export const maxDuration = 300; // 5 minute timeout

/**
 * API route handler for automated project status updates via cron job
 * 
 * This endpoint should be called periodically (e.g., daily) to:
 * 1. Mark published projects as completed when deadline is reached
 * 2. Archive completed projects after 30 days
 * 3. Handle orphaned projects (when NGO is deleted)
 * 
 * Requires authentication via CRON_API_KEY in the query string
 */
export async function GET(request: Request) {
  try {
    // Get API key from query string
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey');
    
    // Verify API key
    const expectedApiKey = process.env.CRON_API_KEY;
    if (!expectedApiKey) {
      console.error('CRON_API_KEY environment variable is not set');
      return NextResponse.json(
        { success: false, error: 'CRON_API_KEY not configured on server' },
        { status: 500 }
      );
    }
    
    if (apiKey !== expectedApiKey) {
      console.error('Invalid API key provided for project status update');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Run the status update process
    const result = await updateProjectStatuses();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in project status update endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 