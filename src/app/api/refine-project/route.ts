import { NextRequest, NextResponse } from 'next/server';
import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'openimpactlab-v2'; // GCP Project ID
// Ensure this LOCATION is a valid Vertex AI region where your model is available (e.g., us-central1)
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'; 
// Use a standard Vertex AI model identifier for Gemini 1.5 Flash or your specific model ID
const MODEL_NAME = 'gemini-2.5-flash-preview-05-20'; 

interface RefineRequestData {
  title: string;
  shortDescription: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  maxParticipants: string;
  deadline: string;
  estimatedHours: string;
  tags: string[];
  requirements: string[];
  learningGoals: string[];
}

interface RefinedProjectDetails {
  title?: string;
  shortDescription?: string;
  description?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  maxParticipants?: number;
  deadline?: string;
  estimatedHours?: number;
  estimatedDays?: number;
  tags?: string[];
  requirements?: string[];
  learningGoals?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body: RefineRequestData = await req.json();

    if (!body.title?.trim() && !body.description?.trim()) {
      return NextResponse.json({ message: 'Please provide at least a title or description to refine.' }, { status: 400 });
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
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 1,
        topK: 32,
      },
    });

    const currentRequirementsString = body.requirements.length > 0 ? body.requirements.join(', ') : '(none provided)';
    const currentLearningGoalsString = body.learningGoals.length > 0 ? body.learningGoals.join(', ') : '(none provided)';

    const prompt = 
