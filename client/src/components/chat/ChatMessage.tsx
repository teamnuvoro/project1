import { format } from "date-fns";
import { motion } from "framer-motion";
import { useState } from "react";

interface Message {
  id: string;
  role: "user" | "ai" | "assistant";
  text?: string;
  content?: string;
  imageUrl?: string;
  createdAt?: string | Date;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAI = message.role === "assistant" || message.role === "ai";
  const content = message.content || message.text || "";
  const [imageError, setImageError] = useState(false);
  
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
        {/* Image display (only for AI messages with imageUrl) */}
        {isAI && message.imageUrl && !imageError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-2 rounded-lg overflow-hidden"
          >
            <img
              src={message.imageUrl}
              alt="Riya's photo"
              className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onError={() => setImageError(true)}
              onClick={() => {
                // Open image in new tab for full view
                window.open(message.imageUrl, '_blank');
              }}
              data-testid={`image-message-${message.id}`}
            />
          </motion.div>
        )}
        
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
