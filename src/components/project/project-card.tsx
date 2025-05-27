import React from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  Users, 
  Clock, 
  Calendar,
  CheckCircle,
  Target,
  Edit,
  Trash2,
  Settings,
  Plus,
  Award
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Project } from '@/lib/types';
import { 
  generateAvatar, 
  getDifficultyColor, 
  getStatusColor, 
  calculateEstimatedHours, 
  formatDeadline 
} from '@/lib/utils';
import { LoadingState } from '@/components/ui/loading-state';

export interface ProjectCardProps {
  /** Project data */
  project: Project;
  /** Whether to display join button (for student view) */
  showJoinButton?: boolean;
  /** Whether project is joined by current user */
  isJoined?: boolean;
  /** Whether the project has been completed by the user */
  isCompleted?: boolean;
  /** Whether to show edit/delete buttons (for NGO view) */
  showAdminActions?: boolean;
  /** Whether the project is full (maxed participants) */
  isFull?: boolean;
  /** Loading state for join button */
  isJoining?: boolean;
  /** Click handler for join button */
  onJoinClick?: (project: Project) => void;
  /** Click handler for edit button */
  onEditClick?: (project: Project) => void;
  /** Click handler for delete button */
  onDeleteClick?: (project: Project) => void;
  /** Custom action component to render */
  customActions?: React.ReactNode;
  /** Additional content to render in the card */
  additionalContent?: React.ReactNode;
  /** Custom status label to override default status */
  statusLabel?: string;
}

/**
 * Reusable project card component with various display modes
 */
export function ProjectCard({
  project,
  showJoinButton = false,
  isJoined = false,
  isCompleted = false,
  showAdminActions = false,
  isFull = false,
  isJoining = false,
  onJoinClick,
  onEditClick,
  onDeleteClick,
  customActions,
  additionalContent,
  statusLabel
}: ProjectCardProps) {
  const handleJoinClick = () => {
    onJoinClick?.(project);
  };
  
  return (
    <Card className="card-hover h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">{project.title}</CardTitle>
            <div className="flex items-center space-x-2 mt-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(project.difficulty)}`}>
                {project.difficulty === 'beginner' ? 'Beginner' :
                  project.difficulty === 'intermediate' ? 'Intermediate' : 'Advanced'}
              </span>
              
              {project.status && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                  {statusLabel || 
                   (project.status === 'draft' ? 'Draft' :
                   project.status === 'published' ? 'Published' :
                   project.status === 'completed' ? 'Completed' :
                   project.status === 'archived' ? 'Archived' : project.status)}
                </span>
              )}
              
              {isFull && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Full
                </span>
              )}
              
              {isJoined && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Joined
                </span>
              )}
              
              {isCompleted && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Completed
                </span>
              )}
            </div>
          </div>
          <Avatar
            src={generateAvatar(project.ngoId)}
            alt={project.ngoName}
            size="sm"
          />
        </div>
        <p className="text-sm text-gray-600">
          by {project.ngoName}
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Description */}
        <p className="text-gray-700 text-sm line-clamp-3 flex-1">
          {project.shortDescription || project.description}
        </p>

        {/* Project Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div className="flex items-center space-x-1">
            <Users className="w-3 h-3" />
            <span>{project.currentParticipants}/{project.maxParticipants || '∞'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>
              {calculateEstimatedHours(project) > 0 
                ? `${calculateEstimatedHours(project)} hours (est.)`
                : 'TBD hours'
              }
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <Target className="w-3 h-3" />
            <span>{project.subtasks?.length || 0} tasks</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>
              {project.deadline ? 
                `Due ${formatDeadline(project.deadline)}` 
                : 'No deadline'
              }
            </span>
          </div>
        </div>

        {/* Completion message for completed projects */}
        {isCompleted && (
          <div className="mt-2 text-xs py-1.5 px-2 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 flex items-center">
            <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-yellow-600" />
            <span>You've successfully completed this project! View your certificate in My Projects.</span>
          </div>
        )}

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
              >
                {tag}
              </span>
            ))}
            {project.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                +{project.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Additional Content */}
        {additionalContent}

        {/* Action Buttons */}
        <div className="flex flex-col space-y-2 pt-2 mt-auto">
          {/* Default view details button */}
          <Link href={`/projects/${project.id}`} className="w-full">
            <Button variant="outline" className="w-full">
              <BookOpen className="w-4 h-4 mr-2" />
              View Details
            </Button>
          </Link>
          
          {/* Render custom actions if provided */}
          {customActions}
          
          {/* Student join/continue button */}
          {showJoinButton && !isJoined && (
            <Button
              onClick={() => onJoinClick?.(project)}
              disabled={isFull || isJoining}
              className="w-full"
            >
              {isJoining ? (
                <LoadingState size="sm" className="mr-2 w-4 h-4" fullHeight={false} />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {isFull ? 'Project Full' : isJoining ? 'Joining...' : 'Join Project'}
            </Button>
          )}
          
          {/* Student continue button (if already joined) */}
          {showJoinButton && isJoined && !isCompleted && (
            <Link href="/student/my-projects" className="w-full">
              <Button className="w-full">
                <Target className="w-4 h-4 mr-2" />
                Continue
              </Button>
            </Link>
          )}
          
          {/* Student completed project buttons */}
          {showJoinButton && isJoined && isCompleted && (
            <div className="flex flex-col space-y-2">
              <Link href="/student/certificates" className="w-full">
                <Button variant="outline" className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50">
                  <Award className="w-4 h-4 mr-2" />
                  View Certificate
                </Button>
              </Link>
              <Link href="/student/my-projects" className="w-full">
                <Button variant="outline" className="w-full">
                  <BookOpen className="w-4 h-4 mr-2" />
                  View Project
                </Button>
              </Link>
            </div>
          )}
          
          {/* Admin actions (NGO view) */}
          {showAdminActions && (
            <>
              {onEditClick && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onEditClick(project)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              
              {onDeleteClick && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteClick(project)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 