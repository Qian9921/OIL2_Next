import React from 'react';
import { Copy as CopyIcon, Check as CheckIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import { formatRelativeTime, generateAvatar } from '@/lib/utils';

interface ChatMessageProps {
  message: ChatMessageType;
  onCopyCode?: (code: string, key: string) => void;
  copiedCodeBlockKey?: string | null;
  sessionUserId?: string;
  sessionUserName?: string;
}

export function ChatMessage({
  message,
  onCopyCode,
  copiedCodeBlockKey,
  sessionUserId,
  sessionUserName,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isModel = message.role === 'model';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''} mb-4 last:mb-0`}>
      {isModel && (
        <Avatar
          src={generateAvatar('AI_Tutor_Bot')}
          alt="AI"
          size="sm"
          className="mt-1 ring-2 ring-rose-100"
        />
      )}

      <div
        className={[
          'relative group max-w-[88%] rounded-2xl p-3 shadow-sm',
          isUser
            ? 'rounded-br-sm bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
            : isModel
              ? 'rounded-bl-sm border border-slate-200 bg-white text-slate-800'
              : 'border border-amber-200 bg-amber-100 text-amber-800',
        ].join(' ')}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isUser ? 'text-blue-100/90' : 'text-slate-400'}`}>
            {isUser ? 'You' : isModel ? 'Tutor' : 'System'}
          </p>
          <p className={`text-[11px] ${isUser ? 'text-blue-100/80' : 'text-slate-400'}`}>
            {message.createdAt ? formatRelativeTime(new Date(message.createdAt)) : ''}
          </p>
        </div>

        {message.imageData && (
          <div className="my-2 overflow-hidden rounded-xl border border-slate-200 bg-white/70">
            <img
              src={message.imageData}
              alt="User upload"
              className="max-h-[220px] w-full object-cover"
            />
          </div>
        )}

        <div className={`prose prose-sm max-w-none text-sm leading-7 whitespace-pre-wrap break-words ${isUser ? 'prose-invert' : ''}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              pre: ({ node, ...props }) => {
                let codeString = '';
                if (node && node.children) {
                  node.children.forEach((child) => {
                    if (child.type === 'element' && child.tagName === 'code') {
                      child.children.forEach((codeChild) => {
                        if (codeChild.type === 'text') {
                          codeString += codeChild.value;
                        }
                      });
                    }
                  });
                }
                codeString = codeString.replace(/\n$/, '');

                const keySuffix = props.key != null ? String(props.key) : 'fallback';
                const blockKey = `code-${message.id || Date.now()}-${keySuffix}`;
                return (
                  <div className="relative my-3 overflow-x-auto rounded-xl bg-slate-900 p-3 text-white shadow-inner">
                    <pre {...props} className="!bg-transparent !p-0 !text-sm" />
                    {onCopyCode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 h-7 w-7 bg-slate-800/90 text-slate-300 opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:bg-slate-700 hover:text-white"
                        onClick={() => onCopyCode(codeString, blockKey)}
                        title="Copy code"
                      >
                        {copiedCodeBlockKey === blockKey ? (
                          <CheckIcon className="h-4 w-4 text-green-400" />
                        ) : (
                          <CopyIcon className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                );
              },
              p: (props) => <p className="mb-2 last:mb-0" {...props} />,
              ul: (props) => <ul className="mb-2 list-disc pl-5" {...props} />,
              ol: (props) => <ol className="mb-2 list-decimal pl-5" {...props} />,
            }}
          >
            {message.content || ''}
          </ReactMarkdown>
        </div>
      </div>

      {isUser && (
        <Avatar
          src={generateAvatar(message.userName || sessionUserName || message.userId || sessionUserId || 'user')}
          alt={message.userName || sessionUserName || 'User'}
          size="sm"
          className="mt-1 ring-2 ring-blue-100"
        />
      )}
    </div>
  );
}
