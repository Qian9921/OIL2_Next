import React from 'react';
import { Circle, CheckCircle, Clock, XCircle, AlertCircle, Award, Github, LucideIcon } from 'lucide-react';
import { Submission } from '@/lib/types';

export type StatusType = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'needs_revision' 
  | 'active' 
  | 'completed' 
  | 'dropped' 
  | 'github'
  | 'certificate';

interface StatusConfig {
  text: string;
  color: string;
  icon: LucideIcon;
}

interface StatusBadgeProps {
  status: StatusType;
  text?: string;
  className?: string;
}

const statusConfigs: Record<StatusType, StatusConfig> = {
  pending: { text: 'Under Review', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { text: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { text: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
  needs_revision: { text: 'Needs Revision', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  active: { text: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: Clock },
  completed: { text: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  dropped: { text: 'Dropped', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  github: { text: 'GitHub Repo', color: 'bg-slate-700 text-white', icon: Github },
  certificate: { text: 'Certificate Available', color: 'bg-yellow-100 text-yellow-800', icon: Award }
};

export function StatusBadge({ status, text, className = '' }: StatusBadgeProps) {
  const config = statusConfigs[status];
  const displayText = text || config.text;
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${className}`}>
      <Icon className="w-3 h-3 mr-1" />
      {displayText}
    </span>
  );
}

export function getSubmissionStatusBadge(submission?: Submission) {
  if (!submission) return <StatusBadge status="pending" text="Not Submitted" />;
  
  return <StatusBadge status={submission.status as StatusType} />;
} 