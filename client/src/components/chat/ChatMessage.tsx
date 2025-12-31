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
  const rawContent = message.content || message.text || "";
  const [imageError, setImageError] = useState(false);
  
  // Filter out URLs from content (especially image URLs)
  // Remove all URLs including Supabase storage URLs, http/https URLs, and any URL-like patterns
  const content = (() => {
    let filtered = rawContent;
    
    // Remove URLs in brackets [url]
    filtered = filtered.replace(/\[https?:\/\/[^\]]+\]/gi, '');
    filtered = filtered.replace(/\[[^\]]*supabase[^\]]*\]/gi, '');
    
    // Remove URLs in parentheses (url)
    filtered = filtered.replace(/\(https?:\/\/[^\)]+\)/gi, '');
    filtered = filtered.replace(/\([^\)]*supabase[^\)]*\)/gi, '');
    
    // Remove full URLs (http:// or https://)
    filtered = filtered.replace(/https?:\/\/[^\s\)\]\n<>"]+/gi, '');
    
    // Remove Supabase-specific patterns (even without http://)
    filtered = filtered.replace(/[a-zA-Z0-9-]+\.supabase\.co[^\s\)\]\n<>"]*/gi, '');
    filtered = filtered.replace(/supabase\.co\/storage[^\s\)\]\n<>"]*/gi, '');
    filtered = filtered.replace(/storage\/v1\/object[^\s\)\]\n<>"]*/gi, '');
    filtered = filtered.replace(/chat-images[^\s\)\]\n<>"]*/gi, '');
    
    // Remove any remaining URL-like patterns
    filtered = filtered.replace(/[a-zA-Z0-9-]+\.(com|co|net|org|io)[^\s\)\]\n<>"]*/gi, '');
    
    // Clean up multiple spaces, newlines, and empty lines
    filtered = filtered.replace(/\s+/g, ' ');
    filtered = filtered.replace(/\n\s*\n/g, '\n');
    
    return filtered.trim();
  })();
  
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
        className={`max-w-[85%] px-3 py-2.5 ${
          isAI 
            ? 'rounded-2xl rounded-tl-sm' 
            : 'rounded-2xl rounded-tr-sm'
        }`}
        style={{
          backgroundColor: isAI ? '#E5E5E5' : '#FF69B4',
          color: isAI ? '#333333' : '#FFFFFF'
        }}
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
          className="text-base leading-relaxed whitespace-pre-wrap break-words mb-1" 
          data-testid={`text-message-content-${message.id}`}
          style={{
            color: isAI ? '#333333' : '#FFFFFF'
          }}
        >
          {content || "..."}
        </p>
        <p 
          className={`text-xs ${isAI ? "text-gray-600" : "text-white/80"}`}
          data-testid={`text-timestamp-${message.id}`}
        >
          {message.createdAt ? format(new Date(message.createdAt), 'H:mm') : ''}
        </p>
      </motion.div>
    </motion.div>
  );
}
