import { type Message } from "@shared/schema";
import { format } from "date-fns";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAI = message.role === "assistant" || message.role === "ai";
  const content = (message as any).content || (message as any).text || "";
  
  return (
    <div 
      className={`flex ${isAI ? 'justify-start' : 'justify-end'} ${isAI ? 'animate-bubble-ai' : 'animate-bubble-user'}`}
      data-testid={`message-${message.role}-${message.id}`}
    >
      <div 
        className={`max-w-[85%] ${isAI ? 'chat-bubble-ai' : 'chat-bubble-user'} transition-all duration-200`}
      >
        <span 
          style={{ 
            color: isAI ? '#1a1a2e' : '#ffffff',
            display: 'block',
            fontSize: '16px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
          data-testid={`text-message-content-${message.id}`}
        >
          {content}
        </span>
        {message.createdAt && (
          <span 
            style={{
              display: 'block',
              fontSize: '12px',
              marginTop: '8px',
              opacity: isAI ? 0.6 : 0.8,
              color: isAI ? '#666' : '#fff',
            }}
            data-testid={`text-timestamp-${message.id}`}
          >
            {format(new Date(message.createdAt), 'H:mm')}
          </span>
        )}
      </div>
    </div>
  );
}
