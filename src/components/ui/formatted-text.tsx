import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface FormattedTextProps {
  children: string;
  className?: string;
  components?: any;
}

export function FormattedText({ 
  children, 
  className,
  components = {} 
}: FormattedTextProps) {
  // If the text doesn't contain markdown syntax, just handle line breaks
  const hasMarkdownSyntax = /[*_#`\[\]()~]/.test(children);
  
  if (!hasMarkdownSyntax) {
    // Simple line break handling for plain text
    return (
      <div className={className}>
        {children.split('\n').map((line, index) => (
          <React.Fragment key={index}>
            {line}
            {index < children.split('\n').length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Default components for markdown rendering
  const defaultComponents = {
    p: ({ children, ...props }: any) => (
      <p className="mb-2 last:mb-0" {...props}>
        {children}
      </p>
    ),
    a: ({ href, children, ...props }: any) => (
      <a
        href={href}
        className="text-blue-600 hover:text-blue-800 underline"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),
    strong: ({ children, ...props }: any) => (
      <strong className="font-semibold" {...props}>
        {children}
      </strong>
    ),
    em: ({ children, ...props }: any) => (
      <em className="italic" {...props}>
        {children}
      </em>
    ),
    ul: ({ children, ...props }: any) => (
      <ul className="list-disc pl-5 mb-2" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: any) => (
      <ol className="list-decimal pl-5 mb-2" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }: any) => (
      <li className="mb-1" {...props}>
        {children}
      </li>
    ),
    h1: ({ children, ...props }: any) => (
      <h1 className="text-2xl font-bold mb-3" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2 className="text-xl font-bold mb-2" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3 className="text-lg font-semibold mb-2" {...props}>
        {children}
      </h3>
    ),
    h4: ({ children, ...props }: any) => (
      <h4 className="text-base font-semibold mb-2" {...props}>
        {children}
      </h4>
    ),
    blockquote: ({ children, ...props }: any) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700 mb-2" {...props}>
        {children}
      </blockquote>
    ),
    code: ({ children, ...props }: any) => (
      <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    ),
    pre: ({ children, ...props }: any) => (
      <pre className="bg-gray-100 p-3 rounded text-sm font-mono overflow-x-auto mb-2" {...props}>
        {children}
      </pre>
    ),
    ...components
  };

  return (
    <div className={cn("prose prose-sm max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={defaultComponents}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
} 