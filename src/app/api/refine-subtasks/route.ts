import { NextRequest, NextResponse } from 'next/server';
import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'openimpactlab-v2';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const MODEL_NAME = 'gemini-2.5-flash-preview-05-20'; // Or your preferred model for this task

interface SubtaskData {
  title: string;
  description: string;
  estimatedHours?: number;
}

interface RefineSubtasksRequestData {
  projectTitle: string;
  projectDescription: string;
  projectDifficulty: 'beginner' | 'intermediate' | 'advanced';
  projectRequirements: string[];
  projectLearningGoals: string[];
  existingSubtasks: SubtaskData[];
}

// Define the expected structure for a refined subtask, matching Omit<Subtask, 'id' | 'order' | 'resources' | 'completionCriteria'>
// as the AI will focus on these core elements.
interface RefinedSubtask {
  title: string;
  description: string;
  estimatedHours: number; // AI should always suggest this
  // Resources and completionCriteria can be added later or kept as empty arrays by default on the frontend
}

export async function POST(req: NextRequest) {
  try {
    const body: RefineSubtasksRequestData = await req.json();

    if (!body.projectTitle?.trim() || !body.projectDescription?.trim()) {
      return NextResponse.json({ message: 'Project title and description are required to refine subtasks.' }, { status: 400 });
    }

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
        maxOutputTokens: 4096, // Increased from 2048 to ensure we get complete responses
        temperature: 0.5, // Lowered from 0.6 for more predictable, focused responses
        topP: 1,
        topK: 32,
      },
    });

    const existingSubtasksString = body.existingSubtasks.length > 0
      ? body.existingSubtasks.map((st, i) => 
          `Subtask ${i + 1}:\nTitle: ${st.title || '(not provided)'}\nDescription: ${st.description || '(not provided)'}\nEstimated Hours: ${st.estimatedHours || '(not provided)'}`
        ).join('\n\n')
      : 'No existing subtasks provided. Please generate an initial set.';

    const requirementsString = body.projectRequirements.join('; ') || 'Not specified';
    const learningGoalsString = body.projectLearningGoals.join('; ') || 'Not specified';

    const prompt = 