`You are an expert curriculum designer and project manager for social impact initiatives involving high school students.
Your task is to refine the following project details to make them more engaging, clear, feasible, and appealing to students and NGOs. 
Adhere to the following standards for all generated content:
- Clarity: Use simple, direct language. Avoid jargon.
- Engagement: Make the project sound exciting and impactful.
- Feasibility: Ensure suggestions are realistic for high school students.
- Conciseness: Be brief and to the point, especially for short descriptions and tags.
- Digital Focus: Ensure all projects are digitally focused, not physical. Projects should involve technology, digital platforms, online tools, or digital content creation.
- Open Source: Encourage the use of open-source software, tools, data sources, and technologies while allowing flexibility in student choices.
- Flexibility: Focus on learning goals and outcomes rather than mandating specific tools or technologies.

The project details are:
Title: ${body.title || '(not provided)'}
Short Description: ${body.shortDescription || '(not provided)'}
Detailed Description: ${body.description || '(not provided)'}
Difficulty Level: ${body.difficulty || '(not provided)'}
Maximum Participants: ${body.maxParticipants || '(not specified, consider suggesting if relevant)'}
Estimated Hours: ${body.estimatedHours || '(not specified, consider suggesting if relevant)'}
Current Tags: ${body.tags.length > 0 ? body.tags.join(', ') : '(none provided)'}
Current Participation Requirements: ${currentRequirementsString}
Current Learning Goals: ${currentLearningGoalsString}

Provide specific, actionable suggestions.
- If a field is well-written, acknowledge it and suggest minor improvements or leave it as is.
- If numerical fields like max participants or estimated hours are missing or seem off, suggest reasonable values.
- Suggest 3-5 relevant and concise tags if current ones can be improved or if none are provided. Include at least one technology or digital-related tag and consider adding "Open Source" as a tag when appropriate.
- Refine or generate 2-3 clear and concise participation requirements. These should be essential prerequisites (e.g., "Interest in digital technologies", "Access to a computer and internet").
- Refine or generate 3-5 specific and measurable learning goals. These should state what students will know or be able to do after completing the project (e.g., "Create a digital solution for a community problem", "Develop skills in web-based research and data visualization").
- For the estimatedDays field, provide an integer value representing the reasonable number of days to complete the project:
  - If the project is beginner level, suggest 14-28 days (2-4 weeks)
  - If the project is intermediate level, suggest 28-42 days (4-6 weeks)
  - If the project is advanced level, suggest 42-56 days (6-8 weeks)

IMPORTANT: All projects must be digital-focused, not physical. If the original project involves physical activities or in-person events, modify it to emphasize digital components, online collaboration, or technology-based solutions instead.

IMPORTANT: When suggesting tools, platforms, or technologies in the description, recommend open-source and freely available options, but frame them as suggestions rather than requirements. For example:
- Instead of "Use GIMP to edit images," say "Edit images using software of your choice (open-source options like GIMP are recommended)"
- Instead of "Build with WordPress," say "Create a website using a content management system of your choice (open-source options like WordPress or Drupal are recommended)"
- Instead of "Code in Python," say "Develop using a programming language of your choice (open-source languages like Python or JavaScript are recommended)"
- Instead of "Use open datasets from Data.gov," say "Analyze data from sources of your choice (open data repositories like Kaggle or Data.gov are recommended)"

Return the refined information strictly in the following JSON format only (no markdown, no commentary outside the JSON):
{
  "title": "(refined title)",
  "shortDescription": "(refined short description, max 150 characters)",
  "description": "(refined detailed description)",
  "difficulty": "(beginner/intermediate/advanced or original value)",
  "maxParticipants": (number or null, or original value),
  "estimatedDays": (integer number of days to complete the project),
  "estimatedHours": (number or null, or original value),
  "tags": ["tag1", "tag2", "tag3"],
  "requirements": ["requirement1", "requirement2"],
  "learningGoals": ["goal1", "goal2", "goal3"]
}

Ensure the shortDescription is concise and under 150 characters.
Focus on clarity, impact, student engagement, and feasibility for high school students.
Example of good output (partial):
{
  "title": "Digital Ocean Guardians: Interactive Marine Conservation Platform",
  "shortDescription": "Create an interactive web platform to raise awareness about ocean conservation using digital tools of your choice.",
  "estimatedDays": 21,
  "requirements": ["Access to a computer with internet", "Interest in digital technologies and environmental issues"],
  "learningGoals": ["Design and build a website using web development tools of your choice (open-source options recommended)", "Create engaging digital content about marine conservation", "Analyze and visualize environmental data using tools of your choice"]
}

Input to refine:
Title: ${body.title}
Short Description: ${body.shortDescription}
Description: ${body.description}
Difficulty: ${body.difficulty}
Max Participants: ${body.maxParticipants}
Deadline: ${body.deadline || '(not specified)'}
Estimated Hours: ${body.estimatedHours}
Tags: ${JSON.stringify(body.tags)}
Requirements: ${JSON.stringify(body.requirements)}
Learning Goals: ${JSON.stringify(body.learningGoals)}

Please provide only the JSON object in your response, without any surrounding text or explanations. Ensure the JSON is valid and complete. Remember to focus exclusively on digital, technology-based projects that encourage but don't mandate the use of open-source software and resources.`;

    const result = await generativeModel.generateContent(prompt);
    const response = result.response;
    
    if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("Vertex AI response missing expected text content:", JSON.stringify(response, null, 2));
      return NextResponse.json({ message: 'AI response was empty or in an unexpected format.' }, { status: 500 });
    }

    const responseText = response.candidates[0].content.parts[0].text;
    console.log("Vertex AI Response Text:", responseText);

    let refinedJson: RefinedProjectDetails;
    try {
      const cleanedResponseText = responseText.replace(/```json\n|```/g, '').trim();
      refinedJson = JSON.parse(cleanedResponseText);
    } catch (parseError: unknown) {
      console.error("Failed to parse Vertex AI response as JSON:", parseError, "Original response:", responseText);
      return NextResponse.json({ message: `Failed to parse AI response. Raw response: ${responseText}` }, { status: 500 });
    }

    return NextResponse.json(refinedJson, { status: 200 });

  } catch (error: unknown) {
    console.error("Error in /api/refine-project:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('Unauthenticated')) {
        return NextResponse.json({ message: 'Vertex AI Authentication Error. Ensure GOOGLE_APPLICATION_CREDENTIALS is set correctly and the service account has Vertex AI User role.' }, { status: 500 });
    }
    if (errorMessage.includes('Could not find location')) {
        return NextResponse.json({ message: `Vertex AI Location Error: The location '${LOCATION}' is likely invalid or the model '${MODEL_NAME}' is not available there. Please check your Vertex AI region and model availability.` }, { status: 500 });
    }
    return NextResponse.json({ message: errorMessage || 'An unexpected error occurred while calling Vertex AI.' }, { status: 500 });
  }
} 