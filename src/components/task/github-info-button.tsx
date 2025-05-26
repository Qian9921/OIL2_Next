import React from 'react';
import { Button } from '@/components/ui/button';
import { Github, Info } from 'lucide-react';
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

export const GitHubInfoButton: React.FC = () => {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="outline" size="sm">
          <Github className="w-4 h-4 mr-2" />
          GitHub Info
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-4">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
          <div className="space-y-2">
            <h4 className="font-semibold">GitHub Repository Setup</h4>
            <p className="text-sm text-gray-600">
              Most projects require you to create a GitHub repository. Make sure to:
            </p>
            <ul className="text-sm text-gray-600 list-disc pl-4">
              <li>Create a public repository</li>
              <li>Submit the repository URL when requested</li>
              <li>Regularly commit your work</li>
            </ul>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}; 