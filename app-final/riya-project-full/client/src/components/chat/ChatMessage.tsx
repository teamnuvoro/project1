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
      className={`flex ${isAI ? 'justify-start' : 'justify-end'} animate-bubble`}
      data-testid={`message-${message.role}-${message.id}`}
    >
      <div className={`max-w-[85%] ${isAI ? 'chat-bubble-ai' : 'chat-bubble-user'}`}>
        <p 
          className="text-base leading-relaxed whitespace-pre-wrap break-words" 
          data-testid={`text-message-content-${message.id}`}
        >
          {content || "..."}
        </p>
        <p 
          className={`text-xs mt-2 ${isAI ? "text-gray-500" : "text-white/70"}`}
          data-testid={`text-timestamp-${message.id}`}
        >
          {message.createdAt ? format(new Date(message.createdAt), 'H:mm') : ''}
        </p>
      </div>
    </div>
  );
}
