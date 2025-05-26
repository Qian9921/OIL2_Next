import { Subtask } from './types';

export const GITHUB_SUBMISSION_SUBTASK_ID = 'system_github_submission_task_v1';

export const GITHUB_SUBMISSION_SUBTASK_PROPS: Omit<Subtask, 'id' | 'order'> = {
  title: 'Submit Your GitHub Repository',
  description: 'Please provide the URL to your public GitHub repository where you will be keeping your project work. This repository will be used for tracking your coding progress and for final submission if applicable. Ensure the repository is public so it can be reviewed.',
  estimatedHours: 0.5, // Short task
  resources: [
    'How to create a GitHub repository: https://docs.github.com/en/get-started/quickstart/create-a-repo',
    'How to make a repository public: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility#making-a-repository-public'
  ],
  completionCriteria: [
    'A valid public GitHub repository URL is submitted.',
    'The repository is accessible.'
  ],
}; 