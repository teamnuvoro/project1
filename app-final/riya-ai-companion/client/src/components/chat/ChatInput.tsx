import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Mic, Sparkles } from "lucide-react";
import { Link } from "wouter";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  isMobile?: boolean;
  quickReplies?: string[];
  onQuickReply?: (reply: string) => void;
  onAnalyzeClick?: () => void;
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
  onAnalyzeClick,
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

  const showQuickReplies = quickReplies.length > 0;

  return (
    <div className="bg-white/95 backdrop-blur-sm border-t border-gray-100 px-3 py-2 space-y-2">
      {/* Input Row with Analyze Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsRecording(!isRecording)}
          disabled={isLoading || disabled}
          className={`p-2 rounded-full transition-all duration-300 flex-shrink-0 ${
            isRecording
              ? "bg-red-500 text-white animate-pulse scale-110"
              : "bg-gray-100 text-gray-500 hover:bg-purple-100 hover:text-purple-600 hover:scale-105"
          }`}
          data-testid="button-voice-record"
        >
          <Mic className="w-4 h-4" />
        </button>
        
        <div className="flex-1 relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder={isLoading ? "Sending..." : "Type your message..."}
            disabled={isLoading || disabled}
            className="w-full h-10 px-4 bg-gray-100 rounded-full text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-50 transition-all duration-200"
            data-testid="input-chat-message"
          />
        </div>
        
        <button
          onClick={handleSend}
          disabled={isLoading || disabled || !message.trim()}
          className="w-10 h-10 gradient-primary-button text-white rounded-full flex items-center justify-center disabled:opacity-50 shadow-md shadow-purple-300/30 transition-all duration-300 hover:scale-105 hover:shadow-lg flex-shrink-0"
          data-testid="button-send-message"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>

        {/* Analyze Button - Compact pill */}
        <Link href="/analytics">
          <button
            className="h-10 px-4 gradient-primary-button text-white rounded-full font-medium flex items-center justify-center gap-1.5 shadow-md shadow-purple-300/30 hover:shadow-lg transition-all duration-300 text-xs whitespace-nowrap flex-shrink-0"
            data-testid="button-analyze-type"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Analyze
          </button>
        </Link>
      </div>

      {/* Quick Replies - Scrollable */}
      {showQuickReplies && (
        <div className="quick-replies-scroll -mx-1 px-1">
          {quickReplies.slice(0, 6).map((reply, index) => (
            <button
              key={index}
              onClick={() => handleQuickReply(reply)}
              disabled={isLoading || disabled}
              className="quick-reply-chip text-xs whitespace-nowrap flex-shrink-0 disabled:opacity-50 transition-all duration-200 hover:scale-105 py-1.5 px-3"
              data-testid={`button-quickreply-${index}`}
            >
              {reply}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
