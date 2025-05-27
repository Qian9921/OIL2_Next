import { NextRequest, NextResponse } from 'next/server';
import { VertexAI, HarmCategory, HarmBlockThreshold, Part } from '@google-cloud/vertexai';
import { getProject, getParticipationByProjectAndStudent, savePromptEvaluation } from '@/lib/firestore'; // Assuming these exist
import { Subtask } from '@/lib/types';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'openimpactlab-v2';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const MODEL_NAME = 'gemini-2.5-flash-preview-05-20'; // Corrected model name based on common patterns

interface ChatRequestData {
  userId: string;
  projectId: string;
  subtaskId: string;
  message: string;
  chatHistory?: { role: string; parts: { text?: string; inlineData?: { mimeType: string; data: string; } }[] }[]; 
  imageData?: string; // base64 encoded image data
  imageMimeType?: string; // e.g., 'image/png', 'image/jpeg'
  evaluatePromptQuality?: boolean; // Whether to evaluate prompt quality
  requestPersonalizedFeedback?: boolean; // Whether to generate personalized feedback for the prompt
}

// Initialize Vertex AI and model (consider caching or initializing outside the handler for efficiency)
const vertex_ai = new VertexAI({ project: PROJECT_ID, location: LOCATION });
const generativeModel = vertex_ai.getGenerativeModel({
  model: MODEL_NAME,
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ],
  generationConfig: {
    maxOutputTokens: 8192, // Maximum output token limit for Gemini-2.5 Flash
    temperature: 0.8,
    topP: 0.95,
  },
});

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestData = await req.json();
    const { userId, projectId, subtaskId, message, chatHistory = [], imageData, imageMimeType, evaluatePromptQuality, requestPersonalizedFeedback } = body;

    if (!userId || !projectId || !subtaskId || (!message && !imageData)) { // Message or image is required
      return NextResponse.json({ message: 'Missing required fields: userId, projectId, subtaskId, and message or image.' }, { status: 400 });
    }
    if (imageData && !imageMimeType) {
      return NextResponse.json({ message: 'imageMimeType is required when imageData is provided.' }, { status: 400 });
    }

    // Log chat history length for debugging
    console.log(`Received chat with history length: ${chatHistory.length} turns`);
    if (chatHistory.length > 0) {
      console.log(`First message in history: ${chatHistory[0].parts[0].text?.substring(0, 50)}...`);
      console.log(`Last message in history: ${chatHistory[chatHistory.length-1].parts[0].text?.substring(0, 50)}...`);
    }

    // 1. Verify user authentication (optional, depends on your session management)
    //    For this example, we'll assume userId is valid.

    // 2. Verify student is enrolled in the project
    const participation = await getParticipationByProjectAndStudent(projectId, userId);
    if (!participation) {
      return NextResponse.json({ message: 'User is not enrolled in this project.' }, { status: 403 });
    }

    // 3. Get project and subtask details for context
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ message: 'Project not found.' }, { status: 404 });
    }

    const subtask = project.subtasks.find(st => st.id === subtaskId);
    if (!subtask) {
      return NextResponse.json({ message: 'Subtask not found in this project.' }, { status: 404 });
    }

    // 4. Construct the prompt for the Gemini API
    const systemInstruction = `You are a friendly and helpful AI tutor for OpenImpactLab, a platform where students work on social impact projects. 
    You are assisting a student with a specific task within a project. 
    Your goal is to guide the student, help them understand concepts, and solve problems related to their task. 
    Be encouraging and break down complex topics if needed. Do not give direct answers unless the student is truly stuck and has made an effort. 
    Instead, ask guiding questions to help them arrive at the solution themselves. 
    Keep your responses concise and focused on the task at hand.
    
    Current Project: "${project.title}"
    Project Description: "${project.description}"
    Current Task: "${subtask.title}"
    Task Description: "${subtask.description}"
    Task Estimated Hours: ${subtask.estimatedHours}
    Task Completion Criteria: ${subtask.completionCriteria?.join(', ') || 'Not specified'}
    Task Resources: ${subtask.resources?.join(', ') || 'Not specified'}
    
    IMPORTANT: Maintain context from the entire conversation history. Remember what the student has asked before and what you've previously explained.
    Be aware of the student's progress throughout the conversation and build upon previous exchanges.`;

    const userParts: Part[] = [];
    if (message && message.trim()) { // Ensure message is not just whitespace
      userParts.push({ text: message });
    }
    if (imageData && imageMimeType) {
      userParts.push({ inlineData: { data: imageData, mimeType: imageMimeType } });
    }

    // Ensure we're processing chat history correctly
    const processedChatHistory = chatHistory.map(turn => ({
      role: turn.role,
      parts: turn.parts.reduce((acc: Part[], part) => {
        if (part.text) acc.push({ text: part.text });
        else if (part.inlineData) acc.push({ inlineData: { mimeType: part.inlineData.mimeType, data: part.inlineData.data }});
        return acc;
      }, [] as Part[])
    }));

    // Log chat history length for debugging
    console.log(`Processing chat with history length: ${processedChatHistory.length} turns`);

    const contents = [
      ...processedChatHistory,
      { role: 'user', parts: userParts }
    ].filter(content => content.parts.length > 0); // Ensure no content turns with empty parts

    const streamRequest = {
        contents: contents, 
        systemInstruction: {
            role: 'system', 
            parts: [{text: systemInstruction}]
        }
    };

    const result = await generativeModel.generateContentStream(streamRequest);

    // Handle prompt evaluation if requested
    let promptQualityScore: number | null = null;
    let promptQualityDetails: { goal: number; context: number; expectations: number; source: number } | null = null;
    let promptFeedback: any = null;
    
    // Initialize headers
    const headers: HeadersInit = { 'Content-Type': 'text/plain; charset=utf-8' };
    
    // Consolidate prompt evaluation and feedback into a single call
    if (evaluatePromptQuality || requestPersonalizedFeedback) {
      try {
        // Single call to Gemini for both evaluation and feedback
        console.log("Making a single call to Gemini for prompt evaluation and/or feedback");
        const result = await evaluatePromptWithAI(message, subtask);
        
        // Process scores if evaluation was requested
        if (evaluatePromptQuality) {
          promptQualityScore = result.overallScore;
          promptQualityDetails = {
            goal: result.goalScore,
            context: result.contextScore,
            expectations: result.expectationsScore,
            source: result.sourceScore
          };
        }
        
        // Process feedback if it was requested
        if (requestPersonalizedFeedback) {
          promptFeedback = { feedback: result.feedback };
          console.log("DEBUG - Using feedback from evaluation:", promptFeedback);
          
          // Add to headers with type assertion only if we have valid feedback
          if (promptFeedback && typeof promptFeedback.feedback === 'string') {
            headers['X-Prompt-Feedback' as keyof HeadersInit] = encodeURIComponent(JSON.stringify(promptFeedback));
            console.log("DEBUG - Added feedback to headers");
          }
        }
        
        // Save to Firebase if there's any data to save and we have the required IDs
        if ((promptQualityScore !== null || (promptFeedback && typeof promptFeedback.feedback === 'string')) && 
            userId && projectId && subtaskId) {
          try {
            console.log("DEBUG - About to save prompt evaluation with feedback:", promptFeedback);
            // Create evaluation object with the structure expected by savePromptEvaluation
            const evaluationObj = {
              goalScore: result.goalScore,
              contextScore: result.contextScore,
              expectationsScore: result.expectationsScore,
              sourceScore: result.sourceScore,
              overallScore: result.overallScore,
              prompt: message
            };
            
            const streakInfo: any = await savePromptEvaluation(
              userId,
              subtaskId,
              evaluationObj,
              promptFeedback
            );
            
            console.log("DEBUG - Successfully saved prompt evaluation with feedback. Streak info:", streakInfo);
            
            // Add streak info to headers if available
            if (streakInfo) {
              // Extract streak info values directly from the returned object
              const currentStreak = streakInfo.currentStreak || 0;
              const bestStreak = streakInfo.bestStreak || 0;
              const isGoodPrompt = streakInfo.isGoodPrompt || false;
              
              // Create a new object for the JSON
              headers['X-Prompt-Streak' as keyof HeadersInit] = JSON.stringify({
                current: currentStreak,
                best: bestStreak,
                isGoodPrompt: isGoodPrompt
              });
            }
          } catch (saveError) {
            console.error("Error saving prompt evaluation:", saveError);
          }
        }
      } catch (error) {
        console.error("Error in prompt evaluation or feedback generation:", error);
        // Don't stop the overall request just because evaluation failed
      }
    }

    const stream = new ReadableStream({
      async start(controller) {
        for await (const item of result.stream) {
          if (item.candidates && item.candidates[0].content && item.candidates[0].content.parts) {
            const textChunk = item.candidates[0].content.parts[0].text || "";
            controller.enqueue(new TextEncoder().encode(textChunk));
          }
        }
        controller.close();
      },
    });
    
    // Add prompt quality score and streak info to headers if available
    if (promptQualityScore !== null && promptQualityDetails !== null) {
      headers['X-Prompt-Quality-Score' as keyof HeadersInit] = promptQualityScore.toString();
      
      // Add dimension scores
      headers['X-Prompt-Goal-Score' as keyof HeadersInit] = promptQualityDetails.goal.toString();
      headers['X-Prompt-Context-Score' as keyof HeadersInit] = promptQualityDetails.context.toString();
      headers['X-Prompt-Expectations-Score' as keyof HeadersInit] = promptQualityDetails.expectations.toString();
      headers['X-Prompt-Source-Score' as keyof HeadersInit] = promptQualityDetails.source.toString();
      
      // Only add streak info if it was successfully calculated
      if (promptFeedback && typeof promptFeedback.feedback === 'string') {
        headers['X-Prompt-Streak' as keyof HeadersInit] = encodeURIComponent(JSON.stringify(promptFeedback));
      }
      
      // Include prompt evaluation as a single JSON object for easier parsing
      // Only include feedback if it's valid
      const evaluationData: any = {
        goalScore: promptQualityDetails.goal,
        contextScore: promptQualityDetails.context,
        expectationsScore: promptQualityDetails.expectations,
        sourceScore: promptQualityDetails.source,
        overallScore: promptQualityScore,
        isGoodPrompt: promptFeedback?.isGoodPrompt
      };
      
      // Only include feedback if it's properly formatted
      if (promptFeedback && typeof promptFeedback.feedback === 'string') {
        evaluationData.feedback = promptFeedback;
      }
      
      headers['X-Prompt-Evaluation' as keyof HeadersInit] = encodeURIComponent(JSON.stringify(evaluationData));
    }
    
    return new Response(stream, { headers });

  } catch (error: unknown) {
    console.error("Error in /api/chat:", error);
    // Add more specific error handling based on potential Vertex AI errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = error && typeof error === 'object' && 'code' in error ? (error as { code: number }).code : undefined;
    
    if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('Unauthenticated')) {
        return NextResponse.json({ message: 'Vertex AI Authentication Error for chat. Check credentials and permissions.' }, { status: 500 });
    }
    if (errorMessage.includes('Could not find location')) {
        return NextResponse.json({ message: `Vertex AI Location Error for chat: The location '${LOCATION}' or model '${MODEL_NAME}' may be invalid.` }, { status: 500 });
    }
    if (errorCode === 7 && errorMessage.includes('Please ensure that project')) { // Quota error example
        return NextResponse.json({ message: 'Vertex AI quota exceeded. Please check your Google Cloud project quotas.'}, { status: 429 });
    }
    return NextResponse.json({ message: errorMessage || 'An unexpected error occurred while calling Vertex AI for chat.' }, { status: 500 });
  }
}

