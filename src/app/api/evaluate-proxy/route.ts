import { NextResponse } from 'next/server';

/**
 * This API route acts as a proxy to the evaluation API to avoid CORS issues
 */
export async function POST(request: Request) {
  try {
    // Get the request body
    const body = await request.json();
    console.log("Evaluation proxy received request:", JSON.stringify(body, null, 2));
    
    // Forward the request to the actual evaluation API
    console.log("Sending request to evaluation API at:", 'https://tutor-new-827682634474.us-central1.run.app/api/evaluate');
    
    const response = await fetch('https://tutor-new-827682634474.us-central1.run.app/api/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    
    // Log the response status and headers for debugging
    console.log("Evaluation API response status:", response.status);
    console.log("Evaluation API response headers:", Object.fromEntries([...response.headers.entries()]));
    
    // Get the response data
    const responseData = await response.json();
    console.log("Raw API response (full data):", JSON.stringify(responseData, null, 2)); // Detailed debug log
    
    // If the response is not ok, throw an error
    if (!response.ok) {
      console.error("API error with status:", response.status, "and data:", responseData);
      return NextResponse.json(
        { error: `API error: ${response.status}`, details: responseData },
        { status: response.status }
      );
    }
    
    // Validate the score exists and is a number
    if (responseData && (typeof responseData.score !== 'number' || isNaN(responseData.score))) {
      // If score is missing or invalid, set a default score of 0
      responseData.score = 0;
      if (!responseData.feedback) {
        responseData.feedback = "The evaluation system couldn't determine a score for your work. Please make sure your GitHub repository is accessible and contains the required work for this task.";
      }
    }
    
    // Return the response data
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in evaluation proxy:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to evaluation API', details: String(error) },
      { status: 500 }
    );
  }
} 