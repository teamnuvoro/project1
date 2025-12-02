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

  return (
    <div className="bg-white border-t border-gray-100 px-4 py-3 space-y-3">
      {/* Analyze My Type Button */}
      <Link href="/analytics">
        <button
          className="w-full py-3 px-4 gradient-primary-button text-white rounded-full font-medium flex items-center justify-center gap-2 shadow-lg shadow-purple-300/30 hover:shadow-xl transition-shadow"
          data-testid="button-analyze-type"
        >
          <Sparkles className="w-5 h-5" />
          Analyze My Type
        </button>
      </Link>

      {/* Quick Replies */}
      <div className="flex flex-wrap gap-2">
        {quickReplies.slice(0, 6).map((reply, index) => (
          <button
            key={index}
            onClick={() => handleQuickReply(reply)}
            disabled={isLoading || disabled}
            className="quick-reply-chip text-sm disabled:opacity-50"
            data-testid={`button-quickreply-${index}`}
          >
            {reply}
          </button>
        ))}
      </div>
      
      {/* Input Row */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsRecording(!isRecording)}
          disabled={isLoading || disabled}
          className={`p-3 rounded-full transition-all ${
            isRecording
              ? "bg-red-500 text-white animate-pulse"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
          data-testid="button-voice-record"
        >
          <Mic className="w-5 h-5" />
        </button>
        
        <div className="flex-1 relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder={isLoading ? "Sending..." : "Type your message..."}
            disabled={isLoading || disabled}
            className="w-full h-12 px-4 bg-gray-100 rounded-full text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-50"
            data-testid="input-chat-message"
          />
        </div>
        
        <button
          onClick={handleSend}
          disabled={isLoading || disabled || !message.trim()}
          className="w-12 h-12 gradient-primary-button text-white rounded-full flex items-center justify-center disabled:opacity-50 shadow-lg shadow-purple-300/30"
          data-testid="button-send-message"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
