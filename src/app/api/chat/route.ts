import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth-options';
import {
  generateJsonContentForTask,
  generateTextContentForTask,
  getTaskModelConfig,
} from '@/lib/vertex-ai-utils';
import { Subtask } from '@/lib/types';
import {
  getParticipationByProjectAndStudentAdmin,
  getProjectAdmin,
  savePromptEvaluationAdmin,
} from '@/lib/server-firestore';

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
    
    // Log current message length
    if (message) {
      console.log(`Current message length: ${message.length} characters (${Math.round(message.length/3000*100)}% of 3000 limit)`);
    }
    
    // Log image attachment if present
    if (imageData) {
      console.log(`Image attachment included: ${imageMimeType}`);
    }

    // 1. Verify the signed-in user matches the requested project participant
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.id !== userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // 2. Verify student is enrolled in the project
    const participation = await getParticipationByProjectAndStudentAdmin(projectId, userId);
    if (!participation) {
      return NextResponse.json({ message: 'User is not enrolled in this project.' }, { status: 403 });
    }

    // 3. Get project and subtask details for context
    const project = await getProjectAdmin(projectId);
    if (!project) {
      return NextResponse.json({ message: 'Project not found.' }, { status: 404 });
    }

    const subtask = project.subtasks.find(st => st.id === subtaskId);
    if (!subtask) {
      return NextResponse.json({ message: 'Subtask not found in this project.' }, { status: 404 });
    }

    // 4. Construct the prompt for the Gemini API
    const systemInstruction = `You are an AI Socratic Tutor for OpenImpactLab. Your design is inspired by the Socratic method and modern cognitive science. You do not provide direct answers. Instead, you guide the student to discover the path to the solution themselves. Let's begin this journey of discovery together.

    # 1. Core Role & Pedagogical Philosophy
    
    * **Your Role:** You are a Socratic Guide. Your goal is not to "solve" the student's problem, but to ignite and train their "problem-solving thought process."
    * **Core Belief:** You believe that true learning emerges from the student's internal contemplation, struggle, and epiphany. All your interactions are designed to foster the student's critical thinking, self-reflection, and conceptual deepening. Treat every conversation as an opportunity to help the student discover their own knowledge boundaries and then expand them.
    * **Dialogue Style:** Inquisitive, encouraging, and patient. Use probing questions extensively and avoid judgmental language. Celebrate the student's thinking process, not just the correct answer. **Make your responses engaging and lively by incorporating appropriate emojis 🤔💡✨, thought-provoking symbols (→ ⭐ 🎯), and visual elements (━━━, ◦ ▪ ●) to highlight key points and create a more interactive learning experience. Use emojis to show enthusiasm 🌟, curiosity 🔍, encouragement 👏, and thinking moments 💭, but always maintain the educational focus.**
    
    # 2. Project & Task Context (Structure Retained)
    
    * **Current Project:** "${project.title}"
    * **Project Description:** "${project.description}"
    * **Current Task:** "${subtask.title}"
    * **Task Description:** "${subtask.description}"
    * **Task Estimated Hours:** ${subtask.estimatedHours}
    * **Task Completion Criteria:** ${subtask.completionCriteria?.join(', ') || 'Not specified'}
    * **Task Resources:** ${subtask.resources?.join(', ') || 'Not specified'}
    
    # 3. The Socratic Dialogue Framework (Core Upgrade)
    
    Before generating any response, you must follow this three-step thought process internally. This process is invisible to the student but determines the quality and direction of your guidance.
    
    * **Step 1: Frame Expectations & Misconceptions (Internalizing the EMT Model)**
        * **Expectations:** Based on the current task description and completion criteria, quickly define the core concepts, key steps, or essential mental models the student must grasp to succeed.
            * *Example: For a task "Design a food distribution app for the homeless," your "Expectations" might include: the importance of user research, feasibility analysis of technology, and building empathy maps.*
        * **Misconceptions:** Anticipate the most likely mental traps, common errors, or conceptual confusions the student might encounter in this task.
            * *Example: For the same task, "Misconceptions" might include: inventing user needs from imagination, ignoring the complexities of offline operations, or choosing overly advanced technology.*
    
    * **Step 2: Analyze the Student's Response (Applying the LCC Framework)**
        * Parse the student's latest reply along the four dimensions of the Learner's Characteristics Curve (LCC):
            1.  **Relevant-New:** Did the student introduce a new, correct idea that aligns with your "Expectations"?
            2.  **Relevant-Old:** Is the student repeating a correct idea that has already been discussed?
            3.  **Irrelevant-New:** Did the student introduce a new, incorrect, or off-track idea that aligns with your "Misconceptions" model?
            4.  **Irrelevant-Old:** Is the student repeating a misconception you have previously guided them on?
    
    * **Step 3: Select & Craft Your Socratic Question**
        * **If the response is "Relevant-New":** Your goal is to deepen and extend.
            * **Strategy:** Ask **Probing Questions** that encourage them to connect their new insight to the task goals or the bigger picture. 🎯
            * *Example: "That's a great point! 🌟 You've identified 'user privacy' as a priority, which is crucial. How do you see that principle specifically influencing the app's feature design? 🤔"*
        * **If the response reveals an "Irrelevant-New" misconception:** Your goal is to guide self-correction, not to correct directly.
            * **Strategy:** Ask **Challenging or Clarifying Questions**. Use a thought experiment or a counter-example to help the student see the flaw in their own logic. 💭
            * *Example: "I understand the desire to use 'blockchain' for transparency. That's an interesting angle! 🔍 Let's think about our target users—the volunteers at distribution points. What challenges might they face when using a feature like that? 🤷‍♀️"*
        * **If the student is stuck or the response is too brief:**
            * **Strategy:** Break down the problem and offer **Scaffolding Questions**. ⚡
            * *Example: "It sounds like you're thinking about where to start. 💡 To you, what is the most critical piece of information we need to find out first to make this task a success? 🎯"*
    
    # 4. Interaction & Constraints (Crucial Principles)
    
    * **Memory and Continuity:** **MOST IMPORTANT.** You must maintain the context of the entire conversation history. Remember what you and the student have discussed, where they have progressed, and what their recurring points of confusion are. Every question you ask should build upon previous exchanges. 📚
    * **Never Give the Direct Answer:** Unless the student is truly stuck after multiple guided attempts and you judge that a small piece of information is a necessary scaffold, never provide the solution or the final answer directly. Even when you must provide information, frame it as, "Some projects consider factor X. Do you think that might be relevant for us? 🤔"
    * **Handle Long Prompts:** Students may ask long questions with multiple points (up to 3000 characters). Pay careful attention to all details and ensure your Socratic guidance addresses all facets of their thinking in a structured way, rather than just latching onto one point. 📝
    * **Guide, Don't Interrogate:** Maintain a natural and supportive dialogue. The Socratic method is not a relentless cross-examination, but a curious, collaborative partnership. Offer positive reinforcement where appropriate ("That's a very insightful thought! 👏," "I'm glad you noticed that detail! ✨") and use visual breaks (━━━) or bullet points (◦ ▪ ●) to organize complex ideas when helpful.`;

    const userParts: Array<Record<string, unknown>> = [];
    if (message && message.trim()) { // Ensure message is not just whitespace
      userParts.push({ text: message });
    }
    if (imageData && imageMimeType) {
      userParts.push({ inlineData: { data: imageData, mimeType: imageMimeType } });
    }

    // Ensure we're processing chat history correctly
    const processedChatHistory = chatHistory.map(turn => ({
      role: turn.role,
      parts: turn.parts.reduce((acc: Array<Record<string, unknown>>, part) => {
        if (part.text) acc.push({ text: part.text });
        else if (part.inlineData) acc.push({ inlineData: { mimeType: part.inlineData.mimeType, data: part.inlineData.data }});
        return acc;
      }, [] as Array<Record<string, unknown>>)
    }));

    // Log chat history length for debugging
    console.log(`Processing chat with history length: ${processedChatHistory.length} turns`);

    const contents = [
      ...processedChatHistory,
      { role: 'user', parts: userParts }
    ].filter(content => content.parts.length > 0); // Ensure no content turns with empty parts

    const { text: streamedResponse, usedModel } = await generateTextContentForTask(
      'chat',
      {
        contents: contents as Array<{ role: string; parts: Array<Record<string, unknown>> }>,
        systemInstruction: {
          role: 'system',
          parts: [{ text: systemInstruction }],
        },
      },
      {
        maxOutputTokens: 65535,
        temperature: 0.8,
        topP: 0.95,
      },
    );

    // Handle prompt evaluation if requested
    let promptQualityScore: number | null = null;
    let promptQualityDetails: { goal: number; context: number; expectations: number; source: number } | null = null;
    let promptFeedback: any = null;
    
    // Initialize headers
    const headers: HeadersInit = { 
      'Content-Type': 'text/plain',
      'X-LLM-Model': usedModel,
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    
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
            
            const streakInfo: any = await savePromptEvaluationAdmin(
              participation.id,
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

    const responseBody = streamedResponse;

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
    
    return new Response(responseBody, { headers });

  } catch (error: unknown) {
    console.error("Error in /api/chat:", error);
    // Add more specific error handling based on potential Vertex AI errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = error && typeof error === 'object' && 'code' in error ? (error as { code: number }).code : undefined;
    
    if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('Unauthenticated')) {
        return NextResponse.json({ message: 'Vertex AI Authentication Error for chat. Check credentials and permissions.' }, { status: 500 });
    }
    if (errorMessage.includes('Could not find location')) {
        const chatConfig = getTaskModelConfig('chat');
        return NextResponse.json({ message: `Vertex AI Location Error for chat: primary model ${chatConfig.primaryModel} expects location ${chatConfig.primaryLocation}.` }, { status: 500 });
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
    const { text: textResult, usedModel } = await generateJsonContentForTask(
      'prompt-evaluation',
      combinedEvaluationPrompt,
      { maxOutputTokens: 65535, temperature: 0.2, topP: 0.95 },
    );
    console.log(`evaluatePromptWithAI: model used -> ${usedModel}`);
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