`You are an expert curriculum designer specializing in creating engaging and practical project-based learning experiences for high school students on social impact themes.
Based on the following project information, please refine the existing subtasks or generate a comprehensive set of 3-5 subtasks if none are provided or if the existing ones are insufficient. 
Each subtask should be a clear, actionable step for a student and align with the project's requirements and learning goals.
Adhere to the following standards:
- Alignment: Ensure subtasks directly contribute to achieving the stated learning goals and are feasible given the participation requirements.
- Clarity: Use simple, direct language for titles and descriptions.
- Actionability: Descriptions should clearly state what the student needs to do.
- Logical Flow: Subtasks should follow a logical progression.
- Feasibility: Estimated hours should be realistic for high school students.
- Conciseness: Keep descriptions focused and under 250 characters if possible. Avoid lengthy explanations.

Project Details:
Title: ${body.projectTitle}
Description: ${body.projectDescription}
Difficulty: ${body.projectDifficulty}
Participation Requirements: ${requirementsString}
Learning Goals: ${learningGoalsString}
Existing Subtasks:
${existingSubtasksString}

For each subtask, provide:
1.  A concise and motivating 'title'.
2.  A brief but clear 'description' of what the student needs to do, learn, or achieve. Be specific but concise.
3.  A realistic 'estimatedHours' (integer) for completion, considering the project difficulty:
    - For beginner projects: typically 2-5 hours per subtask
    - For intermediate projects: typically 4-8 hours per subtask
    - For advanced projects: typically 6-12 hours per subtask
    Always set realistic expectations that won't overwhelm students.

Output the refined/generated subtasks STRICTLY as a JSON array of objects. Each object in the array must have "title", "description", and "estimatedHours" keys.
Example of one subtask object in the array:
{
  "title": "Research Local Water Contamination Issues",
  "description": "Investigate common water pollutants in your community. Identify their sources and health impacts. Document your findings in a brief report.",
  "estimatedHours": 5
}

If refining existing subtasks, improve their clarity, detail, estimated hours, and alignment with goals/requirements. If generating new ones, ensure they form a logical progression for the project and cover the learning goals.
Provide ONLY the JSON array in your response, without any surrounding text, explanations, or markdown. Ensure the JSON is valid and complete.`;

    const result = await generativeModel.generateContent(prompt);
    const response = result.response;

    if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("Vertex AI response missing expected text content for subtasks:", JSON.stringify(response, null, 2));
      return NextResponse.json({ message: 'AI subtask response was empty or in an unexpected format.' }, { status: 500 });
    }

    const responseText = response.candidates[0].content.parts[0].text;
    console.log("Vertex AI Subtask Response Text:", responseText);

    let refinedSubtasksJson: RefinedSubtask[];
    try {
      // Clean the response of any markdown code blocks or extra characters
      const cleanedResponseText = responseText.replace(/```json\n|\```/g, '').trim();
      
      // Check if the JSON is possibly truncated by looking for common issues
      if (!cleanedResponseText.endsWith(']') || 
          cleanedResponseText.includes('...') || 
          (cleanedResponseText.match(/\{/g) || []).length !== (cleanedResponseText.match(/\}/g) || []).length) {
        console.error("Potentially truncated or incomplete JSON from AI:", cleanedResponseText);
        return NextResponse.json({ message: "AI generated an incomplete response. Please try again or provide more details." }, { status: 500 });
      }
      
      // Parse the JSON
      refinedSubtasksJson = JSON.parse(cleanedResponseText);
      
      // Additional validation to ensure it's an array and objects have required fields
      if (!Array.isArray(refinedSubtasksJson)) {
        console.error("Parsed JSON is not an array:", refinedSubtasksJson);
        throw new Error("AI returned data that is not a valid array of subtasks");
      }
      
      // Validate each subtask has the minimum required fields
      const invalidSubtasks = refinedSubtasksJson.filter(st => 
        !st.title || !st.description || typeof st.estimatedHours !== 'number'
      );
      
      if (invalidSubtasks.length > 0) {
        console.error("Some subtasks are missing required fields:", invalidSubtasks);
        throw new Error("Some subtasks are missing required fields (title, description, or estimatedHours)");
      }
      
      // Check if any descriptions are truncated (ending with ellipsis or abruptly)
      const truncatedDescriptions = refinedSubtasksJson.filter(st => 
        st.description.endsWith('...') || 
        st.description.match(/\w$/) // Ends with a word character (no punctuation)
      );
      
      if (truncatedDescriptions.length > 0) {
        console.warn("Some subtask descriptions appear to be truncated:", truncatedDescriptions);
        // We'll still proceed but log a warning
      }

    } catch (parseError: any) {
      console.error("Failed to parse Vertex AI subtask response as JSON:", parseError, "Original response:", responseText);
      return NextResponse.json({ message: `Failed to parse AI subtask response. Raw response: ${responseText}` }, { status: 500 });
    }

    return NextResponse.json(refinedSubtasksJson, { status: 200 });

  } catch (error: any) {
    console.error("Error in /api/refine-subtasks:", error);
    if (error.message?.includes('PERMISSION_DENIED') || error.message?.includes('Unauthenticated')) {
        return NextResponse.json({ message: 'Vertex AI Authentication Error for subtasks. Check credentials and permissions.' }, { status: 500 });
    }
    if (error.message?.includes('Could not find location')) {
        return NextResponse.json({ message: `Vertex AI Location Error for subtasks: The location '${LOCATION}' or model '${MODEL_NAME}' may be invalid.` }, { status: 500 });
    }
    return NextResponse.json({ message: error.message || 'An unexpected error occurred while calling Vertex AI for subtasks.' }, { status: 500 });
  }
} 