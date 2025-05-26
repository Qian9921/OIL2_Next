import React from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import { formatRelativeTime, generateAvatar } from '@/lib/utils';
import { Copy as CopyIcon, Check as CheckIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  /** The chat message to display */
  message: ChatMessageType;
  /** Function to handle copying code blocks */
  onCopyCode?: (code: string, key: string) => void;
  /** Key of the currently copied code block */
  copiedCodeBlockKey?: string | null;
  /** Session user ID for avatar generation (for user messages) */
  sessionUserId?: string;
  /** Session user name for avatar generation (for user messages) */
  sessionUserName?: string;
}

/**
 * Reusable component for rendering chat messages with support for markdown, code blocks, and images
 */
export function ChatMessage({
  message,
  onCopyCode,
  copiedCodeBlockKey,
  sessionUserId,
  sessionUserName
}: ChatMessageProps) {
  return (
    <div className={`flex items-start space-x-2.5 ${message.role === 'user' ? 'justify-end' : ''} mb-4 last:mb-0`}>
      {message.role === 'model' && <Avatar src={generateAvatar('AI_Tutor_Bot')} alt="AI" size="sm" className="mt-1" />}
      <div 
        className={`relative group p-3 rounded-xl max-w-[85%] shadow-sm ${ 
          message.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 
          message.role === 'model' ? 'bg-white text-slate-800 border border-slate-200 rounded-bl-none' : 
          'bg-amber-100 text-amber-800 border border-amber-200'
        }`}
      >
        {/* Display image if available */}
        {message.imageData && (
          <div className="my-2">
            <img 
              src={message.imageData} 
              alt="User upload" 
              className="max-w-full h-auto rounded-md border border-slate-300" 
              style={{ maxHeight: '200px' }} 
            />
          </div>
        )}
        
        {/* Display message content with markdown */}
        <div className="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-wrap break-words">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              pre: ({node, ...props}) => {
                let codeString = '';
                if (node && node.children) {
                  node.children.forEach(child => {
                    if (child.type === 'element' && child.tagName === 'code') {
                      child.children.forEach(codeChild => {
                        if (codeChild.type === 'text') {
                          codeString += codeChild.value;
                        }
                      });
                    }
                  });
                }
                codeString = codeString.replace(/\n$/, '');
                
                const blockKey = `code-${message.id || Date.now()}-${props.key || 'fallback'}`;
                return (
                  <div className="relative group/codeblock my-2 bg-slate-800 text-white p-3 rounded-md overflow-x-auto">
                    <pre {...props} className="!bg-transparent !p-0 !text-sm" />
                    {onCopyCode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover/codeblock:opacity-100 transition-opacity duration-200 bg-slate-700 hover:bg-slate-600"
                        onClick={() => onCopyCode(codeString, blockKey)}
                        title="Copy code"
                      >
                        {copiedCodeBlockKey === blockKey ? (
                          <CheckIcon className="h-4 w-4 text-green-400" />
                        ) : (
                          <CopyIcon className="h-4 w-4 text-slate-300 hover:text-slate-100" />
                        )}
                      </Button>
                    )}
                  </div>
                );
              },
              p: (props) => <p className="mb-2 last:mb-0" {...props} />,
              ul: (props) => <ul className="list-disc pl-5 mb-2" {...props} />,
              ol: (props) => <ol className="list-decimal pl-5 mb-2" {...props} />,
            }}
          >
            {message.content || ''}
          </ReactMarkdown>
        </div>
        
        {/* Display timestamp */}
        <p className="text-xs mt-1.5 opacity-60 text-right">
          {message.createdAt ? formatRelativeTime(new Date(message.createdAt)) : ''}
        </p>
      </div>
      {message.role === 'user' && (
        <Avatar 
          src={generateAvatar(message.userName || sessionUserName || message.userId || sessionUserId || 'user')} 
          alt={message.userName || sessionUserName || 'User'} 
          size="sm" 
          className="mt-1" 
        />
      )}
    </div>
  );
} 