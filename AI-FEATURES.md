# AI Features Documentation

This document provides detailed information about the AI features integrated into the OpenImpactLab platform.

## Overview

The platform leverages Google's Vertex AI with Gemini models to provide several AI-powered features:

1. **AI Tutor**: Provides personalized guidance for students on specific project tasks
2. **Prompt Quality Evaluation**: Analyzes and scores student prompts to improve prompt engineering skills
3. **Prompt Streak System**: Gamifies the learning experience by tracking and rewarding high-quality prompts

## AI Tutor Implementation

### Architecture

The AI tutor is implemented as a chat interface where students can:
- Ask questions about their current task
- Upload images for visual context
- Receive guidance without direct answers

### Technical Details

- **API Endpoint**: `src/app/api/chat/route.ts`
- **Model**: Gemini 2.5 Flash Preview (`gemini-2.5-flash-preview-05-20`)
- **Response Format**: Streaming text for real-time interaction

### System Instructions

The AI tutor is configured with the following instructions:

```
You are a friendly and helpful AI tutor for OpenImpactLab, a platform where students work on social impact projects.
You are assisting a student with a specific task within a project.
Your goal is to guide the student, help them understand concepts, and solve problems related to their task.
Be encouraging and break down complex topics if needed. Do not give direct answers unless the student is truly stuck and has made an effort.
Instead, ask guiding questions to help them arrive at the solution themselves.
Keep your responses concise and focused on the task at hand.
```

The system instructions also include context about the current project and task.

## Prompt Quality Evaluation

### Evaluation Criteria

Each student prompt is evaluated on four dimensions:

1. **Goal (0-100)**: Does it have a specific, clear goal? Does it use action verbs or questions?
2. **Context (0-100)**: Does it provide context for why they need this information or how they plan to use it?
3. **Expectations (0-100)**: Does it specify format or audience they want the response tailored to?
4. **Source (0-100)**: Does it reference known information or constraints?

An overall score is calculated based on these four dimensions.

### Implementation Details

The evaluation process is triggered when a student sends a message:

1. The `evaluatePromptWithAI` function in `src/app/api/chat/route.ts` sends the prompt to Gemini with evaluation instructions
2. The AI analyzes the prompt and returns scores in JSON format
3. Scores are included in the response headers (`X-Prompt-Quality-Score` and `X-Prompt-Quality-Details`)
4. The UI displays feedback as a toast notification
5. Scores are saved to Firebase in the student's participation record

### Example Evaluation Prompt

```
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
```

## Prompt Streak System

### Streak Mechanics

The streak system works as follows:

1. **Good Prompts**: Prompts with an overall score of 70% or higher are considered "good"
2. **Streak Increase**: Each consecutive good prompt increases the streak counter
3. **Streak Reset**: Any prompt below 70% resets the streak to zero
4. **Best Streak**: The system tracks the student's best streak achieved

### Data Storage

Streak data is stored in Firebase as part of the student's participation record:

```typescript
promptEvaluations?: {
  [subtaskId: string]: Array<{
    goalScore: number;
    contextScore: number;
    expectationsScore: number;
    sourceScore: number;
    overallScore: number;
    prompt: string;
    timestamp: Timestamp;
    streak: number;
    bestStreak: number;
  }>;
};
```

### UI Implementation

The streak system has several UI components:

1. **Streak Badge**: A visual indicator next to the chat input showing the current streak
   - Different colors based on streak length
   - Fire emoji (🔥) and streak count
   - Animates when the streak increases

2. **Toast Notifications**: Celebratory messages that appear when streaks increase
   - Customized based on streak length
   - More enthusiastic for longer streaks
   - Special recognition for new personal bests

3. **Animations**: Custom animations for visual feedback
   - `bounce-short` animation when the streak increases
   - Defined in `tailwind.config.ts`

### Streak Level Thresholds

The system has different visual and feedback styles based on streak length:

- **Level 1** (1-2): Basic blue styling, simple feedback
- **Level 2** (3-4): Green styling, positive feedback
- **Level 3** (5-6): Purple styling, enthusiastic feedback
- **Level 4** (7-9): Enhanced feedback with star emojis
- **Level 5** (10+): Premium styling with trophy emojis and "legendary" status

## Setup and Configuration

### Environment Variables

The following environment variables are required for AI features:

```
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
```

### Google Cloud Setup

1. Create a project in Google Cloud Console
2. Enable Vertex AI API
3. Create a service account with Vertex AI User role
4. Generate and download a service account key (JSON)
5. Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to this file

## Future Enhancements

Planned improvements to the AI features include:

1. **Analytics Dashboard**: Visualize prompt quality trends over time
2. **Personalized Feedback**: More detailed suggestions for improving prompts
3. **Achievement System**: Badges and rewards for reaching streak milestones
4. **Teacher Insights**: Tools for teachers to view student prompt quality metrics
5. **Multi-Modal Prompting**: Support for evaluating prompts with image inputs 