// Combined function to evaluate prompt quality AND generate feedback in a single API call
async function evaluatePromptWithAI(prompt: string, subtask: Subtask) {
  try {
    const combinedEvaluationPrompt = `
      I need you to evaluate the quality of a student's message to an AI assistant and provide personalized feedback.
      
      The student is working on a task, but what I want you to evaluate is NOT the task itself, but rather HOW WELL the student communicated with the AI assistant.
      
      Task context (for your reference only): 
      - Task title: "${subtask.title}"
      - Task description: "${subtask.description}"
      
      THE STUDENT'S MESSAGE TO EVALUATE:
      """
      ${prompt}
      """
      
      Part 1: Evaluate this student message based on these prompt engineering criteria:
      1. Goal (0-100): Does the student's message have a specific, clear goal? Does it use action verbs or questions that clearly state what they need?
      2. Context (0-100): Does the student's message provide context for why they need help or how they plan to use the information?
      3. Expectations (0-100): Does the student's message specify what format or level of detail they want in the response?
      4. Source (0-100): Does the student's message reference relevant facts, constraints, or what they've already tried?
      
      Part 2: Provide personalized feedback on the student's communication style:
      - Write ONE SINGLE PARAGRAPH (3-5 sentences maximum) addressing their overall communication skills
      - Include both strengths and areas for improvement
      - Focus ONLY on their communication style and prompt engineering techniques
      - DO NOT critique the student's task progress or solution ideas
      - Write it as a cohesive paragraph with complete sentences, not as bullet points
      
      Return your evaluation as a JSON object with the following structure:
      {
        "goalScore": 75,
        "contextScore": 60,
        "expectationsScore": 80,
        "sourceScore": 40,
        "overallScore": 64,
        "feedback": "One concise paragraph (3-5 sentences) giving overall feedback on the quality of the student's communication with AI. Mention 1-2 strengths and 1-2 areas for improvement."
      }
      
      DO NOT evaluate the task itself or how well the student is doing on their assignment.
      ONLY evaluate how effectively they've communicated their needs to the AI assistant.
    `;
    
    console.log("evaluatePromptWithAI: Sending combined prompt to Gemini for evaluation and feedback.");
    const model = vertex_ai.getGenerativeModel({ 
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192, // Increased to match the main model configuration
      }
    });
    
    const result = await model.generateContent(combinedEvaluationPrompt);
    const textResult = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log("evaluatePromptWithAI: Received raw textResult from Gemini:", textResult);
    
    const jsonMatch = textResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("evaluatePromptWithAI: Failed to extract JSON from evaluation response. Response text:", textResult);
      throw new Error("Failed to extract JSON from evaluation response");
    }
    
    let combinedData;
    try {
      combinedData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("evaluatePromptWithAI: Failed to parse JSON from evaluation response. JSON string:", jsonMatch[0], "Error:", parseError);
      throw new Error("Failed to parse JSON from evaluation response");
    }

    // Validate that all required score fields exist and are numbers
    const requiredScoreFields = ['goalScore', 'contextScore', 'expectationsScore', 'sourceScore', 'overallScore'];
    for (const field of requiredScoreFields) {
      if (typeof combinedData[field] !== 'number') {
        console.error(`evaluatePromptWithAI: Missing or invalid ${field} in evaluation response`);
        throw new Error(`Missing or invalid ${field} in evaluation response`);
      }
    }
    
    // Validate feedback field
    if (typeof combinedData.feedback !== 'string' || !combinedData.feedback.trim()) {
      console.error("evaluatePromptWithAI: Missing or invalid feedback in evaluation response");
      combinedData.feedback = "Your prompt could be improved by adding more specific details about what you need help with.";
    }

    return {
      goalScore: combinedData.goalScore,
      contextScore: combinedData.contextScore,
      expectationsScore: combinedData.expectationsScore,
      sourceScore: combinedData.sourceScore,
      overallScore: combinedData.overallScore,
      feedback: combinedData.feedback
    };
  } catch (error) {
    console.error("Error in evaluatePromptWithAI function:", error);
    // Instead of returning placeholder scores, propagate the error
    throw error;
  }
}

// Function to format feedback arrays into a cohesive paragraph
function formatFeedbackFromArrays(strengths: string[] = [], tips: string[] = []): string {
  if (!strengths.length && !tips.length) {
    return "No specific feedback available for this prompt.";
  }
  
  let feedbackParagraph = "";
  
  // Add strengths if available
  if (strengths.length > 0) {
    feedbackParagraph += "Your prompt has the following strengths: ";
    
    // Format strengths as a sentence
    if (strengths.length === 1) {
      feedbackParagraph += strengths[0] + ". ";
    } else {
      const lastStrength = strengths.pop();
      feedbackParagraph += strengths.join(", ") + (strengths.length > 0 ? ", and " : "") + lastStrength + ". ";
    }
  }
  
  // Add tips if available
  if (tips.length > 0) {
    feedbackParagraph += "Here's how you could improve: ";
    
    // Format tips as a sentence
    if (tips.length === 1) {
      feedbackParagraph += tips[0] + ". ";
    } else {
      const lastTip = tips.pop();
      feedbackParagraph += tips.join(", ") + (tips.length > 0 ? ", and " : "") + lastTip + ". ";
    }
  }
  
  return feedbackParagraph.trim();
} 