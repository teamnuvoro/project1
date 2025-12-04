import { type Message } from "@shared/schema";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAI = message.role === "assistant" || message.role === "ai";
  const content = (message as any).content || (message as any).text || "";
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }}
      className={`flex ${isAI ? 'justify-start' : 'justify-end'} mb-2`}
      data-testid={`message-${message.role}-${message.id}`}
    >
      <motion.div 
        whileHover={{ scale: 1.01 }}
        className={`max-w-[85%] ${isAI ? 'chat-bubble-ai' : 'chat-bubble-user'}`}
      >
        <p 
          className="text-base leading-relaxed whitespace-pre-wrap break-words" 
          data-testid={`text-message-content-${message.id}`}
        >
          {content || "..."}
        </p>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`text-xs mt-2 ${isAI ? "text-gray-500" : "text-white/70"}`}
          data-testid={`text-timestamp-${message.id}`}
        >
          {message.createdAt ? format(new Date(message.createdAt), 'H:mm') : ''}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
