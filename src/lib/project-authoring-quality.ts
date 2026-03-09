interface ProjectAuthoringForm {
  title: string;
  shortDescription?: string;
  description: string;
  deadline?: string;
  difficulty?: string;
  tags: string[];
  requirements: string[];
  learningGoals: string[];
}

interface ProjectAuthoringSubtask {
  title?: string;
  description?: string;
  estimatedHours?: number;
  resources?: string[];
  completionCriteria?: string[];
}

interface QualityCheck {
  key: string;
  label: string;
  passed: boolean;
}

export interface ProjectQualityAnalysis {
  score: number;
  statusLabel: 'Needs work' | 'Promising' | 'Ready to publish';
  highlights: string[];
  blockers: string[];
  suggestions: string[];
  studentPreview: string[];
  checks: QualityCheck[];
}

function wordCount(text: string | undefined) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function hasTwoSentences(text: string | undefined) {
  if (!text) return false;
  return text.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean).length >= 2;
}

function buildStatusLabel(score: number): ProjectQualityAnalysis['statusLabel'] {
  if (score >= 85) return 'Ready to publish';
  if (score >= 60) return 'Promising';
  return 'Needs work';
}

export function analyzeProjectAuthoringQuality(
  form: ProjectAuthoringForm,
  subtasks: ProjectAuthoringSubtask[],
): ProjectQualityAnalysis {
  const validSubtasks = subtasks.filter((subtask) => (subtask.title || '').trim() && (subtask.description || '').trim());
  const subtasksWithHours = validSubtasks.filter((subtask) => (subtask.estimatedHours || 0) > 0);
  const subtasksWithCriteria = validSubtasks.filter((subtask) => (subtask.completionCriteria || []).length > 0);
  const subtasksWithResources = validSubtasks.filter((subtask) => (subtask.resources || []).length > 0);
  const detailedSubtasks = validSubtasks.filter((subtask) => wordCount(subtask.description) >= 12);

  const checks: QualityCheck[] = [
    {
      key: 'title',
      label: 'Specific project title',
      passed: wordCount(form.title) >= 3,
    },
    {
      key: 'short-description',
      label: 'Short browsing description',
      passed: (form.shortDescription || '').trim().length >= 40,
    },
    {
      key: 'description',
      label: 'Detailed project description',
      passed: (form.description || '').trim().length >= 160 && hasTwoSentences(form.description),
    },
    {
      key: 'deadline',
      label: 'Deadline defined',
      passed: Boolean(form.deadline),
    },
    {
      key: 'requirements',
      label: 'Participation requirements added',
      passed: form.requirements.length > 0,
    },
    {
      key: 'learning-goals',
      label: 'Learning goals added',
      passed: form.learningGoals.length > 0,
    },
    {
      key: 'subtasks',
      label: 'At least two clear subtasks',
      passed: validSubtasks.length >= 2,
    },
    {
      key: 'subtask-detail',
      label: 'Subtasks explain what students will do',
      passed: validSubtasks.length > 0 && detailedSubtasks.length === validSubtasks.length,
    },
    {
      key: 'subtask-hours',
      label: 'Estimated hours for each subtask',
      passed: validSubtasks.length > 0 && subtasksWithHours.length === validSubtasks.length,
    },
    {
      key: 'subtask-criteria',
      label: 'Completion criteria per subtask',
      passed: validSubtasks.length > 0 && subtasksWithCriteria.length === validSubtasks.length,
    },
    {
      key: 'subtask-resources',
      label: 'Learning resources per subtask',
      passed: validSubtasks.length > 0 && subtasksWithResources.length === validSubtasks.length,
    },
    {
      key: 'tags',
      label: 'Discovery tags added',
      passed: form.tags.length >= 2,
    },
  ];

  const score = Math.round((checks.filter((check) => check.passed).length / checks.length) * 100);
  const highlights: string[] = [];
  const blockers: string[] = [];
  const suggestions: string[] = [];
  const studentPreview: string[] = [];

  if (checks.find((check) => check.key === 'title')?.passed) {
    highlights.push('The project title is specific enough to signal what learners are building.');
  } else {
    blockers.push('The title still feels generic. Students should understand the project outcome from the title alone.');
    suggestions.push('Make the title more concrete, for example by naming the artifact, audience, or impact area.');
  }

  if (checks.find((check) => check.key === 'description')?.passed) {
    highlights.push('The long description gives students enough context to understand the problem and intended impact.');
  } else {
    blockers.push('The detailed description is still too thin. Students may not understand the real-world context or expected outcome.');
    suggestions.push('Expand the project description with problem context, intended deliverable, and what success looks like.');
  }

  if (!checks.find((check) => check.key === 'short-description')?.passed) {
    suggestions.push('Add a one-sentence short description so students can quickly scan and choose the project.');
  }

  if (!checks.find((check) => check.key === 'requirements')?.passed) {
    blockers.push('There are no participation requirements yet, so students may not know the expected baseline.');
    suggestions.push('Add at least one participation requirement, such as prior skills, tools, or collaboration expectations.');
  } else {
    highlights.push('Participation requirements help students self-select into the right project.');
  }

  if (!checks.find((check) => check.key === 'learning-goals')?.passed) {
    blockers.push('Learning goals are missing, which makes the educational value harder to see.');
    suggestions.push('Add learning goals that describe what students should understand or be able to do after finishing the project.');
  } else {
    highlights.push('Learning goals make the project feel intentional and educational.');
  }

  if (!checks.find((check) => check.key === 'subtasks')?.passed) {
    blockers.push('The project needs at least two meaningful subtasks so students can progress step by step.');
    suggestions.push('Break the project into 2–5 subtasks that build on one another in a clear sequence.');
  } else {
    highlights.push(`The project currently has ${validSubtasks.length} usable subtasks, which gives learners a clearer path.`);
  }

  if (!checks.find((check) => check.key === 'subtask-detail')?.passed) {
    suggestions.push('Make each subtask description more explicit about what the student should produce, check, or submit.');
  }

  if (!checks.find((check) => check.key === 'subtask-hours')?.passed) {
    suggestions.push('Add estimated hours to every subtask so students can pace themselves realistically.');
  }

  if (!checks.find((check) => check.key === 'subtask-criteria')?.passed) {
    suggestions.push('Add completion criteria to each subtask so the evaluation system can explain success more clearly.');
  }

  if (!checks.find((check) => check.key === 'subtask-resources')?.passed) {
    suggestions.push('Add at least one resource to each subtask to reduce student frustration during execution.');
  }

  if (!checks.find((check) => check.key === 'tags')?.passed) {
    suggestions.push('Add 2–4 tags so students can discover the project more easily.');
  }

  if (form.deadline) {
    studentPreview.push('Students will immediately see a concrete deadline, which makes the project feel real and time-bounded.');
  } else {
    studentPreview.push('Students will not know the expected timeframe yet because the project deadline is still blank.');
  }

  if (validSubtasks.length > 0) {
    studentPreview.push(`Students will experience a ${validSubtasks.length}-step task journey before final submission.`);
  }

  if (subtasksWithCriteria.length === validSubtasks.length && validSubtasks.length > 0) {
    studentPreview.push('Each subtask already has completion criteria, so feedback can be more specific and fair.');
  } else {
    studentPreview.push('Some subtasks still lack completion criteria, which can make evaluation feel vague to students.');
  }

  if (subtasksWithResources.length === validSubtasks.length && validSubtasks.length > 0) {
    studentPreview.push('Students will have resources attached directly to the steps they are working on.');
  }

  return {
    score,
    statusLabel: buildStatusLabel(score),
    highlights: highlights.slice(0, 4),
    blockers: blockers.slice(0, 4),
    suggestions: suggestions.slice(0, 6),
    studentPreview: studentPreview.slice(0, 4),
    checks,
  };
}
