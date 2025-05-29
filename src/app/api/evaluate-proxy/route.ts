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
    
    // Enhanced logging of the API response
    console.log("Raw API response (full data):", JSON.stringify(responseData, null, 2));
    console.log("API Response Structure Analysis:");
    console.log("- Has score field:", 'score' in responseData);
    console.log("- Has result object:", 'result' in responseData);
    if (responseData.result) {
      console.log("- Has rawContent:", 'rawContent' in responseData.result);
      if (responseData.result.rawContent) {
        console.log("- Has assessment:", 'assessment' in responseData.result.rawContent);
        console.log("- Assessment value:", responseData.result.rawContent.assessment);
        console.log("- Assessment type:", typeof responseData.result.rawContent.assessment);
        console.log("- Has checkpoints:", 'checkpoints' in responseData.result.rawContent);
        if (responseData.result.rawContent.checkpoints) {
          console.log("- Number of checkpoints:", responseData.result.rawContent.checkpoints.length);
          console.log("- Checkpoint statuses:", responseData.result.rawContent.checkpoints.map((c: any) => c.status));
        }
      }
    }
    
    // If the response is not ok, throw an error
    if (!response.ok) {
      console.error("API error with status:", response.status, "and data:", responseData);
      return NextResponse.json(
        { error: `API error: ${response.status}`, details: responseData },
        { status: response.status }
      );
    }
    
    // Extract the assessment value as the score if available
    if (!('score' in responseData) && responseData.result?.rawContent?.assessment !== undefined) {
      console.log("Extracting score from result.rawContent.assessment:", responseData.result.rawContent.assessment);
      
      // Convert from 0-1 range to 0-100% range
      const rawAssessment = responseData.result.rawContent.assessment;
      const convertedScore = Math.round(rawAssessment * 100);
      
      console.log(`Converting assessment score: ${rawAssessment} (0-1 range) -> ${convertedScore}% (0-100 range)`);
      
      // Add the converted assessment value as the score field
      responseData.score = convertedScore;
      
      // Also add a default feedback message if needed
      if (!('feedback' in responseData)) {
        // Determine the feedback based on checkpoints
        const checkpoints = responseData.result.rawContent.checkpoints || [];
        
        // Correct the logic to properly count completed/passed checkpoints
        const passedCheckpoints = checkpoints.filter(
          (c: any) => c.status && (
            c.status.toLowerCase().includes('pass') || 
            c.status.toLowerCase().includes('complete') ||
            c.status.toLowerCase() === 'completed'
          ) && !c.status.toLowerCase().includes('not')
        ).length;
        
        console.log(`Checkpoint analysis: ${passedCheckpoints} passed out of ${checkpoints.length} total`);
        
        // Create feedback based on assessment score and checkpoints
        if (responseData.score >= 80) {
          responseData.feedback = "Great job! You've successfully completed this task.";
        } else if (passedCheckpoints > 0) {
          responseData.feedback = `You've completed ${passedCheckpoints} out of ${checkpoints.length} requirements. Please review the details and try again.`;
        } else {
          responseData.feedback = "None of the requirements have been met yet. Please check the evaluation details and try again.";
        }
      }
      
      console.log("Updated response with score field:", responseData.score);
      console.log("Final feedback message:", responseData.feedback);
    }
    
    // Return the modified response data
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in evaluation proxy:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to evaluation API', details: String(error) },
      { status: 500 }
    );
  }
} 