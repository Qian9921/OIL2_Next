export interface TutorContextPill {
  id: string;
  label: string;
  value: string;
  tone?: 'task' | 'evaluation' | 'suggestion' | 'general';
  instruction?: string;
}

interface EvaluationChatDraftOptions {
  currentTask: string;
  suggestion?: string;
  summary?: string;
  requirement?: string;
  details?: string;
}

interface PromptFeedbackChatDraftOptions {
  currentTask: string;
  promptContent: string;
  feedback?: string;
  qualityScore?: number;
}

function createPill(partial: Omit<TutorContextPill, 'id'> & { id?: string }): TutorContextPill {
  return {
    id: partial.id || `${partial.label}-${partial.value}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    ...partial,
  };
}

export function buildChatMessageWithContext(message: string, contextPills: TutorContextPill[]) {
  if (contextPills.length === 0) {
    return message;
  }

  const contextLines = contextPills
    .map((pill) => pill.instruction || `${pill.label}: ${pill.value}`)
    .filter(Boolean)
    .map((line) => `- ${line}`)
    .join('\n');

  return `Please use the following context for this tutoring reply:\n${contextLines}\n\nStudent request:\n${message}`;
}

export function buildQuickActionDraft(currentTask: string, action: 'explain-task' | 'plan-next-steps' | 'review-latest-evaluation') {
  switch (action) {
    case 'plan-next-steps':
      return {
        draft: `Help me plan my next steps for \"${currentTask}\". Please give me a practical sequence I can follow without solving the whole task for me.`,
        contextPills: [
          createPill({
            label: 'Task',
            value: currentTask,
            tone: 'task',
            instruction: `The current task is: ${currentTask}`,
          }),
        ],
      };
    case 'review-latest-evaluation':
      return {
        draft: `Please explain my latest evaluation for \"${currentTask}\" in simple words, tell me what I already did well, and what I should fix first.`,
        contextPills: [
          createPill({
            label: 'Task',
            value: currentTask,
            tone: 'task',
            instruction: `The current task is: ${currentTask}`,
          }),
          createPill({
            label: 'Mode',
            value: 'Review latest evaluation',
            tone: 'evaluation',
            instruction: 'Focus on the latest evaluation result and explain it clearly to the student.',
          }),
        ],
      };
    case 'explain-task':
    default:
      return {
        draft: `Can you explain what \"${currentTask}\" is really asking me to do, what the likely deliverable is, and how I should think about getting started?`,
        contextPills: [
          createPill({
            label: 'Task',
            value: currentTask,
            tone: 'task',
            instruction: `The current task is: ${currentTask}`,
          }),
        ],
      };
  }
}

export function buildEvaluationChatDraft(options: EvaluationChatDraftOptions) {
  const contextPills: TutorContextPill[] = [
    createPill({
      label: 'Task',
      value: options.currentTask,
      tone: 'task',
      instruction: `The student is currently working on: ${options.currentTask}`,
    }),
  ];

  if (options.summary) {
    contextPills.push(
      createPill({
        label: 'Evaluation',
        value: options.summary,
        tone: 'evaluation',
        instruction: `Latest evaluation summary: ${options.summary}`,
      }),
    );
  }

  if (options.requirement) {
    contextPills.push(
      createPill({
        label: 'Requirement',
        value: options.requirement,
        tone: 'evaluation',
        instruction: `Focus especially on this requirement: ${options.requirement}`,
      }),
    );
  }

  if (options.suggestion) {
    contextPills.push(
      createPill({
        label: 'Suggestion',
        value: options.suggestion,
        tone: 'suggestion',
        instruction: `Use this evaluation suggestion as the main tutoring focus: ${options.suggestion}`,
      }),
    );
  }

  const draft = options.suggestion
    ? `Please help me act on this evaluation suggestion for \"${options.currentTask}\": ${options.suggestion}\n\nI want to understand what it means, why it matters, and what steps I should take next.`
    : options.requirement
      ? `Please explain why I did not fully satisfy this requirement for \"${options.currentTask}\": ${options.requirement}\n\nTell me what is likely missing and how I should approach fixing it.`
      : `Please explain my latest evaluation for \"${options.currentTask}\" and help me decide what to do next.`;

  if (options.details) {
    contextPills.push(
      createPill({
        label: 'Evidence note',
        value: options.details,
        tone: 'general',
        instruction: `Additional evaluation detail: ${options.details}`,
      }),
    );
  }

  return { draft, contextPills };
}

export function buildPromptFeedbackChatDraft(options: PromptFeedbackChatDraftOptions) {
  const contextPills: TutorContextPill[] = [
    createPill({
      label: 'Task',
      value: options.currentTask,
      tone: 'task',
      instruction: `The student is currently working on: ${options.currentTask}`,
    }),
    createPill({
      label: 'Prompt',
      value: options.promptContent,
      tone: 'general',
      instruction: `The student's previous prompt was: ${options.promptContent}`,
    }),
  ];

  if (typeof options.qualityScore === 'number') {
    contextPills.push(
      createPill({
        label: 'Prompt score',
        value: `${options.qualityScore}%`,
        tone: 'evaluation',
        instruction: `The previous prompt quality score was: ${options.qualityScore}%`,
      }),
    );
  }

  if (options.feedback) {
    contextPills.push(
      createPill({
        label: 'Prompt feedback',
        value: options.feedback,
        tone: 'evaluation',
        instruction: `Prompt feedback that the student received: ${options.feedback}`,
      }),
    );
  }

  return {
    draft: `Please help me improve this earlier prompt for \"${options.currentTask}\". Explain why it was weaker than it could be, then help me rewrite it into a stronger prompt without doing the whole task for me.`,
    contextPills,
  };
}
