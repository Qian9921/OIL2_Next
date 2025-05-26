import { NextRequest, NextResponse } from 'next/server';
import { VertexAI, HarmCategory, HarmBlockThreshold, Part } from '@google-cloud/vertexai';
import { getUser, getProject, getParticipationByProjectAndStudent, savePromptEvaluation } from '@/lib/firestore'; // Assuming these exist
import { Project, Participation, Subtask } from '@/lib/types';

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
    maxOutputTokens: 2048,
    temperature: 0.8, // Slightly higher for more conversational/creative responses
    topP: 0.95,
  },
});

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestData = await req.json();
    const { userId, projectId, subtaskId, message, chatHistory = [], imageData, imageMimeType, evaluatePromptQuality } = body;

    if (!userId || !projectId || !subtaskId || (!message && !imageData)) { // Message or image is required
      return NextResponse.json({ message: 'Missing required fields: userId, projectId, subtaskId, and message or image.' }, { status: 400 });
    }
    if (imageData && !imageMimeType) {
      return NextResponse.json({ message: 'imageMimeType is required when imageData is provided.' }, { status: 400 });
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
    Task Resources: ${subtask.resources?.join(', ') || 'Not specified'}`; 

    const userParts: Part[] = [];
    if (message && message.trim()) { // Ensure message is not just whitespace
      userParts.push({ text: message });
    }
    if (imageData && imageMimeType) {
      userParts.push({ inlineData: { data: imageData, mimeType: imageMimeType } });
    }

    const contents = [
      ...chatHistory.map(turn => ({
        role: turn.role,
        parts: turn.parts.reduce((acc: Part[], part) => {
          if (part.text) acc.push({ text: part.text });
          else if (part.inlineData) acc.push({ inlineData: { mimeType: part.inlineData.mimeType, data: part.inlineData.data }});
          return acc;
        }, [] as Part[])
      })),
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

    // Evaluate prompt quality if requested
    let promptQualityScore: number | null = null;
    let promptQualityDetails: any = null;
    let streakInfo: { currentStreak: number; bestStreak: number; isGoodPrompt: boolean } | null = null;
    
    if (evaluatePromptQuality && message) {
      try {
        // Call Gemini to evaluate the prompt quality
        const qualityResult = await evaluatePromptWithAI(message, subtask);
        promptQualityScore = qualityResult.overallScore;
        promptQualityDetails = {
          goal: qualityResult.goalScore,
          context: qualityResult.contextScore,
          expectations: qualityResult.expectationsScore,
          source: qualityResult.sourceScore
        };
        
        // Save the prompt evaluation to Firebase
        if (participation) {
          streakInfo = await savePromptEvaluation(
            participation.id,
            subtaskId,
            {
              goalScore: qualityResult.goalScore,
              contextScore: qualityResult.contextScore,
              expectationsScore: qualityResult.expectationsScore,
              sourceScore: qualityResult.sourceScore,
              overallScore: qualityResult.overallScore,
              prompt: message
            }
          );
        }
      } catch (evalError) {
        console.error("Error evaluating prompt quality:", evalError);
        // Continue with the main functionality even if evaluation fails
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

    const headers: HeadersInit = { 'Content-Type': 'text/plain; charset=utf-8' };
    
    // Add prompt quality score and streak info to headers if available
    if (promptQualityScore !== null) {
      headers['X-Prompt-Quality-Score'] = promptQualityScore.toString();
      
      if (promptQualityDetails) {
        headers['X-Prompt-Quality-Details'] = encodeURIComponent(JSON.stringify(promptQualityDetails));
      }
      
      if (streakInfo) {
        headers['X-Prompt-Streak'] = encodeURIComponent(JSON.stringify(streakInfo));
      }
    }

    return new Response(stream, { headers });

  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    // Add more specific error handling based on potential Vertex AI errors
    if (error.message?.includes('PERMISSION_DENIED') || error.message?.includes('Unauthenticated')) {
        return NextResponse.json({ message: 'Vertex AI Authentication Error for chat. Check credentials and permissions.' }, { status: 500 });
    }
    if (error.message?.includes('Could not find location')) {
        return NextResponse.json({ message: `Vertex AI Location Error for chat: The location '${LOCATION}' or model '${MODEL_NAME}' may be invalid.` }, { status: 500 });
    }
    if (error.code === 7 && error.message?.includes('Please ensure that project')) { // Quota error example
        return NextResponse.json({ message: 'Vertex AI quota exceeded. Please check your Google Cloud project quotas.'}, { status: 429 });
    }
    return NextResponse.json({ message: error.message || 'An unexpected error occurred while calling Vertex AI for chat.' }, { status: 500 });
  }
}

// Function to evaluate prompt quality using Gemini
async function evaluatePromptWithAI(prompt: string, subtask: Subtask) {
  try {
    const evaluationPrompt = `
      I need you to evaluate the quality of a student's prompt based on the following criteria from effective prompt design. 
      Score each category from 0-100 and provide an overall score.
      
      The student is working on this task: "${subtask.title}"
      Task description: "${subtask.description}"
      
      Their prompt is: "${prompt}"
      
      Evaluate this prompt based on:
      1. Goal (0-100): Does it have a specific, clear goal? Does it use action verbs or questions?
      2. Context (0-100): Does it provide context for why they need this information or how they plan to use it?
      3. Expectations (0-100): Does it specify format or audience they want the response tailored to?
      4. Source (0-100): Does it reference known information or constraints?
      
      Return ONLY a JSON object with scores in this exact format:
      {
        "goalScore": 75,
        "contextScore": 60,
        "expectationsScore": 80,
        "sourceScore": 40,
        "overallScore": 64
      }
    `;
    
    const model = vertex_ai.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(evaluationPrompt);
    const textResult = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON from the response
    const jsonMatch = textResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from evaluation response");
    }
    
    const scoreData = JSON.parse(jsonMatch[0]);
    return {
      goalScore: scoreData.goalScore || 0,
      contextScore: scoreData.contextScore || 0,
      expectationsScore: scoreData.expectationsScore || 0,
      sourceScore: scoreData.sourceScore || 0,
      overallScore: scoreData.overallScore || 0
    };
  } catch (error) {
    console.error("Error evaluating prompt quality:", error);
    // Return default scores in case of error
    return {
      goalScore: 50,
      contextScore: 50,
      expectationsScore: 50,
      sourceScore: 50,
      overallScore: 50
    };
  }
} 