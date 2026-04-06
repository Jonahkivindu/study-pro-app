import { cn } from '../utils/cn';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatBubble({ role, content }: ChatBubbleProps) {
  return (
    <div className={cn("flex w-full mb-4", role === 'user' ? "justify-end" : "justify-start")}>
      <div 
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm",
          role === 'user' ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-secondary text-secondary-foreground rounded-tl-sm border border-border"
        )}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
