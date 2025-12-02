import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Mic } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  isMobile?: boolean;
  quickReplies?: string[];
  onQuickReply?: (reply: string) => void;
  failedMessage?: string;
}

const defaultQuickReplies = [
  "Mera current relationship confusing hai",
  "Kaise pata chalega koi mujhe pasand karta hai?",
  "Main kya dhundh raha hoon samajhna chahta hoon",
  "Mujhe dating advice chahiye",
  "Mujhe trust issues ho rahe hain",
  "Kaise pata chalega main relationship ready hoon?"
];

export function ChatInput({ 
  onSendMessage, 
  isLoading, 
  disabled, 
  isMobile,
  quickReplies = defaultQuickReplies,
  onQuickReply,
  failedMessage
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (failedMessage) {
      setMessage(failedMessage);
    }
  }, [failedMessage]);

  const handleSend = () => {
    if (message.trim() && !isLoading && !disabled) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleQuickReply = (reply: string) => {
    if (onQuickReply) {
      onQuickReply(reply);
    } else {
      onSendMessage(reply);
    }
  };

  return (
    <div className="bg-white border-t border-gray-100 px-3 sm:px-4 py-2.5 sm:py-3 space-y-2 sm:space-y-3 shadow-lg w-full">
      {/* Quick Replies - Responsive */}
      {quickReplies && quickReplies.length > 0 && (
        <div className="flex flex-wrap gap-1.5 sm:gap-2 animate-fade-in">
          {quickReplies.slice(0, 6).map((reply, index) => (
            <button
              key={index}
              onClick={() => handleQuickReply(reply)}
              disabled={isLoading || disabled}
              className="quick-reply-chip text-xs sm:text-sm disabled:opacity-50 px-2 sm:px-3 py-1.5 sm:py-2"
              data-testid={`button-quickreply-${index}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="line-clamp-1">{reply}</span>
            </button>
          ))}
        </div>
      )}
      
      {/* Input Row - Responsive Flexbox */}
      <div className="flex items-center gap-2 sm:gap-3 w-full">
        <button
          onClick={() => setIsRecording(!isRecording)}
          disabled={isLoading || disabled}
          className={`p-2.5 sm:p-3 rounded-full transition-all duration-300 flex-shrink-0 ${
            isRecording
              ? "bg-gradient-to-r from-red-500 to-pink-500 text-white animate-pulse shadow-lg shadow-red-300/50"
              : "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-500 hover:from-gray-200 hover:to-gray-100 hover:shadow-md"
          }`}
          data-testid="button-voice-record"
        >
          <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        
        <div className="flex-1 min-w-0 relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder={isLoading ? "Sending..." : "Type your message..."}
            disabled={isLoading || disabled}
            className="w-full h-10 sm:h-12 px-3 sm:px-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-full text-sm sm:text-base text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:from-purple-50 focus:to-pink-50 disabled:opacity-50 transition-all duration-300 shadow-sm focus:shadow-md"
            data-testid="input-chat-message"
          />
        </div>
        
        <button
          onClick={handleSend}
          disabled={isLoading || disabled || !message.trim()}
          className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 text-white rounded-full flex items-center justify-center disabled:opacity-50 shadow-lg shadow-purple-300/40 hover:shadow-xl hover:shadow-purple-400/50 hover:scale-105 active:scale-95 transition-all duration-300 disabled:hover:scale-100 disabled:hover:shadow-lg flex-shrink-0"
          data-testid="button-send-message"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
          ) : (
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
