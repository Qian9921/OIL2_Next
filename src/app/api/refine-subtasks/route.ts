import { NextRequest, NextResponse } from 'next/server';
import {
  createGenerativeModelBundle,
  sanitizeInput,
  sanitizeArrayInput,
  validateAIResponse,
  parseJsonArrayResponse,
  withGenerativeModelFallback
} from '@/lib/vertex-ai-utils';

// Helper to sanitize subtask data
function sanitizeSubtaskData(subtask: SubtaskData): SubtaskData {
  return {
    title: sanitizeInput(subtask.title),
    description: sanitizeInput(subtask.description),
    estimatedHours: subtask.estimatedHours
  };
}

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

    // Use shared generative model with configured token limit
    const generativeModelBundle = createGenerativeModelBundle('subtask-refinement', { maxOutputTokens: 4096, responseMimeType: 'application/json' });

    // Sanitize all input data using shared helpers
    const sanitizedProjectTitle = sanitizeInput(body.projectTitle);
    const sanitizedProjectDescription = sanitizeInput(body.projectDescription);
    const sanitizedProjectDifficulty = body.projectDifficulty;
    const sanitizedProjectRequirements = sanitizeArrayInput(body.projectRequirements);
    const sanitizedProjectLearningGoals = sanitizeArrayInput(body.projectLearningGoals);
    const sanitizedExistingSubtasks = body.existingSubtasks.map(subtask => sanitizeSubtaskData(subtask));

    const existingSubtasksString = sanitizedExistingSubtasks.length > 0
      ? sanitizedExistingSubtasks.map((st, i) => 
          `Subtask ${i + 1}:\nTitle: ${st.title || '(not provided)'}\nDescription: ${st.description || '(not provided)'}\nEstimated Hours: ${st.estimatedHours || '(not provided)'}`
        ).join('\n\n')
      : 'No existing subtasks provided. Please generate an initial set.';

    const requirementsString = sanitizedProjectRequirements.join('; ') || 'Not specified';
    const learningGoalsString = sanitizedProjectLearningGoals.join('; ') || 'Not specified';

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
- Open Source: Encourage the use of open-source software, tools, data sources, and technologies while allowing students flexibility in their choices.
- Assessment-Ready: Include specific, measurable outcomes that clearly indicate what successful completion looks like.
- Flexibility: Focus on the learning outcomes and deliverables rather than mandating specific tools or methods.

Project Details:
Title: ${sanitizedProjectTitle}
Description: ${sanitizedProjectDescription}
Difficulty: ${sanitizedProjectDifficulty}
Participation Requirements: ${requirementsString}
Learning Goals: ${learningGoalsString}
Existing Subtasks:
${existingSubtasksString}

For each subtask, provide:
1. A concise and motivating 'title'.
2. A clear 'description' that includes:
   - What the student needs to do (specific actions)
   - Why they're doing it (context and purpose)
   - How to approach it (suggested steps, not prescriptive)
   - What success looks like (qualitative criteria)
   - Suggested tools or resources (as recommendations, not requirements)
   - The expected output or deliverable
3. A realistic 'estimatedHours' (integer) for completion, considering the project difficulty:
   - For beginner projects: typically 2-5 hours per subtask
   - For intermediate projects: typically 4-8 hours per subtask
   - For advanced projects: typically 6-12 hours per subtask
   Always set realistic expectations that won't overwhelm students.

IMPORTANT: The task descriptions will be used to evaluate whether students have successfully completed the task. An AI system will compare the task description against the student's work in their GitHub repository and score it. Therefore, the description MUST include qualitative criteria for success that are specific and measurable.

IMPORTANT: Each task description should clearly answer the question: "How will we know when this task is done correctly?" Focus on the quality and characteristics of the final deliverable rather than the specific tools used to create it.

IMPORTANT: When suggesting tools, platforms, or resources, emphasize they are recommendations, not requirements. Students should be free to choose alternatives that accomplish the same goals. For example:
- Instead of "Use GIMP to edit images," say "Edit images using software of your choice (GIMP is a recommended free, open-source option)"
- Instead of "Build with WordPress," say "Create a website using a content management system or framework of your choice (open-source options like WordPress, Hugo, or Jekyll are recommended)"
- Instead of "Use React," say "Develop the frontend using a JavaScript framework of your choice (open-source options like React, Vue.js, or Angular are recommended)"

IMPORTANT: Recommend open-source options when suggesting tools, but always frame them as suggestions rather than requirements.

Output the refined/generated subtasks STRICTLY as a JSON array of objects. Each object in the array must have "title", "description", and "estimatedHours" keys.
Example of one subtask object in the array:
{
  "title": "Create an Interactive Data Visualization Dashboard",
  "description": "Develop an interactive dashboard to visualize the environmental data you've collected. Your dashboard should include at least 3 different visualization types (e.g., bar charts, line graphs, maps) and allow users to filter or interact with the data. Consider using visualization libraries like D3.js, Chart.js, or any similar tool you're comfortable with. The final product should be responsive, visually appealing, and effectively communicate key insights from your data. Success criteria: The dashboard loads without errors, displays data correctly, includes interactive elements, and follows accessibility best practices.",
  "estimatedHours": 6
}

If refining existing subtasks, improve their clarity, detail, estimated hours, and alignment with goals/requirements. If generating new ones, ensure they form a logical progression for the project and cover the learning goals.
Provide ONLY the JSON array in your response, without any surrounding text, explanations, or markdown. Ensure the JSON is valid and complete.`;

    // Generate content using the AI model
    const { value: result, usedModel } = await withGenerativeModelFallback(
      generativeModelBundle,
      (model) => model.generateContent(prompt),
    );
    console.log(`Subtask refinement model used: ${usedModel}`);
    
    // Validate the AI response using shared helper
    const validationResult = validateAIResponse(result.response);
    
    if (!validationResult.isValid) {
      return NextResponse.json({ message: validationResult.error }, { status: 500 });
    }
    
    console.log('AI raw response preview:', validationResult.responseText.slice(0, 1200));
    // Parse the JSON array response using shared helper
    const parseResult = parseJsonArrayResponse(validationResult.responseText);
    
    if (!parseResult.success) {
      console.error("Failed to parse subtasks AI response:", parseResult.error);
      return NextResponse.json({ 
        message: "The AI subtask response could not be processed. Please try again with simpler input." 
      }, { status: 500 });
    }
    
    // Additional validation for subtasks
    const refinedSubtasksJson = parseResult.parsedJson as RefinedSubtask[];
    
    // Validate each subtask has the minimum required fields
    const invalidSubtasks = refinedSubtasksJson.filter(st => 
      !st.title || !st.description || typeof st.estimatedHours !== 'number'
    );
    
    if (invalidSubtasks.length > 0) {
      console.error("Some subtasks are missing required fields:", invalidSubtasks);
      return NextResponse.json({ 
        message: "Some subtasks are missing required fields. Please try again with simpler input."
      }, { status: 500 });
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
    
    // Return the refined subtasks
    return NextResponse.json(refinedSubtasksJson, { status: 200 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in /api/refine-subtasks:", error);
    if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('Unauthenticated')) {
        return NextResponse.json({ message: 'Vertex AI Authentication Error for subtasks. Check credentials and permissions.' }, { status: 500 });
    }
    if (errorMessage.includes('Could not find location')) {
        return NextResponse.json({ message: `Vertex AI Location Error: Check your Vertex AI region and model availability.` }, { status: 500 });
    }
    return NextResponse.json({ message: errorMessage || 'An unexpected error occurred while calling Vertex AI for subtasks.' }, { status: 500 });
  }
} 