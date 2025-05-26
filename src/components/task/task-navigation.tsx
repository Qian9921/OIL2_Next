import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Project, Participation, Subtask } from '@/lib/types';

interface TaskNavigationProps {
  project: Project | null;
  participation: Participation | null;
  currentSubtaskId: string;
}

export const TaskNavigation: React.FC<TaskNavigationProps> = ({
  project,
  participation,
  currentSubtaskId
}) => {
  const router = useRouter();
  
  if (!project || !participation) return null;
  
  // Sort subtasks by order
  const sortedSubtasks = [...project.subtasks].sort((a, b) => a.order - b.order);
  
  // Find the current subtask index
  const currentIndex = sortedSubtasks.findIndex(subtask => subtask.id === currentSubtaskId);
  
  // Determine if we have previous and next tasks
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < sortedSubtasks.length - 1;
  
  // Get previous and next subtasks
  const previousSubtask = hasPrevious ? sortedSubtasks[currentIndex - 1] : null;
  const nextSubtask = hasNext ? sortedSubtasks[currentIndex + 1] : null;
  
  // Navigate to previous task
  const goToPrevious = () => {
    if (previousSubtask) {
      router.push(`/projects/${project.id}/task/${previousSubtask.id}`);
    }
  };
  
  // Navigate to next task
  const goToNext = () => {
    if (nextSubtask) {
      router.push(`/projects/${project.id}/task/${nextSubtask.id}`);
    }
  };
  
  return (
    <div className="flex items-center space-x-2">
      {hasPrevious && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={goToPrevious}
          title={`Previous: ${previousSubtask?.title}`}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
      )}
      
      {hasNext && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={goToNext}
          title={`Next: ${nextSubtask?.title}`}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  );
}; 